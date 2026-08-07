import { X, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios";
import "../plus_button_drawer.css";

export default function AddIncomeDrawer({
  isOpen,
  onClose,
  onSuccess,
  incomeToEdit = null, // Can be income or template
  userCurrency = "BDT",
  initialMode = "income", // "income" or "template"
}) {
  const isEditMode = !!incomeToEdit;
  const [mode, setMode] = useState(initialMode);

  const getInitialIncomeForm = () => ({
    amount: "",
    currency: userCurrency,
    source: "client",
    clientName: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const getInitialTemplateForm = () => ({
    templateName: "",
    amount: "",
    currency: userCurrency,
    source: "client",
    clientName: "",
    frequency: "monthly",
    expectedDate: new Date().toISOString().split("T")[0],
  });

  const [form, setForm] = useState(getInitialIncomeForm());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (incomeToEdit) {
      if (initialMode === "income") {
        setForm({
          amount: incomeToEdit.amount || "",
          currency: incomeToEdit.currency || userCurrency,
          source: incomeToEdit.source || "client",
          clientName: incomeToEdit.clientName || "",
          date: incomeToEdit.date
            ? new Date(incomeToEdit.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          notes: incomeToEdit.notes || "",
        });
      } else {
        setForm({
          templateName: incomeToEdit.templateName || "",
          amount: incomeToEdit.amount || "",
          currency: incomeToEdit.currency || userCurrency,
          source: incomeToEdit.source || "client",
          clientName: incomeToEdit.clientName || "",
          frequency: incomeToEdit.frequency || "monthly",
          expectedDate: incomeToEdit.expectedDate
            ? new Date(incomeToEdit.expectedDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        });
      }
    } else {
      setForm(initialMode === "income" ? getInitialIncomeForm() : getInitialTemplateForm());
    }
    setError("");
  }, [incomeToEdit, isOpen, userCurrency, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const switchMode = (newMode) => {
    if (isEditMode) return; // Cannot switch mode while editing
    setMode(newMode);
    setForm(newMode === "income" ? getInitialIncomeForm() : getInitialTemplateForm());
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.amount === "" || Number(form.amount) < 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (mode === "template" && !form.templateName.trim()) {
      setError("Please enter a template name.");
      return;
    }
    if (mode === "template" && !form.expectedDate) {
      setError("Please enter an expected payment date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "income") {
        if (isEditMode) {
          await api.put(`/incomes/${incomeToEdit._id}`, form);
        } else {
          await api.post("/incomes", form);
        }
      } else {
        if (isEditMode) {
          await api.put(`/income-templates/${incomeToEdit._id}`, form);
        } else {
          await api.post("/income-templates", form);
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || `Failed to save ${mode}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="drawer-bg relative z-10 h-full w-full max-w-md overflow-y-auto px-6 py-6 shadow-2xl transition-transform duration-300 md:rounded-l-3xl flex flex-col">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="drawer-title text-2xl font-bold flex items-center gap-2">
            {isEditMode ? `Edit ${mode === 'income' ? 'Income' : 'Template'}` : 'Add New'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white p-2 text-slate-400 hover:text-indigo-600 shadow-sm transition"
          >
            <X size={20} />
          </button>
        </header>

        {!isEditMode && (
          <div className="flex bg-indigo-50 p-1 rounded-xl mb-6">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                mode === "income" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => switchMode("income")}
            >
              Log Income
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                mode === "template" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => switchMode("template")}
            >
              Recurring Template
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          {mode === "template" && (
            <div>
              <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                Template Name
              </label>
              <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
                <input
                  type="text"
                  name="templateName"
                  value={form.templateName}
                  onChange={handleChange}
                  placeholder="e.g. Monthly Retainer - Acme Corp"
                  className="w-full text-slate-900 outline-none text-base"
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                Amount
              </label>
              <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="500.00"
                  step="any"
                  className="w-full text-slate-900 outline-none text-base"
                  required
                />
              </div>
            </div>

            <div>
              <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                Currency
              </label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="drawer-select w-full px-3 py-3 outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Source
            </label>
            <select
              name="source"
              value={form.source}
              onChange={handleChange}
              className="drawer-select w-full px-3 py-3 outline-none capitalize"
            >
              <option value="client">Client Payment</option>
              <option value="freelance">Freelance Platform</option>
              <option value="salary">Salary</option>
              <option value="royalties">Royalties</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Client / Project Name (Optional)
            </label>
            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <input
                type="text"
                name="clientName"
                value={form.clientName}
                onChange={handleChange}
                placeholder="e.g. Upwork, John Doe"
                className="w-full text-slate-900 outline-none text-base"
              />
            </div>
          </div>

          {mode === "income" && (
            <>
              <div>
                <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                  Date Received
                </label>
                <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
                  <Calendar size={18} className="text-indigo-500 mr-2.5" />
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full text-slate-900 outline-none text-base"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                  Notes / Tags (Optional)
                </label>
                <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
                  <input
                    type="text"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="e.g. Website redesign milestone 1"
                    className="w-full text-slate-900 outline-none text-base"
                  />
                </div>
              </div>
            </>
          )}

          {mode === "template" && (
            <>
              <div>
                <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                  Frequency
                </label>
                <select
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  className="drawer-select w-full px-3 py-3 outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              
              <div>
                <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
                  Expected Payment Date
                </label>
                <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
                  <Calendar size={18} className="text-indigo-500 mr-2.5" />
                  <input
                    type="date"
                    name="expectedDate"
                    value={form.expectedDate}
                    onChange={handleChange}
                    className="w-full text-slate-900 outline-none text-base"
                    required
                  />
                </div>
              </div>

            </>
          )}

          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="drawer-button-primary w-full py-4 text-center font-semibold shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Saving..." : isEditMode ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
