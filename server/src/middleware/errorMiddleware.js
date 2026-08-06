export const notFound = (req, res, next) => {
  res.status(404);

  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};