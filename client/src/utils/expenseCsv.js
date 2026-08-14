import Papa from "papaparse";

export const EXPENSE_CSV_HEADERS = Object.freeze([
  "date",
  "description",
  "amount",
  "currency",
  "category",
  "expenseType",
  "merchant",
  "paymentMethod",
  "notes",
]);

export const EXPENSE_CURRENCIES = Object.freeze(["BDT", "USD", "EUR", "GBP"]);

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const validateCsvRow = (row, categories) => {
  const errors = [];
  const amount = Number(row.amount);
  const currency = String(row.currency || "").trim().toUpperCase();
  const expenseType = String(row.expenseType || "").trim().toLowerCase();
  const categoryValue = String(row.category || "").trim().toLowerCase();
  const category = categories.find(
    (item) =>
      item.name.toLowerCase() === categoryValue ||
      item.slug.toLowerCase() === categoryValue
  );

  if (!isValidDate(String(row.date || "").trim())) errors.push("Date must use YYYY-MM-DD");
  if (!String(row.description || "").trim()) errors.push("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) errors.push("Amount must be greater than zero");
  if (!EXPENSE_CURRENCIES.includes(currency)) errors.push("Unsupported currency");
  if (!category) errors.push("Unknown category");
  if (!["business", "personal"].includes(expenseType)) {
    errors.push("expenseType must be business or personal");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      date: String(row.date || "").trim(),
      description: String(row.description || "").trim(),
      amount,
      currency,
      category: category?.slug || String(row.category || "").trim(),
      expenseType,
      merchant: String(row.merchant || "").trim(),
      paymentMethod: String(row.paymentMethod || "").trim(),
      notes: String(row.notes || "").trim(),
    },
  };
};

export const parseExpenseCsv = (file, categories) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header, index) =>
        index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim(),
      complete: (result) => {
        const headers = result.meta.fields || [];
        const headersMatch =
          headers.length === EXPENSE_CSV_HEADERS.length &&
          headers.every((header, index) => header === EXPENSE_CSV_HEADERS[index]);

        if (!headersMatch) {
          resolve({
            headerError: `Use the exact headers: ${EXPENSE_CSV_HEADERS.join(",")}`,
            rows: [],
          });
          return;
        }

        const rows = result.data.map((row, index) => {
          const validation = validateCsvRow(row, categories);
          const parseErrors = result.errors
            .filter((error) => error.row === index)
            .map((error) => error.message || "Malformed CSV row");
          const errors = [...validation.errors, ...parseErrors];

          return {
            rowNumber: index + 2,
            original: row,
            ...validation,
            valid: errors.length === 0,
            errors,
          };
        });

        resolve({ headerError: "", rows, parseErrors: result.errors });
      },
      error: () => reject(new Error("The CSV file could not be read")),
    });
  });
