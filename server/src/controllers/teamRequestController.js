import Team from "../models/Team.js";
import TeamRequest from "../models/TeamRequest.js";

import { computeBudgetImpact, toMonthlyEquivalent } from "../services/teamBudgetService.js";
import { isValidObjectId } from "./teamController.js";

const VALID_TYPES = ["subscription", "expense"];
const VALID_CYCLES = ["weekly", "monthly", "annual"];

const formatRequest = (request) => ({
  id: request._id,
  team: request.team,
  requestedBy: request.requestedBy?._id || request.requestedBy,
  requestedByName: request.requestedBy?.name,
  requestedByEmail: request.requestedBy?.email,
  requestType: request.requestType,
  title: request.title,
  amount: request.amount,
  currency: request.currency,
  category: request.category,
  reason: request.reason,
  description: request.description,
  billingCycle: request.billingCycle,
  status: request.status,
  adminMessage: request.adminMessage,
  reviewedBy: request.reviewedBy,
  reviewedAt: request.reviewedAt,
  payment: request.payment,
  history: request.history,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

const loadTeamAndMembership = async (user) => {
  const teamId = user.activeTeam || user.team || user.teams?.[0];
  if (!teamId) return { team: null, isAdmin: false };

  const team = await Team.findById(teamId);
  if (!team || !team.getMember(user._id)) {
    return { team: null, isAdmin: false };
  }

  return { team, isAdmin: team.isAdmin(user._id) };
};

const validateRequestPayload = (body) => {
  const requestType = String(body.requestType || "").trim();
  const title = String(body.title || "").trim();
  const amount = Number(body.amount);
  const currency = String(body.currency || "").trim().toUpperCase();
  const category = String(body.category || "").trim();
  const reason = String(body.reason || "").trim();
  const description = String(body.description || "").trim();
  const billingCycle = body.billingCycle
    ? String(body.billingCycle).trim()
    : null;

  const errors = [];

  if (!VALID_TYPES.includes(requestType)) {
    errors.push("Request type must be either 'subscription' or 'expense'");
  }

  if (!title || title.length < 2) {
    errors.push("Title must contain at least 2 characters");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Amount must be a valid number greater than zero");
  }

  if (!currency) {
    errors.push("Currency is required");
  }

  if (!category) {
    errors.push("Category is required");
  }

  if (!reason) {
    errors.push("Reason is required");
  }

  if (requestType === "subscription" && !VALID_CYCLES.includes(billingCycle)) {
    errors.push(
      "Billing cycle is required for subscription requests (weekly, monthly, or annual)"
    );
  }

  return {
    errors,
    data: {
      requestType,
      title,
      amount,
      currency,
      category,
      reason,
      description,
      billingCycle: requestType === "subscription" ? billingCycle : null,
    },
  };
};

// POST /api/team-requests
export const createRequest = async (req, res, next) => {
  try {
    const { team } = await loadTeamAndMembership(req.user);

    if (!team) {
      return res.status(400).json({
        success: false,
        message: "You must join or create a team before submitting requests",
      });
    }

    const { errors, data } = validateRequestPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const request = await TeamRequest.create({
      team: team._id,
      requestedBy: req.user._id,
      ...data,
      history: [
        {
          action: "created",
          byUser: req.user._id,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Your request has been submitted for review",
      request: formatRequest(request),
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/team-requests?status=pending
export const listRequests = async (req, res, next) => {
  try {
    const { team, isAdmin } = await loadTeamAndMembership(req.user);

    if (!team) {
      return res.status(200).json({
        success: true,
        requests: [],
      });
    }

    const filter = { team: team._id };

    if (!isAdmin) {
      filter.requestedBy = req.user._id;
    }

    const status = String(req.query.status || "").trim();
    if (status) {
      filter.status = status;
    }

    const requests = await TeamRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("requestedBy", "name email");

    return res.status(200).json({
      success: true,
      isAdmin,
      requests: requests.map(formatRequest),
    });
  } catch (error) {
    return next(error);
  }
};

const findAuthorizedRequest = async (req) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return { error: { status: 400, message: "Invalid request id" } };
  }

  const { team, isAdmin } = await loadTeamAndMembership(req.user);

  if (!team) {
    return { error: { status: 404, message: "You are not part of a team" } };
  }

  const request = await TeamRequest.findOne({
    _id: id,
    team: team._id,
  }).populate("requestedBy", "name email");

  if (!request) {
    return { error: { status: 404, message: "Request not found" } };
  }

  const isOwner =
    request.requestedBy._id.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return {
      error: {
        status: 403,
        message: "You do not have access to this request",
      },
    };
  }

  return { team, isAdmin, isOwner, request };
};

// GET /api/team-requests/:id
export const getRequestById = async (req, res, next) => {
  try {
    const { error, request } = await findAuthorizedRequest(req);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      request: formatRequest(request),
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/team-requests/:id/budget-impact (admin only)
export const getBudgetImpact = async (req, res, next) => {
  try {
    const { error, team, isAdmin, request } = await findAuthorizedRequest(
      req
    );

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the Team Admin can view the budget-impact preview",
      });
    }

    return res.status(200).json({
      success: true,
      budgetImpact: computeBudgetImpact(team, request),
    });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/team-requests/:id  (member edits & resubmits after a
// modification request)
export const updateRequest = async (req, res, next) => {
  try {
    const { error, isOwner, request } = await findAuthorizedRequest(req);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only the request owner can edit this request",
      });
    }

    if (request.status !== "modification_requested") {
      return res.status(409).json({
        success: false,
        message:
          "This request can only be edited while it is awaiting modification",
      });
    }

    const { errors, data } = validateRequestPayload({
      requestType: req.body.requestType ?? request.requestType,
      title: req.body.title ?? request.title,
      amount: req.body.amount ?? request.amount,
      currency: req.body.currency ?? request.currency,
      category: req.body.category ?? request.category,
      reason: req.body.reason ?? request.reason,
      description: req.body.description ?? request.description,
      billingCycle: req.body.billingCycle ?? request.billingCycle,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    Object.assign(request, data);
    request.status = "pending";
    request.adminMessage = "";
    request.history.push({
      action: "resubmitted",
      byUser: req.user._id,
      message: String(req.body.resubmitNote || "").trim(),
    });

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Your updated request has been resubmitted for review",
      request: formatRequest(request),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/team-requests/:id/approve (admin only)
// Approval and payment are intentionally separate. Payment is optional.
export const approveRequest = async (req, res, next) => {
  try {
    const { error, team, isAdmin, request } = await findAuthorizedRequest(req);

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only the Team Admin can approve requests" });
    }

    if (!["pending", "modification_requested"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `This request cannot be approved from its current status (${request.status})`,
      });
    }

    request.status = "approved";
    request.adminMessage = String(req.body.message || "").trim();
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (!request.payment?.status || request.payment.status === "pending") {
      request.payment.status = "unpaid";
    }
    request.history.push({
      action: "approved",
      byUser: req.user._id,
      message: request.adminMessage,
    });

    await request.save();

    // Approved spend is a budget decision; payment settlement is a separate optional action.
    team.currentSpending += toMonthlyEquivalent(request);
    await team.save();

    return res.status(200).json({
      success: true,
      message: "Request approved. Payment is optional and can be completed separately.",
      request: formatRequest(request),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/team-requests/:id/reject (admin only) - message optional
export const rejectRequest = async (req, res, next) => {
  try {
    const { error, isAdmin, request } = await findAuthorizedRequest(req);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the Team Admin can reject requests",
      });
    }

    if (!["pending", "modification_requested"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `This request cannot be rejected from its current status (${request.status})`,
      });
    }

    const message = String(req.body.message || "").trim();

    request.status = "rejected";
    request.adminMessage = message;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    request.history.push({
      action: "rejected",
      byUser: req.user._id,
      message,
    });

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Request rejected",
      request: formatRequest(request),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/team-requests/:id/request-modification (admin only) - message required
export const requestModification = async (req, res, next) => {
  try {
    const { error, isAdmin, request } = await findAuthorizedRequest(req);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the Team Admin can request modifications",
      });
    }

    if (request.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: `A modification can only be requested while the request is pending (current status: ${request.status})`,
      });
    }

    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "A message explaining the requested changes is required",
      });
    }

    request.status = "modification_requested";
    request.adminMessage = message;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    request.history.push({
      action: "modification_requested",
      byUser: req.user._id,
      message,
    });

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Modification requested from the team member",
      request: formatRequest(request),
    });
  } catch (error) {
    return next(error);
  }
};
