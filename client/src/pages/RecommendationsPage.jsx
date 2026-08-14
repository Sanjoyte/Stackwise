import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeDollarSign, RefreshCw, Sparkles } from "lucide-react";
import { CashFlowMobileNav, CashFlowSidebar } from "../components/cashflow/CashFlowNav";
import { fetchAlternativeRecommendations } from "../api/recommendationApi";
import UsageProfilePanel from "../components/recommendations/UsageProfilePanel";
import "../styles/cashFlow.css";

export default function RecommendationsPage() {
  const [data, setData] = useState({ recommendations: [], baseCurrency: "USD" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setData(await fetchAlternativeRecommendations());
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load recommendations.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    fetchAlternativeRecommendations()
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Could not load recommendations."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const money = (amount) => new Intl.NumberFormat("en", { style: "currency", currency: data.baseCurrency }).format(amount || 0);

  return <div className="cf-page">
    <CashFlowSidebar />
    <div className="cf-workspace">
      <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3"><Sparkles className="text-indigo-600" /><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Smart savings</p><h1 className="text-2xl font-bold text-slate-900">Alternative tool recommendations</h1></div></div>
            <p className="mt-3 text-sm text-slate-500">Consolidation options from your other active subscriptions, validated against the master catalog and matched to the capabilities you actually use.</p>
          </header>
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
          {!loading && data.usageProfiles?.length > 0 && (
            <UsageProfilePanel
              key={data.usageProfiles.map((profile) => `${profile._id}:${profile.usagePercentage}`).join("|")}
              subscriptions={data.usageProfiles}
              onUpdated={load}
            />
          )}
          {loading ? <div className="rounded-3xl bg-white p-16 text-center text-slate-500">Finding the best matches…</div> : data.recommendations.length === 0 ?
            <div className="rounded-3xl border border-indigo-100 bg-white p-12 text-center"><BadgeDollarSign className="mx-auto text-indigo-300" size={42}/><h2 className="mt-3 font-bold text-slate-900">No savings recommendations yet</h2><p className="mt-2 text-sm text-slate-500">Add another subscription with matching capabilities, or update usage data, to receive consolidation suggestions.</p><button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><RefreshCw size={15}/> Refresh</button></div> :
            data.recommendations.map((item) => <section key={item.subscription._id} className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Replace or downgrade {item.subscription.name}</h2><p className="mt-1 text-sm text-slate-500">Flagged as {item.reasons.join(" and ")} · current monthly cost {money(item.currentMonthlyCost)}</p></div>{Number.isFinite(Number(item.subscription.usagePercentage)) && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{item.subscription.usagePercentage}% used</span>}</div>
              <div className="mt-5 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
                  <Sparkles size={13} />
                  Alternative tools
                </span>
                <div className="h-px flex-1 bg-indigo-100" />
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-3">{item.alternatives.map(({ tool, capabilityMatch, matchedCapabilities, monthlySavings, annualSavings, alternativeMonthlyCost, alreadySubscribed, existingSubscriptionName, existingSubscriptionMonthlyCost }) => <article key={tool._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between gap-2"><h3 className="font-bold text-slate-900">{tool.name}</h3><span className="text-xs font-bold text-emerald-600">Save {money(monthlySavings)}/mo</span></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{tool.description}</p><p className="mt-3 text-sm font-semibold text-slate-800">{alreadySubscribed ? `${capabilityMatch}% capability match` : `${alternativeMonthlyCost === 0 ? "Free tier" : `${money(alternativeMonthlyCost)}/mo`} · ${capabilityMatch}% match`}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">{money(annualSavings)} annual savings</p>
                {alreadySubscribed && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Existing subscription</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{existingSubscriptionName}</p>
                      <p className="text-[11px] font-medium text-slate-500">{money(existingSubscriptionMonthlyCost)}/month</p>
                    </div>
                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">No added cost</span>
                  </div>
                </div>}
                <div className="mt-3 flex flex-wrap gap-1">{matchedCapabilities.map((cap) => <span key={cap} className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold text-indigo-700">{cap}</span>)}</div>
                {tool.websiteUrl && <a href={tool.websiteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">Visit tool <ArrowUpRight size={13}/></a>}
              </article>)}</div>
            </section>)}
        </div>
      </main><CashFlowMobileNav />
    </div>
  </div>;
}
