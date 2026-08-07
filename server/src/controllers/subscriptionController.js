import Subscription from "../models/Subscription.js";

// @desc    Create a new subscription
// @route   POST /api/subscriptions
// @access  Private
export const createSubscription = async (req, res, next) => {
  try {
    const {
      name,
      planName,
      amount,
      currency,
      billingCycle,
      renewalDate,
      paymentPortalUrl,
      registeredEmail,
      paymentMethod,
      isTrial,
      trialAlert,
      category,
      capabilities,
    } = req.body;

    if (!name || amount === undefined || !renewalDate) {
      return res.status(400).json({
        success: false,
        message: "Tool name, amount, and renewal date are required",
      });
    }

    const subscription = await Subscription.create({
      user: req.user._id,
      name,
      planName: planName || "PRO TIER",
      amount,
      currency: currency || req.user.baseCurrency || "USD",
      billingCycle: billingCycle || "monthly",
      renewalDate: new Date(renewalDate),
      paymentPortalUrl,
      registeredEmail,
      paymentMethod: paymentMethod || "Visa | **** 2466",
      isTrial: !!isTrial,
      trialAlert: trialAlert !== undefined ? !!trialAlert : true,
      category: category || "AI",
      capabilities: Array.isArray(capabilities)
        ? capabilities.map((cap) => cap.trim()).filter(Boolean)
        : [],
      status: "active",
    });

    return res.status(201).json({
      success: true,
      subscription,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all subscriptions for the logged-in user
// @route   GET /api/subscriptions
// @access  Private
export const getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id }).sort({
      renewalDate: 1,
    });

    return res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Private
export const getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Verify ownership
    if (subscription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this subscription",
      });
    }

    return res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
// @access  Private
export const updateSubscription = async (req, res, next) => {
  try {
    let subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Verify ownership
    if (subscription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this subscription",
      });
    }

    const {
      name,
      planName,
      amount,
      currency,
      billingCycle,
      renewalDate,
      paymentPortalUrl,
      registeredEmail,
      paymentMethod,
      isTrial,
      trialAlert,
      category,
      capabilities,
      status,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (planName !== undefined) updates.planName = planName;
    if (amount !== undefined) updates.amount = amount;
    if (currency !== undefined) updates.currency = currency;
    if (billingCycle !== undefined) updates.billingCycle = billingCycle;
    if (renewalDate !== undefined) updates.renewalDate = new Date(renewalDate);
    if (paymentPortalUrl !== undefined) updates.paymentPortalUrl = paymentPortalUrl;
    if (registeredEmail !== undefined) updates.registeredEmail = registeredEmail;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (isTrial !== undefined) updates.isTrial = !!isTrial;
    if (trialAlert !== undefined) updates.trialAlert = !!trialAlert;
    if (category !== undefined) updates.category = category;
    if (capabilities !== undefined) {
      updates.capabilities = Array.isArray(capabilities)
        ? capabilities.map((cap) => cap.trim()).filter(Boolean)
        : [];
    }
    if (status !== undefined) updates.status = status;

    subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private
export const deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Verify ownership
    if (subscription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this subscription",
      });
    }

    await subscription.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
