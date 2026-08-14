import AlternativeTool from "../models/AlternativeTool.js";
import Subscription from "../models/Subscription.js";
import { defaultToolCatalog } from "../data/defaultToolCatalog.js";
import { buildRecommendations } from "../services/recommendationService.js";

export const getAlternativeRecommendations = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id, status: "active" }).lean();

    await AlternativeTool.bulkWrite(defaultToolCatalog.map((tool) => ({
      updateOne: { filter: { name: tool.name }, update: { $set: tool }, upsert: true },
    })));

    const catalog = await AlternativeTool.find({ isActive: true }).lean();
    const recommendations = buildRecommendations(subscriptions, catalog, req.user.baseCurrency || "USD");

    res.status(200).json({
      success: true,
      baseCurrency: req.user.baseCurrency || "USD",
      count: recommendations.length,
      exchangeRateNote: "Savings use the subscription currency, billing cycle, and the server's configured reference exchange rates.",
      candidatePolicy: "Only cheaper or free active subscriptions owned by this user are eligible; the master catalog validates identity and capability matches.",
      usageProfiles: subscriptions.map((subscription) => ({
        _id: subscription._id,
        name: subscription.name,
        usagePercentage: subscription.usagePercentage ?? 100,
        isUnderutilized:
          subscription.isUnderutilized || Number(subscription.usagePercentage) < 40,
        capabilities: subscription.capabilities || [],
      })),
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};


export const updateRecommendationUsage = async (req, res, next) => {
  try {

    const { usagePercentage } = req.body;


    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: "active"
    });


    if (!subscription) {
      return res.status(404).json({
        success:false,
        message:"Subscription not found"
      });
    }


    subscription.usagePercentage = Number(usagePercentage);

    subscription.isUnderutilized =
      Number(usagePercentage) < 40;


    await subscription.save();


    res.status(200).json({
      success:true,
      message:"Usage updated successfully",
      subscription
    });


  } catch(error){

    next(error);

  }
};

