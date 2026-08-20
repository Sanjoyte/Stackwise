import { EXPENSE_CURRENCIES } from "./expenseCsv.js";

// Fields OCR is ever allowed to write.
export const OCR_FIELDS = ["description", "amount", "currency", "date", "category", "merchant", "paymentMethod"];

// Fields emptyForm() pre-seeds with a default that is a fallback, not user intent — OCR may
// overwrite these unless the user has actually touched them. Every other field only counts as
// "already filled" once it holds a non-empty value.
export const PRESEEDED_FIELDS = new Set(["date", "currency"]);

const isBlank = (value) => value === "" || value === null || value === undefined;

// Never write server values straight into form state — the <input>s have native constraints
// (step="0.01", maxLength, a fixed <option> list, a date regex) that a raw value can silently
// break. Each guard here prevents a specific, reachable save-blocking bug.
export const sanitizeOcrFields = (fields = {}, categories = []) => {
  const clean = {};

  if (typeof fields.description === "string" && fields.description.trim()) {
    clean.description = fields.description.trim().slice(0, 120);
  }
  if (Number.isFinite(fields.amount) && fields.amount > 0) {
    // Must be a 2-decimal string: the input is type="number" step="0.01", and writing e.g.
    // "1234.567" makes it :invalid, which silently blocks native form submission.
    clean.amount = String(Math.round((fields.amount + Number.EPSILON) * 100) / 100);
  }
  if (EXPENSE_CURRENCIES.includes(fields.currency)) {
    clean.currency = fields.currency;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(fields.date || "")) {
    clean.date = fields.date;
  }
  if (categories.some((category) => category.slug === fields.category)) {
    clean.category = fields.category;
  }
  if (typeof fields.merchant === "string" && fields.merchant.trim()) {
    clean.merchant = fields.merchant.trim().slice(0, 100);
  }
  if (typeof fields.paymentMethod === "string" && fields.paymentMethod.trim()) {
    clean.paymentMethod = fields.paymentMethod.trim().slice(0, 80);
  }

  return clean;
};

// THE non-destructive rule. "The user already filled this field" is defined per field, and it
// is emphatically NOT `!form[field]` — emptyForm() pre-seeds `date` with today() and `currency`
// with the user's base currency, so a naive emptiness check would never fill either of them.
export const mergeOcrFields = ({ current, incoming, touched }) => {
  const next = { ...current };
  const applied = {};
  const previous = {};

  for (const field of OCR_FIELDS) {
    if (!(field in incoming)) continue; // the server omitted it — no guess to apply
    if (touched.has(field)) continue; // the user authored this
    if (!PRESEEDED_FIELDS.has(field) && !isBlank(current[field])) continue; // non-empty, not a seed
    if (incoming[field] === current[field]) continue; // no-op; don't badge it

    previous[field] = current[field];
    next[field] = incoming[field];
    applied[field] = incoming[field];
  }

  return { next, applied, previous };
};
