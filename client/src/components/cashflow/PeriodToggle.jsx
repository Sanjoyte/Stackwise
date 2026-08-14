export default function PeriodToggle({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div
      className="cf-period-toggle"
      role="group"
      aria-label="Cash flow period"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange("monthly")
        }
        className={
          value === "monthly"
            ? "cf-period-button cf-period-button-active"
            : "cf-period-button"
        }
      >
        Monthly
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange("yearly")
        }
        className={
          value === "yearly"
            ? "cf-period-button cf-period-button-active"
            : "cf-period-button"
        }
      >
        Yearly
      </button>
    </div>
  );
}