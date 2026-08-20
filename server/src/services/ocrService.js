import { randomUUID } from "node:crypto";

import { configureCloudinary } from "../config/cloudinary.js";

const SCRATCH_FOLDER = () => process.env.OCR_SCRATCH_FOLDER || "stackwise/ocr-scratch";
const OCR_TIMEOUT_MS = () => Number(process.env.OCR_TIMEOUT_MS) || 40000;

// Latches off for the rest of the process once we learn the add-on isn't subscribed,
// so a misconfigured account fails fast instead of paying for a rejected upload every scan.
let addonUnavailable = false;

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const isAddonNotEnabled = (error) =>
  Number(error?.http_code) === 400 &&
  /add-?on|not enabled|not subscribed|ocr/i.test(String(error?.message || error?.error?.message || ""));

export const isOcrConfigured = () =>
  String(process.env.OCR_ENABLED ?? "true").toLowerCase() !== "false" && !addonUnavailable;

// Pure and exported so the many shapes Cloudinary's adv_ocr add-on can return are unit-testable
// without a network call. Never returns url/publicId — the scan-and-discard contract depends on it.
export const normalizeAdvOcrResult = (uploadResult, { includeWords = false } = {}) => {
  const advOcr = uploadResult?.info?.ocr?.adv_ocr;
  const empty = { text: "", lines: [], words: [], locale: null, hasText: false };

  if (!advOcr) return empty;
  if (advOcr.status && advOcr.status !== "complete") {
    fail(advOcr.data?.[0]?.error?.message || "The image could not be read", 502);
  }

  const page = Array.isArray(advOcr.data) ? advOcr.data[0] : null;
  // Prefer the structured, block-aware output; textAnnotations[0] is the legacy convenience field.
  const text = page?.fullTextAnnotation?.text ?? page?.textAnnotations?.[0]?.description ?? "";
  if (!text.trim()) return empty; // a valid scan of an unreadable image is NOT an error

  return {
    text,
    lines: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    words: includeWords
      ? (page?.textAnnotations ?? []).slice(1).map(({ description, boundingPoly }) => ({ description, boundingPoly }))
      : [],
    locale: page?.textAnnotations?.[0]?.locale ?? null,
    hasText: true,
  };
};

// Uploads to a scratch folder with OCR enabled, then destroys the asset before returning —
// the caller only ever receives extracted text, never a url or publicId.
export const extractTextFromImage = async ({
  buffer,
  folder = SCRATCH_FOLDER(),
  tags = [],
  publicIdPrefix = "ocr",
  includeWords = false,
  timeoutMs = OCR_TIMEOUT_MS(),
}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) fail("An image is required for text extraction", 400);
  if (!isOcrConfigured()) fail("Text extraction is not available right now", 503);

  const cloudinary = configureCloudinary(); // lazy; throws 503 if CLOUDINARY_* is missing
  let scratchPublicId = null;

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `${publicIdPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}`,
          overwrite: false,
          resource_type: "image",
          access_mode: "authenticated", // never publicly deliverable, even for the seconds it exists
          ocr: "adv_ocr",
          tags: ["ocr-scratch", ...tags], // safety-net sweep handle if destroy ever fails
          timeout: timeoutMs,
          // Deliberately NO `transformation` here — adv_ocr must read the pristine original,
          // not a quality/format-transcoded derivative.
        },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded))
      );
      stream.end(buffer);
    });

    scratchPublicId = result?.public_id || null; // set before any parsing can throw
    return normalizeAdvOcrResult(result, { includeWords });
  } catch (error) {
    if (isAddonNotEnabled(error)) {
      addonUnavailable = true;
      fail("Text extraction is not available right now", 503);
    }
    if (error.statusCode) throw error;
    fail("The image could not be read", 502);
  } finally {
    if (scratchPublicId) {
      try {
        await configureCloudinary().uploader.destroy(scratchPublicId, { resource_type: "image" });
      } catch {
        // Never mask the OCR outcome. The "ocr-scratch" tag makes a manual sweep trivial.
      }
    }
  }
};

// Scans an asset that is already stored in Cloudinary, without uploading anything new.
// Kept generic (no expense vocabulary) so future features can reuse it — e.g. re-scanning
// a receipt already attached to an expense.
export const extractTextFromAsset = async ({ publicId, resourceType = "image", type = "upload", includeWords = false }) => {
  if (!publicId) fail("An asset id is required for text extraction", 400);
  if (!isOcrConfigured()) fail("Text extraction is not available right now", 503);

  const cloudinary = configureCloudinary();

  try {
    const result = await cloudinary.uploader.explicit(publicId, { type, resource_type: resourceType, ocr: "adv_ocr" });
    return normalizeAdvOcrResult(result, { includeWords });
  } catch (error) {
    if (isAddonNotEnabled(error)) {
      addonUnavailable = true;
      fail("Text extraction is not available right now", 503);
    }
    if (error.statusCode) throw error;
    fail("The image could not be read", 502);
  }
};
