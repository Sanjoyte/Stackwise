import RecurringIncomeTemplate from "../models/RecurringIncomeTemplate.js";
import Income from "../models/Income.js";
import { ensureClientProject } from "./clientController.js";

// @desc    Create a new recurring income template
// @route   POST /api/income-templates
// @access  Private
export const createTemplate = async (req, res, next) => {
  try {
    const { templateName, amount, currency, source, clientName, frequency, status, expectedDate, clientProject } = req.body;

    if (!templateName || amount === undefined || !source || !expectedDate) {
      return res.status(400).json({
        success: false,
        message: "Template name, amount, source, and expected date are required",
      });
    }

    let clientProjectId = clientProject || null;
    if (clientName && !clientProjectId) {
      const client = await ensureClientProject({ userId: req.user._id, name: clientName });
      clientProjectId = client?._id || null;
    }

    const template = await RecurringIncomeTemplate.create({
      user: req.user._id,
      templateName,
      amount,
      currency: currency || req.user.baseCurrency || "USD",
      source,
      clientName,
      clientProject: clientProjectId,
      frequency: frequency || "monthly",
      status: status || "active",
      expectedDate: new Date(expectedDate),
    });

    return res.status(201).json({
      success: true,
      template,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all templates for the logged-in user
// @route   GET /api/income-templates
// @access  Private
export const getTemplates = async (req, res, next) => {
  try {
    const templates = await RecurringIncomeTemplate.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update template
// @route   PUT /api/income-templates/:id
// @access  Private
export const updateTemplate = async (req, res, next) => {
  try {
    let template = await RecurringIncomeTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Verify ownership
    if (template.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this template",
      });
    }

    const { templateName, amount, currency, source, clientName, frequency, status, expectedDate, clientProject } = req.body;

    const updates = {};
    if (templateName !== undefined) updates.templateName = templateName;
    if (amount !== undefined) updates.amount = amount;
    if (currency !== undefined) updates.currency = currency;
    if (source !== undefined) updates.source = source;
    if (clientName !== undefined) updates.clientName = clientName;
    if (clientProject !== undefined) updates.clientProject = clientProject;
    if (frequency !== undefined) updates.frequency = frequency;
    if (status !== undefined) updates.status = status;
    if (expectedDate !== undefined) updates.expectedDate = new Date(expectedDate);

    if ((clientName !== undefined || clientProject) && !updates.clientProject) {
      const client = await ensureClientProject({ userId: req.user._id, name: clientName || template.clientName });
      updates.clientProject = client?._id || null;
    }

    template = await RecurringIncomeTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete template
// @route   DELETE /api/income-templates/:id
// @access  Private
export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await RecurringIncomeTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Verify ownership
    if (template.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this template",
      });
    }

    await template.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Log income from template
// @route   POST /api/income-templates/:id/log
// @access  Private
export const logFromTemplate = async (req, res, next) => {
  try {
    const template = await RecurringIncomeTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Verify ownership
    if (template.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to use this template",
      });
    }

    const { date, notes } = req.body;

    const income = await Income.create({
      user: req.user._id,
      amount: template.amount,
      currency: template.currency,
      source: template.source,
      clientName: template.clientName,
      clientProject: template.clientProject,
      date: date ? new Date(date) : new Date(),
      notes: notes || `Logged from template: ${template.templateName}`,
      linkedTemplate: template._id,
    });

    return res.status(201).json({
      success: true,
      income,
    });
  } catch (error) {
    return next(error);
  }
};
