import Subscription from "../models/Subscription.js";
import { buildOverlapGroups } from "../services/overlapService.js";

// @desc    Get active subscriptions and overlap groups for the logged-in user
// @route   GET /api/subscriptions/overlap
// @access  Private
export const getSubscriptionOverlap = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({
      user: req.user._id,
      status: "active",
    }).sort({ renewalDate: 1 });

    const overlapGroups = buildOverlapGroups(subscriptions);

    return res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions,
      overlapGroups,
    });
  } catch (error) {
    return next(error);
  }
};
