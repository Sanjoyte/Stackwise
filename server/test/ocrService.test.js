import assert from "node:assert/strict";
import test from "node:test";

import { extractTextFromImage, normalizeAdvOcrResult } from "../src/services/ocrService.js";

const complete = (data) => ({ info: { ocr: { adv_ocr: { status: "complete", data } } } });

test("normalizes a complete adv_ocr payload into text and lines", () => {
  const result = normalizeAdvOcrResult(
    complete([{ fullTextAnnotation: { text: "STAR TECH\nTOTAL 500.00\n" } }])
  );

  assert.equal(result.hasText, true);
  assert.equal(result.text, "STAR TECH\nTOTAL 500.00\n");
  assert.deepEqual(result.lines, ["STAR TECH", "TOTAL 500.00"]);
});

test("prefers fullTextAnnotation.text over textAnnotations[0].description", () => {
  const result = normalizeAdvOcrResult(
    complete([{ fullTextAnnotation: { text: "Preferred" }, textAnnotations: [{ description: "Legacy" }] }])
  );

  assert.equal(result.text, "Preferred");
});

test("falls back to textAnnotations[0].description when fullTextAnnotation is absent", () => {
  const result = normalizeAdvOcrResult(complete([{ textAnnotations: [{ description: "Legacy text" }] }]));
  assert.equal(result.text, "Legacy text");
});

test("returns hasText:false for missing ocr, empty data, and whitespace-only text", () => {
  assert.equal(normalizeAdvOcrResult({}).hasText, false);
  assert.equal(normalizeAdvOcrResult(complete([])).hasText, false);
  assert.equal(normalizeAdvOcrResult(complete([{}])).hasText, false);
  assert.equal(normalizeAdvOcrResult(complete([{ fullTextAnnotation: { text: "   " } }])).hasText, false);
});

test("throws a 502 when status is not 'complete'", () => {
  assert.throws(
    () => normalizeAdvOcrResult({ info: { ocr: { adv_ocr: { status: "pending", data: [] } } } }),
    (error) => error.statusCode === 502
  );
});

test("never returns url, publicId or secure_url keys — the scan-and-discard contract", () => {
  const result = normalizeAdvOcrResult(complete([{ fullTextAnnotation: { text: "text" } }]));
  assert.ok(!("url" in result));
  assert.ok(!("publicId" in result));
  assert.ok(!("secure_url" in result));
});

test("extractTextFromImage throws 503 when CLOUDINARY_* env vars are missing", async () => {
  const saved = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  try {
    await assert.rejects(
      extractTextFromImage({ buffer: Buffer.from("fake-image-bytes") }),
      (error) => error.statusCode === 503
    );
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("extractTextFromImage throws 400 for a missing or empty buffer", async () => {
  await assert.rejects(extractTextFromImage({ buffer: Buffer.alloc(0) }), (error) => error.statusCode === 400);
});
