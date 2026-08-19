import {
  Plus,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  addExpenseCategory,
} from "../../api/expenseCategoryApi";

const SUGGESTIONS = [
  "Food & Groceries",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Education",
  "Travel",
  "Software & Subscriptions",
  "Personal Care",
  "Pet Care",
  "Fitness",
  "Gifts",
];

export default function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [name, setName] =
    useState("");

  const [
    monthlyBudget,
    setMonthlyBudget,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!isOpen) {
    return null;
  }

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!name.trim()) {
        setError(
          "Please enter a category name."
        );

        return;
      }

      try {
        setLoading(true);
        setError("");

        await addExpenseCategory({
          name:
            name.trim(),

          monthlyBudget:
            monthlyBudget
              ? Number(
                  monthlyBudget
                )
              : null,
        });

        setName("");
        setMonthlyBudget("");

        await onSuccess?.();

        onClose();
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Could not add category."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="ec-modal-backdrop">
      <div className="ec-modal">
        <div className="ec-modal-header">
          <div>
            <p className="ec-kicker">
              Expenses
            </p>

            <h2>
              Add Category
            </h2>
          </div>

          <button
            type="button"
            className="ec-icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <label className="ec-field">
            <span>
              Category name
            </span>

            <input
              value={name}
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              placeholder="e.g. Pet Care"
            />
          </label>

          <div className="ec-suggestions">
            <span className="ec-field-label">
              Suggested categories
            </span>

            <div className="ec-suggestion-list">
              {SUGGESTIONS.map(
                (
                  suggestion
                ) => (
                  <button
                    type="button"
                    key={
                      suggestion
                    }
                    onClick={() =>
                      setName(
                        suggestion
                      )
                    }
                    className={
                      name ===
                      suggestion
                        ? "ec-suggestion ec-suggestion-active"
                        : "ec-suggestion"
                    }
                  >
                    {
                      suggestion
                    }
                  </button>
                )
              )}
            </div>
          </div>

          <label className="ec-field">
            <span>
              Monthly Budget
              <small>
                Optional
              </small>
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                monthlyBudget
              }
              onChange={(
                event
              ) =>
                setMonthlyBudget(
                  event.target
                    .value
                )
              }
              placeholder="e.g. 10000"
            />
          </label>

          {error && (
            <p className="ec-form-error">
              {error}
            </p>
          )}

          <div className="ec-modal-actions">
            <button
              type="button"
              className="ec-secondary-button"
              onClick={
                onClose
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading
              }
              className="ec-primary-button"
            >
              <Plus
                size={16}
              />

              {loading
                ? "Adding..."
                : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}