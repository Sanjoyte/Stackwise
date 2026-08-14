import { v2 as cloudinary } from "cloudinary";

const requiredEnvironment = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export const configureCloudinary = () => {
  const missing = requiredEnvironment.filter((name) => !process.env[name]);

  if (missing.length) {
    const error = new Error("Receipt image storage is not configured");
    error.statusCode = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
};

export default cloudinary;
