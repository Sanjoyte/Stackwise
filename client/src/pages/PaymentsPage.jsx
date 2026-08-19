import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CreditCard, Loader2, ShieldCheck, ReceiptText } from "lucide-react";
import BrandMark from "../components/BrandMark";
import { CashFlowSidebar, CashFlowMobileNav } from "../components/cashflow/CashFlowNav";
import { getPayments } from "../api/paymentApi";
import { formatCurrency } from "../utils/formatCurrency";
import "../styles/cashFlow.css";

const badge = (status) => ({
  paid: "bg-emerald-100 text-emerald-700",
  initiated: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
}[status] || "bg-slate-100 text-slate-600");

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    getPayments().then((data) => setPayments(data.payments || []))
      .catch((err) => setError(err?.response?.data?.message || "Could not load payment history"))
      .finally(() => setLoading(false));
  }, []);

  const paidCount = useMemo(() => payments.filter((p) => p.status === "paid").length, [payments]);
  const callbackStatus = searchParams.get("payment");

  return (
    <div className="cf-page">
      <CashFlowSidebar />
      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f7f4ff] px-5 py-7 pb-24 sm:px-8 sm:pb-7">
          <div className="mx-auto max-w-6xl">
            <header className="rounded-3xl border border-indigo-100 bg-white px-6 py-5 shadow-sm"><BrandMark darkText /></header>
            <section className="py-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600"><CreditCard size={14}/> Payments</div>
              <h1 className="mt-6 text-4xl font-bold text-slate-900">Payment history</h1>
              <p className="mt-2 text-slate-500">Real gateway transactions made through Stackwise. Only validated payments are shown as paid.</p>

              {callbackStatus && (
                <div className={`mt-6 rounded-2xl px-5 py-4 text-sm font-semibold ${callbackStatus === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {callbackStatus === "success" ? "Payment completed and verified successfully." : `Payment ${callbackStatus}. No successful payment was recorded.`}
                </div>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-indigo-100 bg-white p-5"><ReceiptText className="text-indigo-500"/><p className="mt-4 text-sm text-slate-400">Transactions</p><p className="text-2xl font-bold">{payments.length}</p></div>
                <div className="rounded-3xl border border-indigo-100 bg-white p-5"><ShieldCheck className="text-emerald-500"/><p className="mt-4 text-sm text-slate-400">Verified paid</p><p className="text-2xl font-bold">{paidCount}</p></div>
                <div className="rounded-3xl border border-indigo-100 bg-white p-5"><CreditCard className="text-indigo-500"/><p className="mt-4 text-sm text-slate-400">Gateway</p><p className="text-xl font-bold">SSLCOMMERZ</p></div>
              </div>

              {loading && <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin"/></div>}
              {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-600">{error}</p>}
              {!loading && !error && (
                <div className="mt-8 overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Transaction</th><th className="px-5 py-4">Date</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => <tr key={p._id}>
                          <td className="px-5 py-4 font-semibold text-slate-900">{p.title}</td>
                          <td className="px-5 py-4 capitalize text-slate-500">{p.sourceType.replace("_", " ")}</td>
                          <td className="px-5 py-4 font-semibold">{formatCurrency(p.amount, p.currency)}</td>
                          <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badge(p.status)}`}>{p.status}</span></td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-500">{p.transactionId}</td>
                          <td className="px-5 py-4 text-slate-500">{new Date(p.paidAt || p.createdAt).toLocaleString()}</td>
                        </tr>)}
                        {payments.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center text-slate-400">No payment transactions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <CashFlowMobileNav />
    </div>
  );
}
