export const SUPPORTED_CURRENCIES = Object.freeze([
  "BDT",
  "USD",
  "EUR",
  "GBP",
]);

export const USD_TO_BDT = 120;

export const normalizeCurrency = (value, fallback = "BDT") => {
  const normalized = String(value || fallback).trim().toUpperCase();

  if (normalized === "৳") return "BDT";
  if (normalized === "$") return "USD";

  return normalized;
};

export const convertCurrency = ({ amount, fromCurrency, toCurrency }) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) return 0;

  const from = normalizeCurrency(fromCurrency, toCurrency);
  const to = normalizeCurrency(toCurrency, "BDT");

  if (from === to) return Math.abs(value);
  if (from === "USD" && to === "BDT") return Math.abs(value) * USD_TO_BDT;
  if (from === "BDT" && to === "USD") return Math.abs(value) / USD_TO_BDT;

  // This is the same safe fallback used by the existing Stackwise finance code.
  return Math.abs(value);
};

export const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const isValidDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const slugifyCategory = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
