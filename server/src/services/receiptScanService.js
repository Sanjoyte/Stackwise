import { extractTextFromImage } from "./ocrService.js";
import { getCategoryOptions } from "./expenseCategoryService.js";
import { normalizeCategory } from "./expenseService.js";
import { buildCategoryKeywordTable, parseReceiptText } from "../utils/receiptParser.js";
import { RECEIPT_CATEGORY_KEYWORDS } from "../data/receiptCategoryKeywords.js";

// Orchestrates the scan-and-discard OCR flow for a receipt image: extracts text, parses it
// into candidate expense fields, and clamps the category through the same resolver the save
// path uses so a returned slug is always one the user actually has.
export const scanReceiptForExpense = async ({ buffer, userId, baseCurrency = "BDT" }) => {
  const ocr = await extractTextFromImage({ buffer, publicIdPrefix: `receipt-${userId}` });
  if (!ocr.hasText) return { scanned: false, fields: {}, confidence: {} };

  const categories = await getCategoryOptions(userId);
  const categoryKeywords = buildCategoryKeywordTable(categories, RECEIPT_CATEGORY_KEYWORDS);

  const { fields, confidence } = parseReceiptText({
    text: ocr.text,
    lines: ocr.lines,
    baseCurrency,
    categoryKeywords,
  });

  if (fields.category) {
    const resolved = normalizeCategory(fields.category, categories);
    if (resolved) {
      fields.category = resolved.slug;
    } else {
      delete fields.category;
      delete confidence.category;
    }
  }

  return { scanned: true, fields, confidence };
};
