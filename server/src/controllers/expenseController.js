import {
  createExpenseRecord,
  getOwnedExpense,
  getUnifiedExpenses,
  importExpenseRows,
  updateExpenseRecord,
} from "../services/expenseService.js";
import {
  deleteReceiptImage,
  uploadReceiptImage,
} from "../services/cloudinaryService.js";
import { scanReceiptForExpense } from "../services/receiptScanService.js";

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Expense not found" });

export const getExpenses = async (req, res, next) => {
  try {
    const data = await getUnifiedExpenses({ user: req.user, filters: req.query });

    return res.status(200).json({
      success: true,
      count: data.expenses.length,
      ...data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getExpenseSummary = async (req, res, next) => {
  try {
    const { summary } = await getUnifiedExpenses({ user: req.user, filters: req.query });
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const expense = await createExpenseRecord({
      userId: req.user._id,
      input: req.body,
      source: "manual",
    });

    return res.status(201).json({ success: true, expense });
  } catch (error) {
    return next(error);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await getOwnedExpense(req.user._id, req.params.id);
    if (!expense) return notFound(res);

    return res.status(200).json({ success: true, expense });
  } catch (error) {
    return next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await updateExpenseRecord({
      userId: req.user._id,
      expenseId: req.params.id,
      input: req.body,
    });

    return res.status(200).json({ success: true, expense });
  } catch (error) {
    return next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await getOwnedExpense(req.user._id, req.params.id);
    if (!expense) return notFound(res);

    const publicId = expense.receipt?.publicId;
    await expense.deleteOne();

    if (publicId) {
      try {
        await deleteReceiptImage(publicId);
      } catch {
        // The database deletion remains successful even if remote cleanup is unavailable.
      }
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const importExpenses = async (req, res, next) => {
  try {
    const result = await importExpenseRows({
      userId: req.user._id,
      rows: req.body.rows,
    });

    return res.status(result.imported ? 201 : 400).json({
      success: result.imported > 0,
      ...result,
      message: result.imported
        ? `${result.imported} expense${result.imported === 1 ? "" : "s"} imported`
        : "No valid expense rows were found",
    });
  } catch (error) {
    return next(error);
  }
};

export const attachExpenseReceipt = async (req, res, next) => {
  let uploadedPublicId = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Choose a receipt image" });
    }

    const expense = await getOwnedExpense(req.user._id, req.params.id);
    if (!expense) return notFound(res);

    const previousPublicId = expense.receipt?.publicId;
    const upload = await uploadReceiptImage({
      buffer: req.file.buffer,
      userId: req.user._id,
      expenseId: expense._id,
    });
    uploadedPublicId = upload.public_id;

    expense.receipt = {
      url: upload.secure_url,
      publicId: upload.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    };
    await expense.save();

    if (previousPublicId && previousPublicId !== upload.public_id) {
      try {
        await deleteReceiptImage(previousPublicId);
      } catch {
        // The new receipt is already safely attached; stale cleanup can be retried later.
      }
    }

    return res.status(200).json({ success: true, expense });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await deleteReceiptImage(uploadedPublicId);
      } catch {
        // Do not mask the actionable receipt upload error.
      }
    }

    if (!error.statusCode) {
      error = new Error("Receipt upload failed. The expense remains saved.");
      error.statusCode = 502;
    }
    return next(error);
  }
};

// Scan-and-discard: uploads to a Cloudinary scratch folder, extracts text with the OCR
// add-on, and destroys the scratch asset before this handler ever returns (see
// receiptScanService.js / ocrService.js). No expense id is required or created — the response
// carries only parsed fields, never a url or publicId. A scan can never block saving the
// expense, so "no readable text" is a 200, not an error status.
export const scanReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Choose a receipt image to scan" });
    }

    const result = await scanReceiptForExpense({
      buffer: req.file.buffer,
      userId: req.user._id,
      baseCurrency: req.user.baseCurrency || "BDT",
    });

    return res.status(200).json({
      success: true,
      scanned: result.scanned,
      fields: result.fields,
      confidence: result.confidence,
      message: result.scanned ? "Receipt scanned" : "No readable text was found on this receipt",
    });
  } catch (error) {
    return next(error);
  }
};

export const removeExpenseReceipt = async (req, res, next) => {
  try {
    const expense = await getOwnedExpense(req.user._id, req.params.id);
    if (!expense) return notFound(res);

    const publicId = expense.receipt?.publicId;
    expense.receipt = null;
    await expense.save();

    if (publicId) {
      try {
        await deleteReceiptImage(publicId);
      } catch {
        // The user-facing receipt is removed even if Cloudinary cleanup is delayed.
      }
    }

    return res.status(200).json({ success: true, expense });
  } catch (error) {
    return next(error);
  }
};
