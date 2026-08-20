import { X, Calendar, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import api from "../api/axios";
import { initiateSubscriptionPayment } from "../api/paymentApi";

import "../plus_button_drawer.css";

export default function AddSubscriptionDrawer({
  isOpen,
  onClose,
  onSuccess,
  subscriptionToEdit = null,
  userCurrency = "BDT",
}) {
  const isEditMode = !!subscriptionToEdit;

  const getInitialForm = () => ({
    name: "",
    planName: "PRO TIER",
    amount: "",
    currency: userCurrency,
    billingCycle: "monthly",
    renewalDate: new Date().toISOString().split("T")[0],
    paymentPortalUrl: "",
    registeredEmail: "",
    paymentMethod: "Visa | **** 2466",
    isTrial: false,
    trialAlert: true,
    category: "AI",
    capabilities: [],
    usagePercentage: 100,
  });

  const [form, setForm] = useState(getInitialForm());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capabilityInput, setCapabilityInput] = useState("");
  const [payNow, setPayNow] = useState(false);

  useEffect(() => {
    if (subscriptionToEdit) {
      setForm({
        name: subscriptionToEdit.name || "",
        planName: subscriptionToEdit.planName || "PRO TIER",
        amount: subscriptionToEdit.amount || "",
        currency: subscriptionToEdit.currency || userCurrency,
        billingCycle: subscriptionToEdit.billingCycle || "monthly",
        renewalDate: subscriptionToEdit.renewalDate
          ? new Date(subscriptionToEdit.renewalDate)
              .toISOString()
              .split("T")[0]
          : new Date().toISOString().split("T")[0],
        paymentPortalUrl: subscriptionToEdit.paymentPortalUrl || "",
        registeredEmail: subscriptionToEdit.registeredEmail || "",
        paymentMethod:
          subscriptionToEdit.paymentMethod || "Visa | **** 2466",
        isTrial: !!subscriptionToEdit.isTrial,
        trialAlert: subscriptionToEdit.trialAlert !== false,
        category: subscriptionToEdit.category || "AI",
        capabilities: Array.isArray(subscriptionToEdit.capabilities)
          ? subscriptionToEdit.capabilities
          : [],
        usagePercentage: subscriptionToEdit.usagePercentage ?? 100,
      });
    } else {
      setForm(getInitialForm());
    }

    setError("");
    setCapabilityInput("");
    setPayNow(false);
  }, [subscriptionToEdit, isOpen, userCurrency]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addCapability = () => {
    const trimmed = capabilityInput.trim();

    if (!trimmed) return;

    if (
      form.capabilities.some(
        (cap) => cap.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setCapabilityInput("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      capabilities: [...prev.capabilities, trimmed],
    }));

    setCapabilityInput("");
  };

  const handleCapabilityKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCapability();
    } else if (
      e.key === "Backspace" &&
      !capabilityInput &&
      form.capabilities.length > 0
    ) {
      setForm((prev) => ({
        ...prev,
        capabilities: prev.capabilities.slice(0, -1),
      }));
    }
  };

  const removeCapability = (index) => {
    setForm((prev) => ({
      ...prev,
      capabilities: prev.capabilities.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter a tool/service name.");
      return;
    }

    if (form.amount === "" || Number(form.amount) < 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!form.renewalDate) {
      setError("Please pick a renewal / trial end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let saved;

      if (isEditMode) {
        const response = await api.put(
          `/subscriptions/${subscriptionToEdit._id}`,
          form
        );

        saved = response.data.subscription;
      } else {
        const response = await api.post("/subscriptions", form);
        saved = response.data.subscription;
      }

      if (payNow && saved?._id) {
        const payment = await initiateSubscriptionPayment(saved._id);

        if (payment.checkoutUrl) {
          window.location.assign(payment.checkoutUrl);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save subscription. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="drawer-bg relative z-10 h-full w-full max-w-md overflow-y-auto px-6 py-6 shadow-2xl transition-transform duration-300 md:rounded-l-3xl">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="drawer-title flex items-center gap-2 text-2xl font-bold">
            {isEditMode ? "Edit Subscription" : "Add Subscription"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition hover:text-indigo-600"
          >
            <X size={20} />
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Tool Name
            </label>

            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. ChatGPT, Netflix"
                className="w-full text-base text-slate-900 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Plan Name / Tier
            </label>

            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <input
                type="text"
                name="planName"
                value={form.planName}
                onChange={handleChange}
                placeholder="e.g. PRO TIER, Premium 4K"
                className="w-full text-base text-slate-900 outline-none"
              />
            </div>
          </div>

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
                  placeholder="20.00"
                  step="any"
                  className="w-full text-base text-slate-900 outline-none"
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
              Billing Cycle
            </label>

            <select
              name="billingCycle"
              value={form.billingCycle}
              onChange={handleChange}
              className="drawer-select w-full px-3 py-3 outline-none"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Category
            </label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="drawer-select w-full px-3 py-3 outline-none"
            >
              <option value="AI">AI / SaaS</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Productivity">Productivity</option>
              <option value="Utilities">Utilities</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Capability Tags
            </label>

            <div className="drawer-input-container flex flex-wrap items-center gap-2 bg-white px-3 py-2.5">
              {form.capabilities.map((cap, index) => (
                <span
                  key={`${cap}-${index}`}
                  className="drawer-tag-chip"
                >
                  {cap}

                  <button
                    type="button"
                    onClick={() => removeCapability(index)}
                    aria-label={`Remove ${cap}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={capabilityInput}
                onChange={(e) => setCapabilityInput(e.target.value)}
                onKeyDown={handleCapabilityKeyDown}
                onBlur={addCapability}
                placeholder={
                  form.capabilities.length === 0
                    ? "e.g. Chat, Image Gen, API Access (press Enter)"
                    : "Add more..."
                }
                className="min-w-[140px] flex-1 text-base text-slate-900 outline-none"
              />

              <button
                type="button"
                onClick={addCapability}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Press Enter or comma to add a capability. Click the × to remove.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-xs">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  Free Trial / Promotional Price
                </span>

                <p className="mt-0.5 text-xs text-slate-400">
                  Check this if subscription is currently free or discounted.
                </p>
              </div>

              <input
                type="checkbox"
                name="isTrial"
                checked={form.isTrial}
                onChange={handleChange}
                className="h-5 w-5 rounded-md border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {form.isTrial && (
              <div className="mt-4 space-y-3 border-t border-indigo-50 pt-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="trialAlert"
                    checked={form.trialAlert}
                    onChange={handleChange}
                    className="h-4 w-4 rounded-md border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <span className="text-xs font-medium text-slate-600">
                    Send alert 48 hours before trial converts
                  </span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              {form.isTrial ? "Trial End Date" : "Renewal Date"}
            </label>

            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <Calendar
                size={18}
                className="mr-2.5 text-indigo-500"
              />

              <input
                type="date"
                name="renewalDate"
                value={form.renewalDate}
                onChange={handleChange}
                className="w-full text-base text-slate-900 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Payment Method
            </label>

            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <input
                type="text"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                placeholder="e.g. Visa | **** 2466, bKash"
                className="w-full text-base text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Registered Email
            </label>

            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <input
                type="email"
                name="registeredEmail"
                value={form.registeredEmail}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full text-base text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Payment Portal URL
            </label>

            <div className="drawer-input-container flex items-center bg-white px-3 py-2.5">
              <input
                type="url"
                name="paymentPortalUrl"
                value={form.paymentPortalUrl}
                onChange={handleChange}
                placeholder="https://service.com/billing"
                className="w-full text-base text-slate-900 outline-none"
              />
            </div>
          </div>

          {!isEditMode && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="payNow"
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />

                <label htmlFor="payNow" className="cursor-pointer">
                  <span className="block text-sm font-bold text-slate-800">
                    Pay this subscription now (optional)
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    If unchecked, Stackwise only saves the subscription cost
                    manually. If checked, you will be redirected to SSLCOMMERZ
                    checkout after saving.
                  </span>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="drawer-button-primary w-full cursor-pointer py-4 text-center font-semibold shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : payNow && !isEditMode
                ? "Save & Continue to Payment"
                : isEditMode
                  ? "Update Subscription"
                  : "Save Subscription"}
          </button>
        </form>
      </div>
    </div>
  );
}