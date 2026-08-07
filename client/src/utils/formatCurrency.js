export const formatCurrency = (
  value,
  currency = "USD"
) => {
  const number =
    Number(value || 0);

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",

        currency,

        minimumFractionDigits: 2,

        maximumFractionDigits: 2,
      }
    ).format(number);
  } catch {
    return `${currency} ${number.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }
};