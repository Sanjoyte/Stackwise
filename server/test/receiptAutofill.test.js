import assert from "node:assert/strict";
import test from "node:test";

// The client has no test runner, but this file has no JSX and no build-time dependency
// beyond a real npm package (papaparse), so Node can import it directly.
import { mergeOcrFields, OCR_FIELDS, PRESEEDED_FIELDS, sanitizeOcrFields } from "../../client/src/utils/receiptAutofill.js";

const categories = [{ slug: "travel", name: "Travel" }, { slug: "shopping", name: "Shopping" }];

test("sanitizeOcrFields stringifies amount to two decimal places", () => {
  const clean = sanitizeOcrFields({ amount: 3000 }, categories);
  assert.equal(clean.amount, "3000");

  const rounded = sanitizeOcrFields({ amount: 45.678 }, categories);
  assert.equal(rounded.amount, "45.68");
});

test("sanitizeOcrFields drops a non-finite or non-positive amount", () => {
  assert.ok(!("amount" in sanitizeOcrFields({ amount: 0 }, categories)));
  assert.ok(!("amount" in sanitizeOcrFields({ amount: -5 }, categories)));
  assert.ok(!("amount" in sanitizeOcrFields({ amount: NaN }, categories)));
  assert.ok(!("amount" in sanitizeOcrFields({}, categories)));
});

test("sanitizeOcrFields caps text fields at their server-side maxlength", () => {
  const clean = sanitizeOcrFields(
    {
      description: `${"a".repeat(200)}`,
      merchant: `${"b".repeat(200)}`,
      paymentMethod: `${"c".repeat(200)}`,
    },
    categories
  );

  assert.equal(clean.description.length, 120);
  assert.equal(clean.merchant.length, 100);
  assert.equal(clean.paymentMethod.length, 80);
});

test("sanitizeOcrFields only accepts a currency that is in the supported list", () => {
  assert.equal(sanitizeOcrFields({ currency: "BDT" }, categories).currency, "BDT");
  assert.ok(!("currency" in sanitizeOcrFields({ currency: "XYZ" }, categories)));
  assert.ok(!("currency" in sanitizeOcrFields({}, categories)));
});

test("sanitizeOcrFields only accepts a strict YYYY-MM-DD date", () => {
  assert.equal(sanitizeOcrFields({ date: "2026-08-14" }, categories).date, "2026-08-14");
  assert.ok(!("date" in sanitizeOcrFields({ date: "08/14/2026" }, categories)));
});

test("sanitizeOcrFields only accepts a category slug that exists in the user's categories", () => {
  assert.equal(sanitizeOcrFields({ category: "travel" }, categories).category, "travel");
  assert.ok(!("category" in sanitizeOcrFields({ category: "unknown-slug" }, categories)));
});

test("mergeOcrFields overwrites pre-seeded defaults (date, currency) when untouched", () => {
  const current = { date: "2026-08-20", currency: "BDT", description: "", amount: "" };
  const incoming = { date: "2026-08-14", currency: "USD" };

  const { next, applied } = mergeOcrFields({ current, incoming, touched: new Set() });

  assert.equal(next.date, "2026-08-14");
  assert.equal(next.currency, "USD");
  assert.deepEqual(applied, { date: "2026-08-14", currency: "USD" });
});

test("mergeOcrFields never overwrites a non-blank, non-pre-seeded field even if untouched", () => {
  const current = { description: "My own description", amount: "500", merchant: "" };
  const incoming = { description: "OCR description", amount: "999", merchant: "OCR Store" };

  const { next, applied } = mergeOcrFields({ current, incoming, touched: new Set() });

  assert.equal(next.description, "My own description");
  assert.equal(next.amount, "500");
  assert.equal(next.merchant, "OCR Store"); // was blank, so this one IS filled
  assert.deepEqual(applied, { merchant: "OCR Store" });
});

test("mergeOcrFields never overwrites a touched field, even a pre-seeded one", () => {
  const current = { date: "2026-08-20", currency: "BDT" };
  const incoming = { date: "2026-08-14", currency: "USD" };

  const { next, applied } = mergeOcrFields({
    current,
    incoming,
    touched: new Set(["date", "currency"]),
  });

  assert.equal(next.date, "2026-08-20");
  assert.equal(next.currency, "BDT");
  assert.deepEqual(applied, {});
});

test("mergeOcrFields skips fields the server omitted and no-op values", () => {
  const current = { date: "2026-08-20", currency: "BDT", merchant: "" };
  const incoming = { currency: "BDT" }; // same as current — a no-op

  const { applied, previous } = mergeOcrFields({ current, incoming, touched: new Set() });

  assert.deepEqual(applied, {});
  assert.deepEqual(previous, {});
});

test("mergeOcrFields records the pre-scan value so a revert can restore it", () => {
  const current = { date: "2026-08-20", currency: "BDT" };
  const incoming = { date: "2026-08-14", currency: "USD" };

  const { previous } = mergeOcrFields({ current, incoming, touched: new Set() });

  assert.deepEqual(previous, { date: "2026-08-20", currency: "BDT" });
});

test("OCR_FIELDS and PRESEEDED_FIELDS cover the expected fields", () => {
  assert.deepEqual(
    [...OCR_FIELDS].sort(),
    ["amount", "category", "currency", "date", "description", "merchant", "paymentMethod"].sort()
  );
  assert.deepEqual([...PRESEEDED_FIELDS].sort(), ["currency", "date"]);
});
