import multer from "multer";

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MIME_TYPES = Object.freeze(["image/jpeg", "image/png"]);

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!RECEIPT_MIME_TYPES.includes(file.mimetype)) {
      callback(new Error("Receipts must be JPG, JPEG, or PNG images"));
      return;
    }

    callback(null, true);
  },
});

export const uploadReceipt = (req, res, next) => {
  receiptUpload.single("receipt")(req, res, (error) => {
    if (!error) return next();

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Receipt images must be 5 MB or smaller"
        : error.message || "The receipt image could not be processed";

    return res.status(400).json({ success: false, message });
  });
};
