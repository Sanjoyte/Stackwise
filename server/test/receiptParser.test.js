import assert from "node:assert/strict";
import test from "node:test";

import { parseMoneyToken, parseReceiptText } from "../src/utils/receiptParser.js";
import { RECEIPT_CATEGORY_KEYWORDS } from "../src/data/receiptCategoryKeywords.js";
import { DEFAULT_EXPENSE_CATEGORIES } from "../src/data/defaultExpenseCategories.js";
import { validateExpenseInput } from "../src/services/expenseService.js";
import { isValidDateOnly } from "../src/utils/expenseUtils.js";

const NOW = new Date("2026-08-20T00:00:00.000Z");

const SUPERMARKET_RECEIPT = [
  "SHWAPNO SUPERSHOP LTD",
  "Cash Memo",
  "Dhanmondi, Dhaka",
  "Date: 14/08/2026",
  "Item A                    500.00",
  "Item B                    1,200.00",
  "SUBTOTAL                 1,700.00",
  "VAT                         85.00",
  "GRAND TOTAL              ৳1,785.00",
  "CASH",
  "THANK YOU",
].join("\n");

const RESTAURANT_RECEIPT = [
  "JOE'S DINER RESTAURANT",
  "123 Main St, Springfield IL 62701",
  "USA",
  "Date: 08/25/2026",
  "Subtotal            $45.00",
  "Tax                  $3.60",
  "Tip                  $9.00",
  "Total                $57.60",
  "VISA ****1234",
  "Thank you for dining with us",
].join("\n");

const GARBAGE_RECEIPT = "###!! zzz 12 xx## \n blurred nonsense !!! \n";

test("parseMoneyToken handles thousands separators, decimals and grouping ambiguity", () => {
  const table = [
    ["3,000.00", 3000],
    ["3.000,00", 3000],
    ["3 000,00", 3000],
    ["3000", 3000],
    ["1,234", 1234],
    ["1.234", 1234], // accepted misread: grouping wins over "one point two three four"
    ["3,00", 3],
    ["1.5", 1.5],
    ["1,234,567.89", 1234567.89],
  ];

  for (const [raw, expected] of table) {
    assert.equal(parseMoneyToken(raw), expected, `parseMoneyToken(${raw})`);
  }
});

test("amount prefers GRAND TOTAL over SUBTOTAL and VAT", () => {
  const { fields, confidence } = parseReceiptText({
    lines: ["SUBTOTAL 1000.00", "VAT 50.00", "GRAND TOTAL 1050.00"],
    now: NOW,
  });

  assert.equal(fields.amount, 1050);
  assert.ok(confidence.amount >= 0.9);
});

test("amount prefers Total over Subtotal/Tax/Tip without a 'grand' prefix", () => {
  const { fields } = parseReceiptText({
    lines: ["Subtotal $45.00", "Tax $3.60", "Tip $9.00", "Total $57.60"],
    now: NOW,
  });

  assert.equal(fields.amount, 57.6);
});

test("amount ignores phone numbers, TIN, invoice numbers and dates", () => {
  const { fields } = parseReceiptText({
    lines: ["Invoice No: 20260814123", "TIN: 123456789", "Phone: 01712345678", "Date: 14/08/2026", "TOTAL 500.00"],
    now: NOW,
  });

  assert.equal(fields.amount, 500);
});

test("amount falls back to the largest plausible token when unlabelled", () => {
  const { fields, confidence } = parseReceiptText({
    lines: ["Item A 120.00", "Item B 45.50", "Item C 999.00"],
    now: NOW,
  });

  assert.equal(fields.amount, 999);
  assert.equal(confidence.amount, 0.45);
});

