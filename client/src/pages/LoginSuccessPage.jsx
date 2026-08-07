import { useNavigate } from "react-router";
import {
  LogOut,
  Sparkles,
  WalletCards,
  ArrowRight,
} from "lucide-react";

import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";

export default function LoginSuccessPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#f7f4ff] px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-6xl">
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

        <section className="py-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            <Sparkles size={14} />
            Login successful
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Welcome, {user?.name}
          </h1>

          <p className="mt-4 max-w-2xl text-slate-500">
            Your Stackwise authentication system
            is working. Module 1 subscription
            features will be placed on this
            dashboard.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                label: "Account email",
                value: user?.email,
              },
              {
                label: "Base currency",
                value:
                  user?.baseCurrency || "BDT",
              },
              {
                label: "Account role",
                value:
                  user?.role || "individual",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm"
              >
                <WalletCards className="text-indigo-500" />

                <p className="mt-5 text-sm text-slate-400">
                  {item.label}
                </p>

                <p className="mt-2 break-words font-bold text-slate-900">
                  {item.value}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Go to Subscription Dashboard
              <ArrowRight size={20} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}