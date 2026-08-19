import { useState } from "react";
import { Loader2, Users, KeyRound } from "lucide-react";

export default function CreateOrJoinTeamCard({
  onCreate,
  onJoin,
  defaultCurrency = "USD",
}) {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    const budget = Number(monthlyBudget);

    if (!name.trim() || name.trim().length < 2) {
      setError("Team name must contain at least 2 characters");
      return;
    }

    if (!Number.isFinite(budget) || budget < 0) {
      setError("Monthly budget must be a valid non-negative number");
      return;
    }

    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        monthlyBudget: budget,
        currency: currency.trim().toUpperCase(),
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not create the team"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    setError("");

    if (!inviteCode.trim()) {
      setError("An invitation code is required");
      return;
    }

    setBusy(true);
    try {
      await onJoin({ inviteCode: inviteCode.trim().toUpperCase() });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not join that team"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-indigo-100 bg-white p-7 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
        <Users size={22} />
      </div>

      <h2 className="mt-4 text-xl font-bold text-slate-900">
        Set up your team
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Create a team to manage shared tool subscriptions and expense
        requests, or join an existing team with an invitation code.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-lg py-2 text-sm font-semibold transition ${
            mode === "create"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Create a team
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-lg py-2 text-sm font-semibold transition ${
            mode === "join"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Join a team
        </button>
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Team name
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Product Engineering"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Monthly budget
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyBudget}
                onChange={(event) => setMonthlyBudget(event.target.value)}
                placeholder="5000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Currency
              </label>
              <input
                type="text"
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Create team & become Team Admin
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Invitation code
            </label>
            <div className="relative mt-1.5">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300"
              />
              <input
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="e.g. 4F8A2C1B"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm uppercase tracking-widest outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Join team
          </button>
        </form>
      )}
    </div>
  );
}
