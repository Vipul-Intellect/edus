import React, { useState, useEffect, useCallback } from "react";
import ApiService from "../../services/api";

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORY_META = {
  electricity_fault: { label: "Electricity Fault", emoji: "⚡", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  window_damage:     { label: "Window Damage",    emoji: "🪟", bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-200"   },
  bench_damaged:     { label: "Bench Damaged",    emoji: "🪑", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  fan_damaged:       { label: "Fan Damaged",      emoji: "🌀", bg: "bg-cyan-100",   text: "text-cyan-800",   border: "border-cyan-200"   },
  other:             { label: "Other",            emoji: "📌", bg: "bg-gray-100",   text: "text-gray-600",   border: "border-gray-200"   },
};

const STATUS_CONFIG = {
  pending:     { label: "Pending",     badge: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500"   },
  in_progress: { label: "In Progress", badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  resolved:    { label: "Resolved",    badge: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  dismissed:   { label: "Dismissed",   badge: "bg-gray-100 text-gray-500 border-gray-200",    dot: "bg-gray-400"  },
};

const STATUS_ACTIONS = [
  { status: "in_progress", label: "Mark In Progress", style: "bg-amber-500 hover:bg-amber-600 text-white", emoji: "🔄" },
  { status: "resolved",    label: "Mark Resolved",    style: "bg-green-500 hover:bg-green-600 text-white", emoji: "✅" },
  { status: "dismissed",   label: "Dismiss",          style: "bg-gray-400 hover:bg-gray-500 text-white",   emoji: "❌" },
  { status: "pending",     label: "Revert Pending",   style: "bg-blue-500 hover:bg-blue-600 text-white",   emoji: "🔁" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminRoomIssues() {
  const [issues, setIssues]             = useState([]);
  const [summary, setSummary]           = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [error, setError]               = useState("");
  const [activeIssueId, setActiveIssueId] = useState(null); // which card is expanded
  const [adminNotes, setAdminNotes]     = useState({});     // per-issue notes being typed
  const [actionLoading, setActionLoading] = useState({});   // per-issue action loading

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterCategory !== "all") filters.category = filterCategory;

      const data = await ApiService.getAdminRoomIssues(filters);
      setIssues(data?.issues || []);
      if (data?.summary) setSummary(data.summary);
    } catch (e) {
      setError("Failed to load room issues.");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const handleStatusChange = async (issueId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [issueId]: newStatus }));
    try {
      await ApiService.updateRoomIssueStatus(issueId, {
        status: newStatus,
        admin_notes: adminNotes[issueId] || undefined,
      });
      await loadIssues();
      // Clear the notes input for this issue
      setAdminNotes(prev => { const n = { ...prev }; delete n[issueId]; return n; });
    } catch (e) {
      setError(`Failed to update status: ${e.message}`);
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[issueId]; return n; });
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm("Permanently delete this issue report?")) return;
    setActionLoading(prev => ({ ...prev, [issueId]: "delete" }));
    try {
      await ApiService.deleteRoomIssue(issueId);
      await loadIssues();
    } catch (e) {
      setError(`Failed to delete issue: ${e.message}`);
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[issueId]; return n; });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            🔧 Room Issues Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Review and resolve classroom maintenance reports</p>
        </div>
        <button
          onClick={loadIssues}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "total",       label: "Total",       emoji: "📋", color: "from-slate-50 to-slate-100",   text: "text-slate-700"  },
          { key: "pending",     label: "Pending",     emoji: "🔴", color: "from-red-50 to-red-100",       text: "text-red-700"    },
          { key: "in_progress", label: "In Progress", emoji: "🟡", color: "from-amber-50 to-amber-100",   text: "text-amber-700"  },
          { key: "resolved",    label: "Resolved",    emoji: "🟢", color: "from-green-50 to-green-100",   text: "text-green-700"  },
          { key: "dismissed",   label: "Dismissed",   emoji: "⚪", color: "from-gray-50 to-gray-100",     text: "text-gray-600"   },
        ].map(s => (
          <div key={s.key} className={`rounded-xl p-3 bg-gradient-to-br ${s.color} border border-white/80`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span>{s.emoji}</span>
              <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.text}`}>{summary[s.key] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
          <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
            {["all", "pending", "in_progress", "resolved", "dismissed"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  filterStatus === s ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_META).map(([id, meta]) => (
              <option key={id} value={id}>{meta.emoji} {meta.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-medium">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => <div key={n} className="h-36 rounded-2xl animate-pulse bg-slate-100" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && issues.length === 0 && !error && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-slate-700">No issues found</h3>
          <p className="text-sm text-slate-400 mt-1">Adjust filters or check back later.</p>
        </div>
      )}

      {/* Issue cards */}
      {!loading && issues.length > 0 && (
        <div className="space-y-4">
          {issues.map(issue => {
            const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.pending;
            const isExpanded = activeIssueId === issue.id;
            const isActioning = !!actionLoading[issue.id];

            return (
              <div
                key={issue.id}
                className="rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all overflow-hidden"
                style={{ borderColor: "rgba(99,102,241,0.15)" }}
              >
                {/* Top color strip */}
                <div className="h-1" style={{
                  background:
                    issue.status === "pending"     ? "linear-gradient(90deg,#ef4444,#f97316)" :
                    issue.status === "in_progress" ? "linear-gradient(90deg,#f59e0b,#eab308)" :
                    issue.status === "resolved"    ? "linear-gradient(90deg,#22c55e,#16a34a)" :
                                                     "linear-gradient(90deg,#94a3b8,#64748b)"
                }} />

                <div className="p-4 sm:p-5">
                  {/* Row 1: meta + status */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: "rgba(99,102,241,0.08)" }}>
                        🏫
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{issue.room_name}</p>
                        <p className="text-xs text-slate-400">
                          By {issue.reporter_name} · {issue.time_ago}
                          {issue.resolver_name && ` · Resolved by ${issue.resolver_name}`}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>

                  {/* Category chips */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {issue.issue_categories.map(catId => {
                      const cat = CATEGORY_META[catId] || { label: catId, emoji: "❓", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
                      return (
                        <span key={catId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}>
                          {cat.emoji} {cat.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Remarks */}
                  {issue.remarks && (
                    <div className="mt-3 p-3 rounded-xl text-sm text-slate-700" style={{ background: "rgba(15,23,42,0.04)" }}>
                      <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Teacher's Remarks</span>
                      <p className="mt-1 leading-relaxed">{issue.remarks}</p>
                    </div>
                  )}

                  {/* Existing admin notes */}
                  {issue.admin_notes && (
                    <div className="mt-2 p-3 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.07)" }}>
                      <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wide">Previous Admin Note</span>
                      <p className="mt-1 text-slate-700">{issue.admin_notes}</p>
                    </div>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => setActiveIssueId(prev => prev === issue.id ? null : issue.id)}
                    className="mt-3 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? "▲ Hide actions" : "▼ Take action"}
                  </button>

                  {/* Action panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      {/* Admin notes input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          📝 Admin Note (optional — sent to teacher)
                        </label>
                        <textarea
                          rows={2}
                          value={adminNotes[issue.id] || ""}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [issue.id]: e.target.value }))}
                          placeholder="e.g. Electrician scheduled for Friday, fan replacement ordered..."
                          className="w-full text-sm rounded-xl px-3 py-2 border border-slate-200 outline-none resize-none text-slate-700 placeholder-slate-300 focus:border-indigo-400 transition-colors"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {STATUS_ACTIONS
                          .filter(a => a.status !== issue.status) // Hide the current status action
                          .map(action => (
                            <button
                              key={action.status}
                              onClick={() => handleStatusChange(issue.id, action.status)}
                              disabled={isActioning}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${action.style}`}
                            >
                              {actionLoading[issue.id] === action.status ? (
                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : action.emoji}
                              {action.label}
                            </button>
                          ))
                        }
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(issue.id)}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-60 ml-auto"
                        >
                          {actionLoading[issue.id] === "delete" ? "⏳" : "🗑️"} Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
