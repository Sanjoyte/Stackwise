import TaxReport from "../models/tax/TaxReport.js";
import TaxJurisdiction from "../models/tax/TaxJurisdiction.js";
import { buildTaxReport } from "../services/taxReportService.js";

/**
 * Controller handlers for Tax Reports API endpoints.
 */

export const previewReport = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, jurisdictionCode, taxpayerCategory } = req.body;
    const result = await buildTaxReport({
      userId: req.user._id,
      periodStart,
      periodEnd,
      jurisdictionCode: jurisdictionCode || "BD",
      taxpayerCategory: taxpayerCategory || "general",
      isPreview: true,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const generateReport = async (req, res, next) => {
  try {
    const {
      periodStart,
      periodEnd,
      jurisdictionCode,
      taxpayerCategory,
      customLineItems,
      customUncategorizedItems,
      customSummary,
    } = req.body;
    const result = await buildTaxReport({
      userId: req.user._id,
      periodStart,
      periodEnd,
      jurisdictionCode: jurisdictionCode || "BD",
      taxpayerCategory: taxpayerCategory || "general",
      isPreview: false,
      customLineItems,
      customUncategorizedItems,
      customSummary,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      TaxReport.find({ userId: req.user._id })
        .select("-pdfData")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TaxReport.countDocuments({ userId: req.user._id }),
    ]);

    const formattedReports = reports.map((r) => ({
      ...r,
      downloadUrl: `/api/tax-reports/${r._id}/download`,
    }));

    return res.status(200).json({
      success: true,
      reports: formattedReports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getReportById = async (req, res, next) => {
  try {
    const report = await TaxReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .select("-pdfData")
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: "Tax report not found" });
    }

    return res.status(200).json({
      success: true,
      report: {
        ...report,
        downloadUrl: `/api/tax-reports/${report._id}/download`,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const downloadReportPDF = async (req, res, next) => {
  try {
    const report = await TaxReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select("+pdfData");

    if (!report || !report.pdfData) {
      return res.status(404).json({ success: false, message: "Tax report PDF file not found" });
    }

    const filename = `tax-report-${report.jurisdictionCode}-${report.taxYear}-${report._id.toString().slice(-6)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(report.pdfData);
  } catch (error) {
    return next(error);
  }
};

export const getJurisdictions = async (req, res, next) => {
  try {
    const jurisdictions = await TaxJurisdiction.find().lean();
    return res.status(200).json({
      success: true,
      jurisdictions: jurisdictions.length > 0 ? jurisdictions : [
        { code: "BD", name: "Bangladesh", currency: "BDT", supportedTaxYears: ["2025-26", "2024-25"] }
      ],
    });
  } catch (error) {
    return next(error);
  }
};
