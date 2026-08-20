import { SUPPORTED_CURRENCIES, isValidDateOnly } from "./expenseUtils.js";

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

export const normalizeReceiptLines = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00A0\u2007\u202F\u2000-\u200B]/g, " ") // nbsp/thin-space families
    .replace(/[|¦]/g, " ") // OCR renders table rules as pipes
    .replace(/[’‘]/g, "'")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// Money tokens
// ---------------------------------------------------------------------------

const DATE_LIKE_SRC = "\\d{1,4}[/.-]\\d{1,2}[/.-]\\d{2,4}";
const TIME_LIKE_SRC = "\\b\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:am|pm)?\\b";
const DATE_LIKE_GLOBAL = new RegExp(DATE_LIKE_SRC, "g");
const TIME_LIKE_GLOBAL = new RegExp(TIME_LIKE_SRC, "gi");
const DATE_LIKE_TEST = new RegExp(DATE_LIKE_SRC);
const TIME_LIKE_TEST = new RegExp(TIME_LIKE_SRC, "i");

const NUMBER_TOKEN_RE = /\d{1,3}(?:[,.]\d{3})+(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?/g;

const NOISE_LINE =
  /\b(?:vat|tin|bin|mushak|reg(?:\.|istration)?\s*no|phone|tel|mobile|cell|acc(?:oun)?t|card\s*(?:no|ending)|invoice\s*(?:no|#)|order\s*(?:no|#)|bill\s*no|ref(?:erence)?\s*(?:no|#)|trx|txn)\b/i;

// Handles the separator ambiguity: "3,000.00", "3.000,00", "3 000,00", "1,234", "1.234" all
// land correctly. The one accepted misread is European "1.234" meaning 1.234 (grouping wins) —
// indistinguishable from thousands grouping, and 3-decimal prices don't occur on receipts.
export const parseMoneyToken = (raw) => {
  let s = String(raw).replace(/[\s\u00A0]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    const decimal = lastComma > lastDot ? "," : "."; // rightmost separator is the decimal
    const group = decimal === "," ? "." : ",";
    s = s.split(group).join("").replace(decimal, ".");
  } else if (lastComma > -1) {
    const digitsAfter = s.length - lastComma - 1;
    const onlyOne = s.indexOf(",") === lastComma;
    s = onlyOne && (digitsAfter === 1 || digitsAfter === 2) ? s.replace(",", ".") : s.split(",").join("");
  } else if (lastDot > -1) {
    const digitsAfter = s.length - lastDot - 1;
    const onlyOne = s.indexOf(".") === lastDot;
    s = onlyOne && (digitsAfter === 1 || digitsAfter === 2) ? s : s.split(".").join("");
  }

  const value = Number(s);
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : null;
};

const blankNonMoney = (line) => line.replace(DATE_LIKE_GLOBAL, (m) => " ".repeat(m.length)).replace(TIME_LIKE_GLOBAL, (m) => " ".repeat(m.length));

const isPlausibleMoney = (value, { line, matchIndex, raw }) => {
  if (value === null || value < 0.01 || value > 10_000_000) return false;
  if (NOISE_LINE.test(line)) return false;

  const before = line.slice(Math.max(0, matchIndex - 6), matchIndex);
  if (/[#*]\s*$/.test(before)) return false; // "#1234"
  if (/\d{4,}x/i.test(before)) return false; // a quantity multiplier, e.g. "1234x"

  const hasDecimalSeparator = /[.,]/.test(raw);
  const integerLength = String(Math.trunc(Math.abs(value))).length;
  if (!hasDecimalSeparator && integerLength >= 8) return false; // phone numbers, TIN, barcodes

  return true;
};

const extractMoneyCandidates = (rawLine) => {
  const line = blankNonMoney(rawLine);
  const candidates = [];

  for (const match of line.matchAll(NUMBER_TOKEN_RE)) {
    const value = parseMoneyToken(match[0]);
    if (!isPlausibleMoney(value, { line, matchIndex: match.index, raw: match[0] })) continue;
    candidates.push({ value, index: match.index, endIndex: match.index + match[0].length });
  }

  return { line, candidates };
};

const isAnchoredAtEnd = (line, candidate) => line.slice(candidate.endIndex).trim().length <= 3;

// ---------------------------------------------------------------------------
// Amount
// ---------------------------------------------------------------------------

const TOTAL_LABELS = [
  { re: /\bgrand\s*total\b/i, weight: 100 },
  { re: /\b(?:amount|balance|total)\s*due\b/i, weight: 96 },
  { re: /\bnet\s*(?:amount|payable|total)\b|\btotal\s*payable\b/i, weight: 94 },
  { re: /\btotal\s*(?:amount|bill)?\b/i, weight: 82 },
  { re: /\b(?:amount\s*paid|paid\s*amount|amount)\b/i, weight: 70 },
  { re: /\bbalance\b/i, weight: 58 },
];

const NEGATIVE_LABELS =
  /\b(?:sub\s*-?\s*total|subtotal|vat|tax|gst|sd\b|service\s*charge|discount|change|cash\s*(?:tendered|back)|tendered|tip|gratuity|round(?:ing)?\s*(?:off)?|previous|savings?|points?|deposit|advance|qty|quantity|item\s*count)\b/i;

const confidenceForLabel = (weight, usedAdjacentLine) => {
  if (usedAdjacentLine) return 0.65;
  if (weight >= 94) return 0.95;
  if (weight >= 82) return 0.85;
  return 0.65;
};

const extractAmount = (lines) => {
  let best = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const rawLine = lines[i];
    // Must be tested before positive labels: "SUB TOTAL" contains "TOTAL" and
    // "TOTAL VAT" contains both.
    if (NEGATIVE_LABELS.test(rawLine)) continue;

    const label = TOTAL_LABELS.find(({ re }) => re.test(rawLine));
    if (!label) continue;

    const { line, candidates } = extractMoneyCandidates(rawLine);
    // Receipt totals are right-aligned — prefer the token anchored at end-of-line.
    let candidate = candidates.find((c) => isAnchoredAtEnd(line, c)) || candidates[candidates.length - 1] || null;
    let usedAdjacentLine = false;

    if (!candidate) {
      // Column layouts sometimes split the label and the value across lines.
      for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
        if (NEGATIVE_LABELS.test(lines[j])) continue;
        const next = extractMoneyCandidates(lines[j]);
        if (next.candidates.length) {
          candidate = next.candidates.find((c) => isAnchoredAtEnd(next.line, c)) || next.candidates[next.candidates.length - 1];
          usedAdjacentLine = true;
          break;
        }
      }
    }
    if (!candidate) continue;

    const score = label.weight - (usedAdjacentLine ? 10 : 0) + (i / lines.length) * 12;
    if (!best || score > best.score) {
      best = { value: candidate.value, score, confidence: confidenceForLabel(label.weight, usedAdjacentLine), lineIndex: i };
    }
  }

  if (best) return { value: best.value, confidence: best.confidence, lineIndex: best.lineIndex };

  // No labelled total anywhere — take the largest plausible token on the receipt.
  let max = null;
  for (const rawLine of lines) {
    if (NEGATIVE_LABELS.test(rawLine)) continue;
    for (const candidate of extractMoneyCandidates(rawLine).candidates) {
      if (!max || candidate.value > max) max = candidate.value;
    }
  }
  return max !== null ? { value: max, confidence: 0.45, lineIndex: null } : null;
};

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

const CURRENCY_SIGNALS = [
  [/৳|\bTk\.?\b|\bTaka\b|\bBDT\b/i, "BDT"],
  [/€|\bEUR\b|\bEuros?\b/i, "EUR"],
  [/£|\bGBP\b|\bPounds?\b|\bSterling\b/i, "GBP"],
  [/\bUSD\b|\bUS\s?\$|\$/, "USD"], // last: a bare $ is the weakest signal
];

const detectCurrencyInLine = (line) => {
  for (const [re, code] of CURRENCY_SIGNALS) {
    if (re.test(line)) return { code, bare: code === "USD" && !/USD|US\s?\$/.test(line) };
  }
  return null;
};

const extractCurrency = (lines, totalLineIndex) => {
  if (totalLineIndex != null) {
    const hit = detectCurrencyInLine(lines[totalLineIndex]) || detectCurrencyInLine(lines[totalLineIndex + 1] || "");
    if (hit) return { code: hit.code, confidence: 0.9 };
  }

  const counts = new Map();
  let bareDollarOnly = true;

  for (const line of lines) {
    const hit = detectCurrencyInLine(line);
    if (!hit) continue;
    counts.set(hit.code, (counts.get(hit.code) || 0) + 1);
    if (hit.code === "USD" && !hit.bare) bareDollarOnly = false;
  }
  if (!counts.size) return null; // nothing detected — caller must OMIT, never guess the base currency

  let winner = null;
  for (const [code, count] of counts) {
    if (!winner || count > counts.get(winner)) winner = code;
  }
  return { code: winner, confidence: winner === "USD" && bareDollarOnly ? 0.55 : 0.7 };
};

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const monthFromName = (raw) => {
  const key = raw.toLowerCase();
  return MONTHS[key] ?? MONTHS[key.slice(0, 3)] ?? null;
};

const DATE_LABEL = /\b(?:date|dated|invoice\s*date|bill\s*date|order\s*date|txn\s*date|issued|purchase\s*date|time)\b/i;
const US_SIGNAL = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b|\bU\.?S\.?A?\b/;

const YMD_RE = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/;
const NUM_RE = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
const MDY_TEXT_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+'?(\d{2,4})\b/i;
const DMY_TEXT_RE = /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?[\s-]+'?(\d{2,4})\b/i;

const toIsoDateOnly = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const expandYear = (yy, currentYear) => {
  if (String(yy).length >= 4) return yy;
  let full = 2000 + yy;
  if (full > currentYear + 1) full -= 100;
  return full;
};

const extractDateCandidates = (lines, now, { currencyCode } = {}) => {
  const currentYear = now.getUTCFullYear();
  const preferMdy = currencyCode === "USD" && US_SIGNAL.test(lines.join("\n"));
  const candidates = [];

  const push = (iso, confidence, index) => {
    if (iso) candidates.push({ iso, confidence, index });
  };

  lines.forEach((line, index) => {
    const boost = (DATE_LABEL.test(line) ? 0.15 : 0) + (index < lines.length / 3 ? 0.05 : 0);

    const ymd = YMD_RE.exec(line);
    if (ymd) {
      const [, y, mo, d] = ymd.map(Number);
      push(toIsoDateOnly(y, mo, d), 0.9 + boost, index);
    } else {
      const num = NUM_RE.exec(line);
      if (num) {
        const a = Number(num[1]);
        const b = Number(num[2]);
        const year = expandYear(Number(num[3]), currentYear);

        if (a > 12 && b <= 12) {
          push(toIsoDateOnly(year, b, a), 0.9 + boost, index); // a is the day -> DMY
        } else if (b > 12 && a <= 12) {
          push(toIsoDateOnly(year, a, b), 0.9 + boost, index); // b is the day -> MDY
        } else if (a <= 12 && b <= 12) {
          const dmy = toIsoDateOnly(year, b, a);
          const mdy = toIsoDateOnly(year, a, b);
          if (dmy && !mdy) push(dmy, 0.75 + boost, index);
          else if (mdy && !dmy) push(mdy, 0.75 + boost, index);
          else if (dmy && mdy) push(preferMdy ? mdy : dmy, 0.55 + boost, index); // default DMY
        }
      }
    }

    const mdyText = MDY_TEXT_RE.exec(line);
    if (mdyText) {
      const month = monthFromName(mdyText[1]);
      if (month) push(toIsoDateOnly(expandYear(Number(mdyText[3]), currentYear), month, Number(mdyText[2])), 0.9 + boost, index);
    }
    const dmyText = DMY_TEXT_RE.exec(line);
    if (dmyText) {
      const month = monthFromName(dmyText[2]);
      if (month) push(toIsoDateOnly(expandYear(Number(dmyText[3]), currentYear), month, Number(dmyText[1])), 0.9 + boost, index);
    }
  });

  return candidates;
};

const extractDate = (lines, now, { maxAgeYears = 10, currencyCode } = {}) => {
  const candidates = extractDateCandidates(lines, now, { currencyCode });
  const todayIso = now.toISOString().slice(0, 10);
  const minIso = new Date(Date.UTC(now.getUTCFullYear() - maxAgeYears, now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);

  const valid = candidates.filter((c) => isValidDateOnly(c.iso) && c.iso <= todayIso && c.iso >= minIso);
  if (!valid.length) return null;

  valid.sort((a, b) => b.confidence - a.confidence);
  const best = valid[0];
  return best.confidence >= 0.5 ? { value: best.iso, confidence: best.confidence } : null;
};

// ---------------------------------------------------------------------------
// Merchant
// ---------------------------------------------------------------------------

const MERCHANT_NOISE =
  /\b(?:invoice|receipt|cash\s*memo|tax\s*invoice|bill|voucher|customer\s*copy|merchant\s*copy|vat|tin|bin|mushak|www\.|https?:|@|tel|phone|mobile|order\s*(?:no|#)|table|token|welcome|thank\s*you)\b/i;
const MERCHANT_STRONG =
  /\b(?:ltd|limited|inc\.?|llc|pvt|plc|co\.?|corp|store|shop|mart|superstore|super\s*shop|restaurant|cafe|coffee|bakery|pharmacy|hotel|enterprise|traders?|agency)\b/i;

const digitRatio = (line) => {
  const alnum = line.replace(/[^0-9a-zA-Z]/g, "");
  if (!alnum.length) return 0;
  return (line.match(/\d/g) || []).length / alnum.length;
};

const uppercaseRatio = (line) => {
  const letters = line.replace(/[^a-zA-Z]/g, "");
  if (!letters.length) return 0;
  return (letters.match(/[A-Z]/g) || []).length / letters.length;
};

const stripTrailingPunctuation = (line) => line.replace(/[.,;:*\-–—]+$/, "").trim();

const extractMerchant = (lines) => {
  let best = null;
  const limit = Math.min(6, lines.length);

  for (let index = 0; index < limit; index++) {
    const line = lines[index];
    let score = 4 - index;

    if (uppercaseRatio(line) > 0.6) score += 3;
    if (MERCHANT_STRONG.test(line)) score += 4;
    if (line.length >= 3 && line.length <= 40) score += 2;
    if (MERCHANT_NOISE.test(line)) score -= 6;
    if (digitRatio(line) > 0.4) score -= 6;
    if (DATE_LIKE_TEST.test(line) || TIME_LIKE_TEST.test(line)) score -= 5;
    if (line.split(" ").length > 8) score -= 4;

    if (!best || score > best.score) best = { line, score };
  }

  if (!best || best.score < 4) return null;
  const value = stripTrailingPunctuation(best.line).slice(0, 100);
  if (!value) return null;

  return { value, confidence: Math.min(0.9, 0.4 + best.score / 20) };
};

// ---------------------------------------------------------------------------
// Payment method
// ---------------------------------------------------------------------------

const PAYMENT_PATTERNS = [
  [/\bbkash\b/i, "bKash"],
  [/\bnagad\b/i, "Nagad"],
  [/\brocket\b/i, "Rocket"],
  [/\bupay\b/i, "Upay"],
  [/\bamex\b|\bamerican\s+express\b/i, "Amex"],
  [/\bmaster\s*-?\s*card\b|\bmastercard\b/i, "Mastercard"],
  [/\bvisa\b/i, "Visa"],
  [/\bunion\s*pay\b/i, "UnionPay"],
  [/\bdiscover\b/i, "Discover"],
  [/\bpaypal\b/i, "PayPal"],
  [/\bstripe\b/i, "Stripe"],
  [/\b(?:bank\s*transfer|neft|rtgs|eft|ach|swift)\b/i, "Bank Transfer"],
  [/\bcheque\b|\bcheck\s*#?\s*\d/i, "Cheque"],
  [/\bdebit\s*card\b/i, "Debit Card"],
  [/\bcredit\s*card\b/i, "Credit Card"],
  [/\b(?:card|chip|contactless|emv|pos\s*(?:txn|sale))\b/i, "Card"],
  // "CASH MEMO" is the standard header on Bangladeshi receipts and would otherwise set
  // paymentMethod to "Cash" on nearly every one — this is the single most likely false positive.
  [/\bcash\b(?!\s*(?:memo|register|ier|book))/i, "Cash"],
];

const PAYMENT_CONTEXT = /\b(?:paid|payment|tender|method|mode|type)\b/i;

const extractPaymentMethod = (lines) => {
  const text = lines.join("\n");

  for (const [re, label] of PAYMENT_PATTERNS) {
    if (!re.test(text)) continue;

    const branded = !["Card", "Cash"].includes(label);
    const matchingLine = lines.find((line) => re.test(line)) || "";
    const contextBoost = PAYMENT_CONTEXT.test(matchingLine) ? 0.05 : 0;

    return { value: label.slice(0, 80), confidence: Math.min(0.95, (branded ? 0.85 : 0.6) + contextBoost) };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Merges the static keyword table with the user's own custom category names so a scan can
// recognize categories the user created themselves. Defensively escapes names before building
// a RegExp — an unescaped "(" in a custom category name would otherwise throw on every scan.
export const buildCategoryKeywordTable = (categories, staticKeywords = []) => {
  const table = [...staticKeywords];
  const staticSlugs = new Set(staticKeywords.map((entry) => entry.slug));

  for (const category of categories || []) {
    if (!category?.isCustom || staticSlugs.has(category.slug) || category.slug === "other") continue;
    const escaped = escapeRegex(String(category.name || "").trim());
    if (!escaped) continue;
    table.push({ slug: category.slug, patterns: [new RegExp(`\\b${escaped}\\b`, "i")] });
  }

  return table;
};

const extractCategory = (lines, categoryKeywords) => {
  const text = lines.join("\n");
  for (const { slug, patterns } of categoryKeywords) {
    if (patterns.some((re) => re.test(text))) return { value: slug, confidence: 0.6 };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

const ITEM_LABEL_NOISE = /\b(?:total|subtotal|tax|vat|change|balance|cash|card|thank you|welcome|invoice|receipt)\b/i;

const extractDescription = (lines, merchant) => {
  if (merchant) return { value: merchant.value, confidence: merchant.confidence };

  const limit = Math.min(lines.length, 10);
  for (let index = 2; index < limit; index++) {
    const line = lines[index];
    if (!/[a-zA-Z]/.test(line) || ITEM_LABEL_NOISE.test(line)) continue;
    if (!extractMoneyCandidates(line).candidates.length) continue;
    const value = stripTrailingPunctuation(line).slice(0, 120);
    if (value) return { value, confidence: 0.4 };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

// Never throws. Garbage/empty input returns { fields: {}, confidence: {}, meta: {...} }.
// Only fields with confidence >= 0.4 are emitted — the caller never has to guess whether a
// value is a real detection or a wild guess.
export const parseReceiptText = ({
  text,
  lines = null,
  baseCurrency = "BDT",
  now = new Date(),
  categoryKeywords = [],
  maxAgeYears = 10,
}) => {
  const normalizedLines = Array.isArray(lines) && lines.length
    ? lines.map((line) => String(line).trim()).filter(Boolean)
    : normalizeReceiptLines(text);

  const fields = {};
  const confidence = {};

  if (!normalizedLines.length) {
    return { fields, confidence, meta: { lineCount: 0, totalLineIndex: null } };
  }

  const amountResult = extractAmount(normalizedLines);
  const currencyResult = extractCurrency(normalizedLines, amountResult?.lineIndex ?? null);
  const dateResult = extractDate(normalizedLines, now, { maxAgeYears, currencyCode: currencyResult?.code });
  const merchantResult = extractMerchant(normalizedLines);
  const paymentResult = extractPaymentMethod(normalizedLines);
  const categoryResult = extractCategory(normalizedLines, categoryKeywords);
  const descriptionResult = extractDescription(normalizedLines, merchantResult);

  const consider = (key, result, pick = (r) => r.value) => {
    if (!result || result.confidence < 0.4) return;
    fields[key] = pick(result);
    confidence[key] = result.confidence;
  };

  consider("amount", amountResult);
  if (currencyResult && SUPPORTED_CURRENCIES.includes(currencyResult.code)) {
    consider("currency", currencyResult, (r) => r.code);
  }
  consider("date", dateResult);
  consider("merchant", merchantResult);
  consider("paymentMethod", paymentResult);
  consider("category", categoryResult);
  consider("description", descriptionResult);

  return {
    fields,
    confidence,
    meta: { lineCount: normalizedLines.length, totalLineIndex: amountResult?.lineIndex ?? null },
  };
};
