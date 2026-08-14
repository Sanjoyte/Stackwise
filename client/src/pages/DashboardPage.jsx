import { useNavigate } from "react-router";

import {
  ArrowRight,
  LogOut,
  Sparkles,
  WalletCards,
} from "lucide-react";

import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";

import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";

import "../styles/cashFlow.css";

export default function LoginSuccessPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="cf-page">
      {/* =========================
          LEFT SIDEBAR
          ========================= */}
      <CashFlowSidebar />

      {/* =========================
          MAIN DASHBOARD WORKSPACE
          ========================= */}
      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f7f4ff] px-5 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl">
            {/* =========================
                HEADER
                ========================= */}
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-5 shadow-sm">
              <BrandMark darkText />

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-100"
              >
                <LogOut size={17} />
                Logout
              </button>
            </header>

            {/* =========================
                DASHBOARD CONTENT
                ========================= */}
            <section className="py-14">
              {/* Login Success Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                <Sparkles size={14} />
                Login successful
              </div>

              {/* Welcome */}
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Welcome, {user?.name || "User"}
              </h1>

              <p className="mt-4 max-w-2xl text-slate-500">
                Manage your Stackwise subscriptions, cash flow, income
                tracking, and AI subscription overlap alerts from one place.
              </p>

              {/* =========================
                  ACCOUNT INFORMATION
                  ========================= */}
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {/* Email */}
                <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                  <WalletCards className="text-indigo-500" />

                  <p className="mt-5 text-sm text-slate-400">
                    Account email
                  </p>

                  <p className="mt-2 break-words font-bold text-slate-900">
                    {user?.email || "Not available"}
                  </p>
                </article>

                {/* Currency */}
                <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                  <WalletCards className="text-indigo-500" />

                  <p className="mt-5 text-sm text-slate-400">
                    Base currency
                  </p>

                  <p className="mt-2 break-words font-bold text-slate-900">
                    {user?.baseCurrency || "BDT"}
                  </p>
                </article>

                {/* Role */}
                <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                  <WalletCards className="text-indigo-500" />

                  <p className="mt-5 text-sm text-slate-400">
                    Account role
                  </p>

                  <p className="mt-2 break-words font-bold capitalize text-slate-900">
                    {user?.role || "individual"}
                  </p>
                </article>
              </div>

              {/* =========================
                  FEATURE NAVIGATION
                  ========================= */}
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {/* =========================
                    SUBSCRIPTIONS
                    ========================= */}
                <button
                  type="button"
                  onClick={() => navigate("/subscription")}
                  className="group flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-left text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
                      Subscription Management
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      Subscriptions
                    </h3>

                    <p className="mt-1 text-xs text-indigo-100">
                      Manage recurring services, trials, plans, and renewal
                      dates.
                    </p>
                  </div>

                  <ArrowRight
                    size={22}
                    className="ml-4 shrink-0 transition group-hover:translate-x-1"
                  />
                </button>

                {/* =========================
                    CASH FLOW
                    ========================= */}
                <button
                  type="button"
                  onClick={() => navigate("/cash-flow")}
                  className="group flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-left text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                      Financial Overview
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      Cash Flow
                    </h3>

                    <p className="mt-1 text-xs text-emerald-100">
                      Track money coming in and going out from your account.
                    </p>
                  </div>

                  <ArrowRight
                    size={22}
                    className="ml-4 shrink-0 transition group-hover:translate-x-1"
                  />
                </button>

                {/* =========================
                    INCOME TRACKING
                    ========================= */}
                <button
                  type="button"
                  onClick={() => navigate("/income")}
                  className="group flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-5 text-left text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Income Management
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      Income Tracking
                    </h3>

                    <p className="mt-1 text-xs text-cyan-100">
                      Add and monitor income sources and recurring income.
                    </p>
                  </div>

                  <ArrowRight
                    size={22}
                    className="ml-4 shrink-0 transition group-hover:translate-x-1"
                  />
                </button>

                {/* =========================
                    AI OVERLAP
                    ========================= */}
                <button
                  type="button"
                  onClick={() => navigate("/overlap")}
                  className="group flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-5 text-left text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-100">
                      Smart Analysis
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      AI Overlap Alerts
                    </h3>

                    <p className="mt-1 text-xs text-rose-100">
                      Find subscriptions with similar AI capabilities and
                      potentially redundant spending.
                    </p>
                  </div>

                  <ArrowRight
                    size={22}
                    className="ml-4 shrink-0 transition group-hover:translate-x-1"
                  />
                </button>
              </div>
            </section>
          </div>
        </main>

        {/* =========================
            MOBILE NAVIGATION
            ========================= */}
        <CashFlowMobileNav />
      </div>
    </div>
  );
}
