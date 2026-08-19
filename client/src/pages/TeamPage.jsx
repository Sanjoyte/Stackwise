import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LogOut,
  Plus,
  Users,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import BrandMark from "../components/BrandMark";
import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";
import { useAuth } from "../context/AuthContext";

import CreateOrJoinTeamCard from "../components/team/CreateOrJoinTeamCard";
import RequestFormModal from "../components/team/RequestFormModal";
import RequestDetailModal from "../components/team/RequestDetailModal";
import RequestListItem from "../components/team/RequestListItem";

import {
  createTeam,
  getMyTeams,
  joinTeam,
  activateTeam,
  regenerateInviteCode,
} from "../api/teamApi";
import {
  approveTeamRequest,
  createTeamRequest,
  listTeamRequests,
  rejectTeamRequest,
  requestTeamRequestModification,
  updateTeamRequest,
} from "../api/teamRequestApi";
import { formatCurrency } from "../utils/formatCurrency";
import { initiateTeamRequestPayment } from "../api/paymentApi";

import "../styles/cashFlow.css";
import "../styles/team.css";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "modification_requested", label: "Needs changes" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function TeamPage() {
  const { user, logout } = useAuth();

  const [team, setTeam] = useState(undefined); // undefined = loading, null = no team
  const [teams, setTeams] = useState([]);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState("");

  const [requests, setRequests] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const [copyState, setCopyState] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const [activeRequest, setActiveRequest] = useState(null);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError("");

    try {
      const data = await getMyTeams();
      const availableTeams = data.teams || [];
      const activeTeam =
        availableTeams.find(
          (item) => String(item.id) === String(data.activeTeamId)
        ) || availableTeams[0] || null;

      setTeams(availableTeams);
      setTeam(activeTeam);

      if (availableTeams.length === 0) {
        setShowTeamManager(false);
      }
    } catch (error) {
      setTeamError(
        error?.response?.data?.message || "Could not load your teams"
      );
      setTeams([]);
      setTeam(null);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const loadRequests = useCallback(
    async (status) => {
      setRequestsLoading(true);
      try {
        const data = await listTeamRequests(status);
        setRequests(data.requests || []);
        setIsAdmin(Boolean(data.isAdmin));
      } catch {
        setRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    if (team) {
      loadRequests(statusFilter);
    }
  }, [team, statusFilter, loadRequests]);

  const refreshAll = async () => {
    await loadTeam();
    await loadRequests(statusFilter);
  };

  const handleCreateTeam = async (payload) => {
    const data = await createTeam(payload);
    setTeam(data.team);
    setShowTeamManager(false);
    await loadTeam();
  };

  const handleJoinTeam = async (payload) => {
    const data = await joinTeam(payload);
    setTeam(data.team);
    setShowTeamManager(false);
    await loadTeam();
  };

  const handleSwitchTeam = async (teamId) => {
    const data = await activateTeam(teamId);
    setTeam(data.team);
    setStatusFilter("");
    await refreshAll();
  };

  const handleCopyInvite = async () => {
    if (!team?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 1600);
    } catch {
      // clipboard may be unavailable; silently ignore
    }
  };

  const handleRegenerate = async () => {
    setRegenBusy(true);
    try {
      const data = await regenerateInviteCode();
      setTeam((prev) => ({ ...prev, inviteCode: data.team.inviteCode }));
    } finally {
      setRegenBusy(false);
    }
  };

  const openNewRequest = () => {
    setEditingRequest(null);
    setFormOpen(true);
  };

  const openEditRequest = (request) => {
    setActiveRequest(null);
    setEditingRequest(request);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (editingRequest) {
      await updateTeamRequest(editingRequest.id, payload);
    } else {
      await createTeamRequest(payload);
    }
    setFormOpen(false);
    setEditingRequest(null);
    await refreshAll();
  };

  const openDetail = (request) => setActiveRequest(request);
  const closeDetail = () => setActiveRequest(null);

  const withRefresh = (fn) => async (...args) => {
    const result = await fn(...args);
    await refreshAll();
    setActiveRequest(null);
    return result;
  };

  const handleApprove = withRefresh((id) => approveTeamRequest(id));
  const handlePay = async (id) => {
    const data = await initiateTeamRequestPayment(id);
    if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
    return data;
  };
  const handleReject = withRefresh((id, message) =>
    rejectTeamRequest(id, message)
  );
  const handleRequestModification = withRefresh((id, message) =>
    requestTeamRequestModification(id, message)
  );

  const currentUserId = user?.id;

  const activeRequestPermissions = useMemo(() => {
    if (!activeRequest) return { isOwner: false };
    return {
      isOwner: activeRequest.requestedBy === currentUserId,
    };
  }, [activeRequest, currentUserId]);

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f7f4ff] px-5 py-7 pb-24 sm:px-8 sm:pb-7">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
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

            <section className="py-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                <Users size={14} />
                Team
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {team ? team.name : "Your team"}
              </h1>
              <p className="mt-2 max-w-2xl text-slate-500">
                Work across multiple teams, submit requests, approve them independently, and optionally pay approved requests through the real gateway.
              </p>

              {!teamLoading && teams.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-4">
                  <span className="text-sm font-semibold text-slate-500">Active team</span>
                  <select value={team?.id || ""} onChange={(e) => handleSwitchTeam(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                    {teams.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.viewerRole}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowTeamManager((v) => !v)} className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-100">
                    {showTeamManager ? "Close" : "Create / Join another team"}
                  </button>
                </div>
              )}

              {!teamLoading && showTeamManager && (
                <div className="mt-5">
                  <CreateOrJoinTeamCard onCreate={handleCreateTeam} onJoin={handleJoinTeam} defaultCurrency={user?.baseCurrency || "USD"} />
                </div>
              )}

              {teamLoading && (
                <div className="mt-10 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin" />
                  Loading your team...
                </div>
              )}

              {!teamLoading && teamError && (
                <p className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {teamError}
                </p>
              )}

              {!teamLoading && !teamError && team === null && (
                <div className="mt-10">
                  <CreateOrJoinTeamCard
                    onCreate={handleCreateTeam}
                    onJoin={handleJoinTeam}
                    defaultCurrency={user?.baseCurrency || "USD"}
                  />
                </div>
              )}

              {!teamLoading && !teamError && team && (
                <>
                  {/* Team overview */}
                  <div className="mt-8 grid gap-5 md:grid-cols-3">
                    <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                      <Wallet className="text-indigo-500" />
                      <p className="mt-5 text-sm text-slate-400">
                        Monthly budget
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatCurrency(team.monthlyBudget, team.currency)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatCurrency(team.currentSpending, team.currency)}{" "}
                        spent ·{" "}
                        {formatCurrency(team.remainingBudget, team.currency)}{" "}
                        remaining
                      </p>
                    </article>

                    <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                      <ShieldCheck className="text-indigo-500" />
                      <p className="mt-5 text-sm text-slate-400">
                        Your role
                      </p>
                      <p className="mt-2 text-2xl font-bold capitalize text-slate-900">
                        {team.viewerRole === "admin" ? "Team Admin" : "Member"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {team.members?.length || 0} member
                        {team.members?.length === 1 ? "" : "s"}
                      </p>
                    </article>

                    <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                      <Users className="text-indigo-500" />
                      <p className="mt-5 text-sm text-slate-400">
                        Invitation code
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-2xl font-bold tracking-widest text-slate-900">
                          {team.inviteCode}
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                          title="Copy invitation code"
                        >
                          {copyState ? (
                            <Check size={16} className="text-emerald-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                      {team.viewerRole === "admin" && (
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          disabled={regenBusy}
                          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 disabled:opacity-60"
                        >
                          <RefreshCw
                            size={12}
                            className={regenBusy ? "animate-spin" : ""}
                          />
                          Generate new code
                        </button>
                      )}
                    </article>
                  </div>

                  {/* Members list */}
                  {team.members?.length > 0 && (
                    <div className="mt-6 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                      <p className="text-sm font-bold text-slate-700">
                        Team members
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {team.members.map((member) => (
                          <span
                            key={member.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                          >
                            {member.name}
                            {member.role === "admin" && (
                              <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                                Admin
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requests */}
                  <div className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-bold text-slate-900">
                        {isAdmin ? "Team requests" : "Your requests"}
                      </h2>
                      <button
                        type="button"
                        onClick={openNewRequest}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        <Plus size={16} />
                        New request
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUS_FILTERS.map((filter) => (
                        <button
                          key={filter.value || "all"}
                          type="button"
                          onClick={() => setStatusFilter(filter.value)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                            statusFilter === filter.value
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-200"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      {requestsLoading && (
                        <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                          <Loader2 size={18} className="animate-spin" />
                          Loading requests...
                        </div>
                      )}

                      {!requestsLoading && requests.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/60 px-6 py-12 text-center text-sm text-slate-400">
                          No requests yet. Click "New request" to submit a
                          tool subscription or business expense for review.
                        </div>
                      )}

                      {!requestsLoading &&
                        requests.map((request) => (
                          <RequestListItem
                            key={request.id}
                            request={request}
                            onClick={() => openDetail(request)}
                          />
                        ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      <CashFlowMobileNav />

      <RequestFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRequest(null);
        }}
        onSubmit={handleFormSubmit}
        initialRequest={editingRequest}
        defaultCurrency={team?.currency || user?.baseCurrency || "USD"}
      />

      <RequestDetailModal
        open={Boolean(activeRequest)}
        onClose={closeDetail}
        request={activeRequest}
        isAdmin={isAdmin}
        isOwner={activeRequestPermissions.isOwner}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestModification={handleRequestModification}
        onEditResubmit={openEditRequest}
        onPay={handlePay}
      />
    </div>
  );
}
