import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const demoForm = {
  name: "",
  email: "demo@stackwise.com",
  password: "password123",
  confirmPassword: "",
};

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";

  const navigate = useNavigate();

  const { login, signup } = useAuth();

  const [form, setForm] =
    useState(isSignup ? emptyForm : demoForm);

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    setForm(isSignup ? emptyForm : demoForm);
    setError("");
    setShowPassword(false);
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    if (
      isSignup &&
      form.name.trim().length < 2
    ) {
      return "Please enter your full name";
    }

    if (!form.email.trim()) {
      return "Please enter your email address";
    }

    if (form.password.length < 8) {
      return "Password must contain at least 8 characters";
    }

    if (
      isSignup &&
      form.password !== form.confirmPassword
    ) {
      return "The passwords do not match";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isSignup) {
        await signup({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        });
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data
          ?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f4ff] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <MarketingPanel />

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[470px]">
          <div className="mb-8 lg:hidden">
            <BrandMark darkText />
          </div>

          <div className="rounded-[30px] border border-indigo-100 bg-white p-6 shadow-[0_28px_80px_rgba(79,70,229,0.12)] sm:p-9">
            <div className="mb-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
                {isSignup
                  ? "Start using Stackwise"
                  : "Welcome back"}
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {isSignup
                  ? "Create your account"
                  : "Log in to your account"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {isSignup
                  ? "Track your subscriptions and make smarter financial decisions."
                  : "Continue managing your subscriptions and finances."}
              </p>
            </div>

            <div className="mb-7 grid grid-cols-2 rounded-2xl bg-[#f1effa] p-1">
              <Link
                to="/login"
                className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                  !isSignup
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-indigo-600"
                }`}
              >
                Login
              </Link>

              <Link
                to="/signup"
                className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                  isSignup
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-indigo-600"
                }`}
              >
                Sign up
              </Link>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
            >
              {isSignup && (
                <FormField
                  label="Full name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  icon={UserRound}
                />
              )}

              <FormField
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
                autoComplete="email"
                icon={Mail}
              />

              <PasswordField
                label="Password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={
                  isSignup
                    ? "Create at least 8 characters"
                    : "Enter your password"
                }
                autoComplete={
                  isSignup
                    ? "new-password"
                    : "current-password"
                }
                showPassword={showPassword}
                togglePassword={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
              />

              {isSignup && (
                <PasswordField
                  label="Confirm password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Enter the password again"
                  autoComplete="new-password"
                  showPassword={showPassword}
                  togglePassword={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                />
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Please wait..."
                  : isSignup
                    ? "Create Stackwise account"
                    : "Log in securely"}

                {!submitting && (
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck
                size={15}
                className="text-emerald-500"
              />

              Secure account authentication
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 Stackwise. Smarter
            subscriptions, clearer finances.
          </p>
        </div>
      </section>
    </main>
  );
}

function MarketingPanel() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#3326a8] via-[#5441d7] to-[#7862ec] p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-pink-300/15 blur-3xl" />

      <BrandMark />

      <div className="relative z-10 my-auto">
        <div className="mb-8 max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]">
            <Sparkles size={15} />
            Smart finance workspace
          </div>

          <h2 className="text-5xl font-bold leading-tight tracking-tight">
            All your subscriptions.
            <br />
            One smarter view.
          </h2>

          <p className="mt-5 max-w-lg text-base leading-7 text-indigo-100">
            Understand your recurring costs,
            discover overlapping tools and keep
            every renewal under control.
          </p>
        </div>

        <div className="max-w-[620px] rounded-[28px] border border-white/20 bg-white/95 p-5 text-slate-900 shadow-2xl backdrop-blur">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Cash Flow Overview
              </p>

              <p className="mt-1 text-2xl font-bold">
                $12,450.00
              </p>
            </div>

            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <WalletCards size={21} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              icon={TrendingUp}
              label="Total income"
              value="$18,400"
              classes="border-emerald-200 bg-emerald-50 text-emerald-600"
            />

            <SummaryCard
              icon={WalletCards}
              label="Total out"
              value="$5,950"
              classes="border-red-200 bg-red-50 text-red-500"
            />

            <SummaryCard
              icon={ShieldCheck}
              label="Net profit"
              value="$12,450"
              classes="border-indigo-200 bg-indigo-50 text-indigo-600"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-[#f8f7fc] px-5 pb-4 pt-6">
            <div className="flex h-32 items-end justify-around gap-5">
              {[56, 69, 61, 84, 77].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex h-full items-end gap-1"
                  >
                    <div
                      className="w-3 rounded-t bg-emerald-500"
                      style={{
                        height: `${height}%`,
                      }}
                    />

                    <div
                      className="w-3 rounded-t bg-red-400"
                      style={{
                        height: `${Math.max(
                          height - 18,
                          30
                        )}%`,
                      }}
                    />

                    <div
                      className="w-3 rounded-t bg-indigo-600"
                      style={{
                        height: `${Math.max(
                          height - 35,
                          20
                        )}%`,
                      }}
                    />
                  </div>
                )
              )}
            </div>

            <div className="mt-3 flex justify-around text-[10px] text-slate-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  classes,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${classes}`}
    >
      <Icon size={17} />

      <p className="mt-3 text-[10px] font-semibold uppercase">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  ...inputProps
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="relative">
        <Icon
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          {...inputProps}
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />
      </div>
    </label>
  );
}

function PasswordField({
  label,
  showPassword,
  togglePassword,
  ...inputProps
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="relative">
        <LockKeyhole
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          {...inputProps}
          type={
            showPassword
              ? "text"
              : "password"
          }
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />

        <button
          type="button"
          onClick={togglePassword}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-indigo-600"
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >
          {showPassword ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </label>
  );
}