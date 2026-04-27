import React, { useState, useEffect, useCallback } from "react";
import ApiService from "../../services/api";
import RoomIssueReporter from "./RoomIssueReporter";

// ── Category config (mirrors backend + reporter) ─────────────────────────────
const CATEGORIES = [
  { id: "electricity_fault", label: "Electricity Fault", emoji: "⚡", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { id: "window_damage",     label: "Window Damage",    emoji: "🪟", bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-200"   },
  { id: "bench_damaged",     label: "Bench Damaged",    emoji: "🪑", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { id: "fan_damaged",       label: "Fan Damaged",      emoji: "🌀", bg: "bg-cyan-100",   text: "text-cyan-800",   border: "border-cyan-200"   },
  { id: "other",             label: "Other",            emoji: "📌", bg: "bg-gray-100",   text: "text-gray-700",   border: "border-gray-200"   },
];

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "bg-red-100 text-red-700 border-red-200",         dot: "bg-red-500",    emoji: "🔴" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500",  emoji: "🟡" },
  resolved:    { label: "Resolved",    color: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500",  emoji: "🟢" },
  dismissed:   { label: "Dismissed",   color: "bg-gray-100 text-gray-500 border-gray-200",      dot: "bg-gray-400",   emoji: "⚪" },
};

const getCategoryMeta = (id) => CATEGORIES.find(c => c.id === id) || { label: id, emoji: "❓", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };

// ── Filter tabs ──────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { id: "all",         label: "All",         emoji: "📋" },
  { id: "pending",     label: "Pending",     emoji: "🔴" },
  { id: "in_progress", label: "In Progress", emoji: "🟡" },
  { id: "resolved",    label: "Resolved",    emoji: "🟢" },
];

// ── Main Board ───────────────────────────────────────────────────────────────
export default function RoomIssuesBoard() {
  const [issues, setIssues]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showReporter, setShowReporter] = useState(false);
  const [expandedId, setExpandedId]     = useState(null);
  const [error, setError]               = useState("");

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters = activeFilter !== "all" ? { status: activeFilter } : {};
      const data = await ApiService.getRoomIssues(filters);
      setIssues(data?.issues || []);
    } catch (e) {
      setError("Failed to load room issues. Please refresh.");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  // Stats derived from all issues (shown at top)
  const [allStats, setAllStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0 });
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await ApiService.getRoomIssues({});
        const all = data?.issues || [];
        setAllStats({
          total:       all.length,
          pending:     all.filter(i => i.status === "pending").length,
          in_progress: all.filter(i => i.status === "in_progress").length,
          resolved:    all.filter(i => i.status === "resolved").length,
        });
      } catch { /* silently ignore */ }
    };
    fetchStats();
  }, [issues]); // re-run when issues change

  return (
    <div className="space-y-6">
      {/* ── Header + CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            🔧 Room Issues Board
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Track and report classroom maintenance issues — visible to all teachers
          </p>
        </div>
        <button
          onClick={() => setShowReporter(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}
        >
          🚨 Report an Issue
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: allStats.total,       color: "from-slate-50 to-slate-100",   text: "text-slate-700",  emoji: "📋" },
          { label: "Pending",     value: allStats.pending,     color: "from-red-50 to-red-100",       text: "text-red-700",    emoji: "🔴" },
          { label: "In Progress", value: allStats.in_progress, color: "from-amber-50 to-amber-100",   text: "text-amber-700",  emoji: "🟡" },
          { label: "Resolved",    value: allStats.resolved,    color: "from-green-50 to-green-100",   text: "text-green-700",  emoji: "🟢" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl p-3 bg-gradient-to-br ${stat.color} border border-white/80`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{stat.emoji}</span>
              <span className={`text-xs font-semibold ${stat.text}`}>{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.text}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: "rgba(15,23,42,0.06)" }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeFilter === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 rounded-2xl animate-pulse bg-gradient-to-r from-slate-100 to-slate-50" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && issues.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(15,23,42,0.03)", border: "2px dashed rgba(99,102,241,0.2)" }}>
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-slate-700">
            {activeFilter === "all" ? "No issues reported!" : `No ${activeFilter.replace("_", " ")} issues`}
          </h3>
          <p className="text-sm text-slate-400 mt-1">All rooms are in good shape — or be the first to report.</p>
          <button
            onClick={() => setShowReporter(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
          >
            🚨 Report an Issue
          </button>
        </div>
      )}

      {/* ── Issue cards ── */}
      {!loading && issues.length > 0 && (
        <div className="space-y-3">
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isExpanded={expandedId === issue.id}
              onToggle={() => setExpandedId(prev => prev === issue.id ? null : issue.id)}
            />
          ))}
        </div>
      )}

      {/* ── Reporter modal ── */}
      <RoomIssueReporter
        isOpen={showReporter}
        onClose={() => setShowReporter(false)}
        onIssueSubmitted={loadIssues}
      />
    </div>
  );
}

// ── Single Issue Card ────────────────────────────────────────────────────────
function IssueCard({ issue, isExpanded, onToggle }) {
  const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.pending;

  return (
    <div
      className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      style={{ borderColor: "rgba(99,102,241,0.12)" }}
    >
      {/* Card top strip — status color */}
      <div
        className="h-1 w-full"
        style={{
          background:
            issue.status === "pending"     ? "linear-gradient(90deg,#ef4444,#f97316)" :
            issue.status === "in_progress" ? "linear-gradient(90deg,#f59e0b,#eab308)" :
            issue.status === "resolved"    ? "linear-gradient(90deg,#22c55e,#16a34a)" :
                                             "linear-gradient(90deg,#94a3b8,#64748b)",
        }}
      />

      <div className="p-4">
        {/* Row 1: room + status + time */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: "rgba(99,102,241,0.08)" }}>
              🏫
            </div>
            <div>
              <p className="font-bold text-slate-900 text-base leading-tight">{issue.room_name}</p>
              <p className="text-xs text-slate-400">Reported by {issue.reporter_name} · {issue.time_ago}</p>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Row 2: Category chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {issue.issue_categories.map(catId => {
            const cat = getCategoryMeta(catId);
            return (
              <span key={catId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}>
                {cat.emoji} {cat.label}
              </span>
            );
          })}
        </div>

        {/* Row 3: Remarks preview */}
        {issue.remarks && (
          <p className={`mt-2 text-sm text-slate-600 leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>
            💬 {issue.remarks}
          </p>
        )}

        {/* Expanded: admin notes + resolver */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {issue.admin_notes && (
              <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.07)" }}>
                <p className="font-semibold text-indigo-800 mb-0.5">📋 Admin Notes</p>
                <p className="text-slate-700">{issue.admin_notes}</p>
              </div>
            )}
            {issue.resolver_name && issue.resolved_at && (
              <p className="text-xs text-slate-400">
                ✅ Resolved by {issue.resolver_name} on {new Date(issue.resolved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
            {!issue.admin_notes && !issue.resolver_name && (
              <p className="text-xs text-slate-400 italic">No admin response yet.</p>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="mt-2 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          {isExpanded ? "▲ Show less" : "▼ Show details"}
        </button>
      </div>
    </div>
  );
}
