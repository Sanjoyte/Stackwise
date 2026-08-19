import crypto from "node:crypto";
import Payment from "../models/Payment.js";
import Team from "../models/Team.js";
import TeamRequest from "../models/TeamRequest.js";
import Subscription from "../models/Subscription.js";
import Expense from "../models/Expense.js";

import {
  createPaymentSession,
  validatePayment,
} from "../services/paymentService.js";

const serverUrl = () =>
  (process.env.SERVER_PUBLIC_URL || "http://localhost:5000").replace(/\/$/, "");

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

const newTranId = () =>
  `SW${Date.now()}${crypto.randomBytes(4).toString("hex")}`.slice(0, 30);

const redirectPayment = (res, status, tranId = "") =>
  res.redirect(
    `${clientUrl()}/payments?payment=${status}&tranId=${encodeURIComponent(tranId)}`
  );

const ensureExpenseForPayment = async (payment) => {
  if (!payment || payment.status !== "paid") return null;

  const existing = await Expense.findOne({
    paymentTransactionId: payment.transactionId,
  });

  if (existing) return existing;

  try {
    return await Expense.create({
      user: payment.user,
      team: payment.team || null,
      description: payment.title || "SSLCOMMERZ Payment",
      amount: payment.amount,
      currency: payment.currency || "BDT",
      date: payment.paidAt || new Date(),

      category: {
        id: null,
        name: "Online Payment",
        slug: "online-payment",
      },

      expenseType: "business",
      merchant: "SSLCOMMERZ",
      paymentMethod: payment.cardType || "SSLCOMMERZ",
      notes: `Automatically created from payment ${payment.transactionId}`,
      source: "sslcommerz",

      paymentTransactionId: payment.transactionId,
      sourceType: payment.sourceType,
      sourceId: payment.source,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Expense.findOne({
        paymentTransactionId: payment.transactionId,
      });
    }

    throw error;
  }
};

const startPayment = async ({
  req,
  sourceType,
  source,
  team = null,
  title,
  amount,
  currency,
}) => {
  const payment = await Payment.create({
    user: req.user._id,
    team: team?._id || null,
    sourceType,
    source: source._id,
    title,
    amount,
    currency,
    transactionId: newTranId(),
  });

  try {
    const callbackBase = `${serverUrl()}/api/payments/sslcommerz`;

    const session = await createPaymentSession({
      transactionId: payment.transactionId,
      amount,
      currency,
      title,

      customer: {
        name: req.user.name,
        email: req.user.email,
      },

      successUrl: `${callbackBase}/success`,
      failUrl: `${callbackBase}/fail`,
      cancelUrl: `${callbackBase}/cancel`,
      ipnUrl: `${callbackBase}/ipn`,

      metadata: {
        sourceType,
        sourceId: source._id,
        userId: req.user._id,
        teamId: team?._id || "",
      },
    });

    payment.sessionKey = session.sessionKey;
    await payment.save();

    return {
      payment,
      checkoutUrl: session.gatewayPageUrl,
    };
  } catch (error) {
    payment.status = "failed";
    payment.failureReason = error.message;
    await payment.save();
    throw error;
  }
};

const updateTeamRequestPayment = async (payment, status, message = "") => {
  if (payment.sourceType !== "team_request") return;

  const request = await TeamRequest.findById(payment.source);
  if (!request || request.payment?.status === "paid") return;

  request.payment.status = status;
  request.payment.provider = "sslcommerz";
  request.payment.transactionId = payment.transactionId;
  request.payment.failureReason = message;

  if (status === "paid") {
    request.payment.paidAt = payment.paidAt;

    request.history.push({
      action: "payment_completed",
      byUser: payment.user,
    });
  } else {
    request.history.push({
      action:
        status === "cancelled"
          ? "payment_cancelled"
          : "payment_failed",
      byUser: payment.user,
      message,
    });
  }

  await request.save();
};

export const initiateTeamRequestPayment = async (req, res, next) => {
  try {
    const request = await TeamRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "approved") {
      return res.status(409).json({
        success: false,
        message: "Only approved requests can be paid",
      });
    }

    const team = await Team.findById(request.team);

    if (!team || !team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only a Team Admin can pay this request",
      });
    }

    if (request.payment?.status === "paid") {
      return res.status(409).json({
        success: false,
        message: "This request is already paid",
      });
    }

    const { payment, checkoutUrl } = await startPayment({
      req,
      sourceType: "team_request",
      source: request,
      team,

      title: `${
        request.requestType === "subscription"
          ? "Subscription"
          : "Expense"
      }: ${request.title}`,

      amount: request.amount,
      currency: request.currency,
    });

    request.payment.status = "initiated";
    request.payment.provider = "sslcommerz";
    request.payment.transactionId = payment.transactionId;
    request.payment.failureReason = "";

    request.history.push({
      action: "payment_started",
      byUser: req.user._id,
    });

    await request.save();

    return res.status(201).json({
      success: true,
      checkoutUrl,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

export const initiateSubscriptionPayment = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const { payment, checkoutUrl } = await startPayment({
      req,
      sourceType: "subscription",
      source: subscription,

      title: `${subscription.name} ${
        subscription.planName || "subscription"
      }`,

      amount: subscription.amount,
      currency: subscription.currency,
    });

    return res.status(201).json({
      success: true,
      checkoutUrl,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

const settle = async (payload) => {
  const tranId = String(payload.tran_id || "");
  const valId = String(payload.val_id || "");

  if (!tranId || !valId) {
    return {
      ok: false,
      reason: "Missing transaction validation data",
    };
  }

  const payment = await Payment.findOne({
    transactionId: tranId,
  });

  if (!payment) {
    return {
      ok: false,
      reason: "Unknown Stackwise transaction",
    };
  }

  if (payment.status === "paid") {
    await ensureExpenseForPayment(payment);

    return {
      ok: true,
      payment,
    };
  }

  const verified = await validatePayment(valId);

  const statusOk = ["VALID", "VALIDATED"].includes(
    String(verified.status || "").toUpperCase()
  );

  const tranOk =
    String(verified.tran_id || "") === payment.transactionId;

  const expectedCurrency = String(payment.currency || "").toUpperCase();

  const gatewayCurrency = String(
    verified.currency_type || verified.currency || ""
  ).toUpperCase();

  const gatewayAmount =
    verified.currency_amount !== undefined &&
    verified.currency_amount !== null &&
    verified.currency_amount !== ""
      ? Number(verified.currency_amount)
      : Number(verified.amount);

  const amountOk =
    Number.isFinite(gatewayAmount) &&
    Math.abs(gatewayAmount - Number(payment.amount)) < 0.01;

  const currencyOk = gatewayCurrency === expectedCurrency;

  const riskLevel = Number(verified.risk_level ?? 0);
  const safe = riskLevel === 0;

  payment.validationId = verified.val_id || valId;
  payment.bankTransactionId = verified.bank_tran_id || "";
  payment.cardType = verified.card_type || "";
  payment.riskLevel = riskLevel;
  payment.riskTitle = verified.risk_title || "";
  payment.rawValidation = verified;

  if (!(statusOk && tranOk && amountOk && currencyOk && safe)) {
    payment.status = "failed";
    payment.failureReason =
      "Gateway validation did not match the Stackwise payment record";

    await payment.save();
    await updateTeamRequestPayment(
      payment,
      "failed",
      payment.failureReason
    );

    return {
      ok: false,
      reason: payment.failureReason,
      payment,
    };
  }

  payment.status = "paid";
  payment.paidAt = new Date();
  payment.failureReason = "";

  await payment.save();

  await ensureExpenseForPayment(payment);
  await updateTeamRequestPayment(payment, "paid");

  return {
    ok: true,
    payment,
  };
};

export const sslSuccess = async (req, res) => {
  try {
    const result = await settle(req.body);

    return redirectPayment(
      res,
      result.ok ? "success" : "failed",
      req.body.tran_id
    );
  } catch (error) {
    console.error("SSLCOMMERZ success error:", error);
    return redirectPayment(res, "failed");
  }
};

export const sslIpn = async (req, res) => {
  try {
    const result = await settle(req.body);

    return res.status(result.ok ? 200 : 400).json({
      success: result.ok,
      message: result.reason || "Payment validated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markNotPaid = async (req, res, status) => {
  const tranId = String(
    req.body.tran_id ||
      req.query.tran_id ||
      ""
  );

  if (tranId) {
    const payment = await Payment.findOne({
      transactionId: tranId,
    });

    if (payment && payment.status !== "paid") {
      payment.status = status;

      payment.failureReason =
        status === "cancelled"
          ? "Payment cancelled by user"
          : "Payment failed at gateway";

      await payment.save();

      await updateTeamRequestPayment(
        payment,
        status,
        payment.failureReason
      );
    }
  }

  return redirectPayment(res, status, tranId);
};

export const sslFail = (req, res) =>
  markNotPaid(req, res, "failed");

export const sslCancel = (req, res) =>
  markNotPaid(req, res, "cancelled");

export const listPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      user: req.user._id,
      status: "paid",
    }).sort({
      createdAt: -1,
    });

    for (const payment of payments) {
      try {
        await ensureExpenseForPayment(payment);
      } catch (error) {
        console.error(
          `Expense sync failed for ${payment.transactionId}:`,
          error.message
        );
      }
    }

    return res.json({
      success: true,
      payments: payments.map((payment) => payment.toObject()),
    });
  } catch (error) {
    next(error);
  }
};