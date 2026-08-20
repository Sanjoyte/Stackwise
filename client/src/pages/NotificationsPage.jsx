import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Mail,
  RefreshCw,
  Save,
  Send,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  fetchNotificationSettings,
  previewNotifications,
  runNotifications,
  saveNotificationSettings,
} from "../api/notificationApi";
import {
  CashFlowMobileNav,
  CashFlowSidebar,
} from "../components/cashflow/CashFlowNav";
import "../styles/cashFlow.css";

const defaults = {
  recipientEmail: "",
  enabled: true,
  subscriptionRenewals: true,
  taxDeadlines: true,
  spendingSpikes: true,
  reminderDays: 7,
  spikeMultiplier: 1.5,
};

const alertIcon = {
  subscription: CalendarClock,
  tax: TriangleAlert,
  spending_spike: TrendingUp,
};

const formatTimestamp = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not sent yet";

export default function NotificationsPage() {
  const [settings, setSettings] = useState(defaults);
  const [alerts, setAlerts] = useState([]);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchNotificationSettings();
      setSettings({ ...defaults, ...data.settings });
      setAlerts(data.alerts || []);
      setGmailConfigured(data.gmailConfigured);
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Unable to load notification settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadSettings();
    });
  }, []);

  const updateSetting = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveNotificationSettings({
        ...settings,
        reminderDays: Number(settings.reminderDays),
        spikeMultiplier: Number(settings.spikeMultiplier),
      });
      setSettings({ ...defaults, ...saved });
      setNotice({ type: "success", text: "Notification settings saved." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Unable to save notification settings." });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setNotice(null);
    try {
      const data = await previewNotifications();
      setGmailConfigured(data.gmailConfigured);
      setAlerts(data.alerts || []);
      setNotice({ type: "success", text: data.alerts.length ? `${data.alerts.length} alert${data.alerts.length === 1 ? "" : "s"} currently qualify.` : "No alerts currently qualify." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Unable to preview alerts." });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSendNow = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const data = await runNotifications();
      const sentCount = data.alerts.filter((alert) => alert.status === "sent").length;
      setNotice({ type: "success", text: sentCount ? `${sentCount} Gmail alert${sentCount === 1 ? "" : "s"} sent.` : "No new qualifying alerts to send." });
      await loadSettings();
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Unable to send alerts. Check the Gmail API configuration." });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="cf-page">
      <CashFlowSidebar />
      <div className="cf-workspace">
      <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-7 pb-28">
          <section className="flex flex-col gap-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <BellRing size={14} /> Alert center
              </div>
              <h1 className="mt-4 text-3xl font-extrabold">Notifications & reminders</h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100">Get Gmail alerts before subscription renewals and US tax due dates, and when category spending exceeds its monthly budget.</p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${gmailConfigured ? "border-emerald-200/60 bg-emerald-400/15 text-emerald-50" : "border-amber-200/60 bg-amber-400/15 text-amber-50"}`}>
              {gmailConfigured ? "Gmail API connected" : "Gmail API needs server setup"}
            </div>
          </section>

          {notice && (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {notice.text}
            </div>
          )}

          <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <form onSubmit={(event) => { event.preventDefault(); handleSave(); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Email delivery settings</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose what Stackwise monitors and where reminders go.</p>
                </div>
                <Mail className="text-indigo-500" size={24} />
              </div>

              <label className="mt-6 block text-sm font-semibold text-slate-700">
                Notification email
                <input value={settings.recipientEmail} onChange={(event) => updateSetting("recipientEmail", event.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </label>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Reminder window (days)
                  <input value={settings.reminderDays} onChange={(event) => updateSetting("reminderDays", event.target.value)} type="number" min="1" max="60" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ["enabled", "Enable email notifications", "Pause or resume every automatic reminder."],
                  ["subscriptionRenewals", "Subscription renewals", "Active subscriptions renewing within your reminder window."],
                  ["taxDeadlines", "Tax deadline reminders", "US estimated quarterly and annual filing dates; confirm dates for your jurisdiction."],
                  ["spendingSpikes", "Category budget alerts", "Sent when a category's monthly spending exceeds its budget."],
                ].map(([field, label, description]) => (
                  <label key={field} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 p-3.5 hover:bg-slate-50">
                    <input checked={Boolean(settings[field])} onChange={(event) => updateSetting(field, event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" />
                    <span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span>
                  </label>
                ))}
              </div>

              <button disabled={saving || loading} type="submit" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Save settings
              </button>
            </form>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6">
                <h2 className="text-lg font-bold text-slate-900">Check alerts</h2>
                <p className="mt-2 text-sm text-slate-600">Preview conditions without email, or deliver only new qualifying alerts now.</p>
                <button onClick={handlePreview} disabled={previewing || loading} type="button" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
                  {previewing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Preview alerts
                </button>
                <button onClick={handleSendNow} disabled={running || loading || !gmailConfigured} type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {running ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} Send new alerts now
                </button>
              </div>
              {!gmailConfigured && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800"><p className="font-bold">Server configuration required</p><p className="mt-2 text-xs leading-5">Add `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and a `GMAIL_REFRESH_TOKEN` with the `gmail.send` scope to `server/.env`, then restart the server.</p></div>}
            </aside>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="text-lg font-bold text-slate-900">Alert activity</h2><p className="mt-1 text-sm text-slate-500">Preview results or your most recent delivery attempts.</p></div>
              <button onClick={loadSettings} type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Refresh alert activity"><RefreshCw size={18} /></button>
            </div>
            {loading ? <div className="py-12 text-center text-sm text-slate-500">Loading notification activity...</div> : alerts.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">No pending or sent alerts yet.</div> : <div className="mt-5 space-y-3">{alerts.map((alert, index) => { const Icon = alertIcon[alert.type] || BellRing; return <article key={alert._id || alert.fingerprint || index} className="flex gap-4 rounded-2xl border border-slate-100 p-4"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icon size={19} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-800">{alert.title}</h3>{alert.status && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${alert.status === "sent" ? "bg-emerald-100 text-emerald-700" : alert.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{alert.status.replace("_", " ")}</span>}</div><p className="mt-1 text-sm text-slate-600">{alert.message}</p><p className="mt-2 text-xs text-slate-400">{formatTimestamp(alert.sentAt || alert.updatedAt)}</p></div></article>; })}</div>}
          </section>
        </div>
      </main>
      </div>
      <CashFlowMobileNav />
    </div>
  );
}