test("currency detects ৳, Tk, BDT, $, €, £ and clamps to SUPPORTED_CURRENCIES", () => {
  const cases = [
    ["TOTAL ৳100", "BDT"],
    ["TOTAL Tk 100", "BDT"],
    ["TOTAL BDT 100", "BDT"],
    ["TOTAL $100", "USD"],
    ["TOTAL €100", "EUR"],
    ["TOTAL £100", "GBP"],
  ];

  for (const [line, expected] of cases) {
    const { fields } = parseReceiptText({ lines: [line], now: NOW });
    assert.equal(fields.currency, expected, `currency for "${line}"`);
  }
});

test("currency is OMITTED when undetectable — never defaults to the base currency", () => {
  const { fields } = parseReceiptText({ lines: ["TOTAL 500.00"], baseCurrency: "BDT", now: NOW });
  assert.ok(!("currency" in fields));
});

test("date disambiguates unambiguous 25/08/2026 and 08/25/2026 to the same calendar day", () => {
  const now = new Date("2026-08-30T00:00:00.000Z");

  const dmy = parseReceiptText({ lines: ["Date: 25/08/2026"], now });
  assert.equal(dmy.fields.date, "2026-08-25");

  const mdy = parseReceiptText({ lines: ["Date: 08/25/2026"], now });
  assert.equal(mdy.fields.date, "2026-08-25");
});

test("date defaults ambiguous DD/MM vs MM/DD to DMY unless a US signal is present", () => {
  const withoutSignal = parseReceiptText({ lines: ["Date: 05/08/2026"], now: NOW });
  assert.equal(withoutSignal.fields.date, "2026-08-05"); // DMY default: 5 August

  const withSignal = parseReceiptText({
    lines: ["TOTAL $500.00", "Date: 05/08/2026", "Springfield IL 62701"],
    now: NOW,
  });
  assert.equal(withSignal.fields.currency, "USD");
  assert.equal(withSignal.fields.date, "2026-05-08"); // MDY: US signal + USD flips the default
});

test("date parses Aug 14, 2026 / 14 Aug 2026 / 2026-08-14 / 14-08-26 identically", () => {
  const formats = ["Aug 14, 2026", "14 Aug 2026", "2026-08-14", "14-08-26"];

  for (const line of formats) {
    const { fields } = parseReceiptText({ lines: [line], now: NOW });
    assert.equal(fields.date, "2026-08-14", `date for "${line}"`);
  }
});

test("date rejects future dates and dates older than the max age window", () => {
  const future = parseReceiptText({ lines: ["Date: 20/08/2030"], now: NOW });
  assert.ok(!("date" in future.fields));

  const ancient = parseReceiptText({ lines: ["Date: 20/08/2010"], now: NOW, maxAgeYears: 10 });
  assert.ok(!("date" in ancient.fields));
});

test("every emitted date satisfies the real isValidDateOnly validator", () => {
  const { fields } = parseReceiptText({ lines: ["2026-08-14"], now: NOW });
  assert.equal(isValidDateOnly(fields.date), true);
});

test("merchant is taken from the header and skips CASH MEMO / TAX INVOICE", () => {
  const { fields } = parseReceiptText({
    lines: ["CASH MEMO", "TAX INVOICE", "STAR TECH LTD", "Dhaka", "TOTAL 500.00"],
    now: NOW,
  });

  assert.equal(fields.merchant, "STAR TECH LTD");
});

test("paymentMethod never matches CASH MEMO with no other payment signal", () => {
  const { fields } = parseReceiptText({
    lines: ["CASH MEMO", "ABC STORE", "TOTAL 500"],
    now: NOW,
  });

  assert.ok(!("paymentMethod" in fields));
});

test("paymentMethod prefers VISA over a stray CASH mention", () => {
  const { fields } = parseReceiptText({
    lines: ["STORE", "TOTAL 500", "VISA CARD PAYMENT", "CASH BACK 20"],
    now: NOW,
  });

  assert.equal(fields.paymentMethod, "Visa");
});

