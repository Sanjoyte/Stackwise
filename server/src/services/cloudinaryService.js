import { configureCloudinary } from "../config/cloudinary.js";

export const uploadReceiptImage = ({ buffer, userId, expenseId }) => {
  const cloudinary = configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `stackwise/receipts/${userId}`,
        public_id: `${expenseId}-${Date.now()}`,
        overwrite: false,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
};

export const deleteReceiptImage = async (publicId) => {
  if (!publicId) return;

  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};
