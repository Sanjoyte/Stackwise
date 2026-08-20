import AiDeductionScan from "../models/tax/AiDeductionScan.js";
import DeductionFlag from "../models/tax/DeductionFlag.js";
import MissedDeductionSuggestion from "../models/tax/MissedDeductionSuggestion.js";
import { runDeductionScan } from "../services/ai/geminiDeductionScanner.js";

export const triggerAiScan = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { periodStart, periodEnd } = req.body;

    // Rate limit check: max 1 manual scan per user per 5 minutes
    const recentScan = await AiDeductionScan.findOne({
      userId,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    if (recentScan && req.body.force !== true) {
      return res.status(200).json({
        success: true,
        message: "Recent scan available.",
        scanId: recentScan._id,
        newFlags: recentScan.results?.newDeductionFlags || 0,
        newMissedSuggestions: recentScan.results?.newMissedSuggestions || 0,
        status: recentScan.status,
        rateLimited: true,
      });
    }

    const pStart = periodStart ? new Date(periodStart) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const pEnd = periodEnd ? new Date(periodEnd) : new Date();

    const result = await runDeductionScan(userId, {
      trigger: "manual",
      periodStart: pStart,
      periodEnd: pEnd,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getAiDeductionFlags = async (req, res, next) => {
  try {
    const flags = await DeductionFlag.find({
      userId: req.user._id,
      detectionMethod: "ai",
      status: req.query.status || "suggested",
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      flags,
    });
  } catch (error) {
    return next(error);
  }
};

export const getMissedDeductions = async (req, res, next) => {
  try {
    const suggestions = await MissedDeductionSuggestion.find({
      userId: req.user._id,
      status: req.query.status || "suggested",
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
};

export const acceptDeductionFlag = async (req, res, next) => {
  try {
    const flag = await DeductionFlag.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "accepted", resolvedAt: new Date() },
      { new: true }
    );
    if (!flag) return res.status(404).json({ success: false, message: "Flag not found" });
    return res.status(200).json({ success: true, flag });
  } catch (error) {
    return next(error);
  }
};

export const dismissDeductionFlag = async (req, res, next) => {
  try {
    const flag = await DeductionFlag.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "dismissed", overriddenBy: "user", resolvedAt: new Date() },
      { new: true }
    );
    if (!flag) return res.status(404).json({ success: false, message: "Flag not found" });
    return res.status(200).json({ success: true, flag });
  } catch (error) {
    return next(error);
  }
};

export const acceptMissedSuggestion = async (req, res, next) => {
  try {
    const suggestion = await MissedDeductionSuggestion.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "accepted", resolvedAt: new Date() },
      { new: true }
    );
    if (!suggestion) return res.status(404).json({ success: false, message: "Suggestion not found" });
    return res.status(200).json({ success: true, suggestion });
  } catch (error) {
    return next(error);
  }
};

export const dismissMissedSuggestion = async (req, res, next) => {
  try {
    const suggestion = await MissedDeductionSuggestion.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "dismissed", overriddenBy: "user", resolvedAt: new Date() },
      { new: true }
    );
    if (!suggestion) return res.status(404).json({ success: false, message: "Suggestion not found" });
    return res.status(200).json({ success: true, suggestion });
  } catch (error) {
    return next(error);
  }
};

export const getScanStatus = async (req, res, next) => {
  try {
    const lastScan = await AiDeductionScan.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      lastScan,
    });
  } catch (error) {
    return next(error);
  }
};