test("description falls back to the merchant when one is found", () => {
  const { fields } = parseReceiptText({ lines: ["STAR TECH LTD", "TOTAL 500.00"], now: NOW });

  assert.equal(fields.merchant, "STAR TECH LTD");
  assert.equal(fields.description, fields.merchant);
});

test("description falls back to an item line and is capped at 120 characters when no merchant is found", () => {
  const longLine = `${"a".repeat(130)} 250.00`;
  const { fields } = parseReceiptText({
    lines: ["1234567890", "9876543210", longLine],
    now: NOW,
  });

  assert.ok(!("merchant" in fields)); // none of the header lines qualified as a merchant
  assert.equal(fields.description.length, 120);
  assert.equal(fields.description, "a".repeat(120));
});

test("category matches a keyword and is never guessed as 'other'", () => {
  assert.ok(!RECEIPT_CATEGORY_KEYWORDS.some((entry) => entry.slug === "other"));

  const matched = parseReceiptText({
    lines: ["UBER TRIP", "TOTAL 250.00"],
    now: NOW,
    categoryKeywords: RECEIPT_CATEGORY_KEYWORDS,
  });
  assert.equal(matched.fields.category, "transport");

  const unmatched = parseReceiptText({
    lines: ["RANDOM RECEIPT TEXT", "TOTAL 100.00"],
    now: NOW,
    categoryKeywords: RECEIPT_CATEGORY_KEYWORDS,
  });
  assert.ok(!("category" in unmatched.fields));
});

test("empty, whitespace-only and garbage text never throw", () => {
  assert.deepEqual(parseReceiptText({ text: "" }).fields, {});
  assert.deepEqual(parseReceiptText({ text: "   \n\n  " }).fields, {});

  assert.doesNotThrow(() => parseReceiptText({ text: GARBAGE_RECEIPT, now: NOW }));
});

test("a realistic BD supermarket receipt resolves amount, currency, merchant, payment and category", () => {
  const { fields } = parseReceiptText({
    text: SUPERMARKET_RECEIPT,
    now: NOW,
    categoryKeywords: RECEIPT_CATEGORY_KEYWORDS,
  });

  assert.equal(fields.amount, 1785);
  assert.equal(fields.currency, "BDT");
  assert.equal(fields.merchant, "SHWAPNO SUPERSHOP LTD");
  assert.equal(fields.paymentMethod, "Cash");
  assert.equal(fields.category, "food-groceries");
});

test("a realistic US restaurant receipt resolves amount, currency, merchant and payment", () => {
  const { fields } = parseReceiptText({
    text: RESTAURANT_RECEIPT,
    now: NOW,
    categoryKeywords: RECEIPT_CATEGORY_KEYWORDS,
  });

  assert.equal(fields.amount, 57.6);
  assert.equal(fields.currency, "USD");
  assert.equal(fields.merchant, "JOE'S DINER RESTAURANT");
  assert.equal(fields.paymentMethod, "Visa");
});

// The highest-value test: parser output must always be accepted by the real save-path
// validator, mechanically enforcing every length cap, the currency whitelist, the strict
// date format, and the category-slug guarantee.
test("parser output is always accepted by validateExpenseInput", () => {
  const fixtures = [SUPERMARKET_RECEIPT, RESTAURANT_RECEIPT, GARBAGE_RECEIPT];

  for (const fixtureText of fixtures) {
    const { fields } = parseReceiptText({
      text: fixtureText,
      baseCurrency: "BDT",
      now: NOW,
      categoryKeywords: RECEIPT_CATEGORY_KEYWORDS,
    });

    const result = validateExpenseInput({
      input: {
        description: "x",
        amount: 1,
        currency: "BDT",
        date: "2026-08-20",
        category: "travel",
        expenseType: "business",
        ...fields,
      },
      categories: DEFAULT_EXPENSE_CATEGORIES,
      strictDate: true,
    });

    assert.equal(result.valid, true, `fixture produced unsaveable fields: ${result.errors}`);
  }
});
