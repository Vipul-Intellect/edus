import React, { useState, useEffect } from "react";
import ApiService from "../../services/api";

// ── Issue category config ────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "electricity_fault", label: "Electricity Fault", emoji: "⚡", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { id: "window_damage",     label: "Window Damage",    emoji: "🪟", color: "bg-blue-100 text-blue-800 border-blue-300"   },
  { id: "bench_damaged",     label: "Bench Damaged",    emoji: "🪑", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { id: "fan_damaged",       label: "Fan Damaged",      emoji: "🌀", color: "bg-cyan-100 text-cyan-800 border-cyan-300"    },
  { id: "other",             label: "Other",            emoji: "📌", color: "bg-gray-100 text-gray-700 border-gray-300"    },
];

export default function RoomIssueReporter({ isOpen, onClose, onIssueSubmitted }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      // Reset state on open
      setSelectedRoom("");
      setSelectedCategories([]);
      setRemarks("");
      setError("");
      setSuccess(false);
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      // /rooms/status is accessible to all authenticated users (teachers included).
      // /admin/rooms is admin-only and would return 403 for teachers.
      const data = await ApiService.getRoomStatus();
      // Response shape: { free_rooms: [...], occupied_rooms: [...], unmarked_rooms: [...] }
      const all = [
        ...(data?.free_rooms     || []),
        ...(data?.occupied_rooms || []),
        ...(data?.unmarked_rooms || []),
      ];
      // Normalize: status endpoint uses `room_name`, admin endpoint uses `name` — unify to `name`
      const normalized = all.map(r => ({
        room_id:  r.room_id,
        name:     r.room_name || r.name || `Room ${r.room_id}`,
        capacity: r.capacity,
      }));
      // Sort alphabetically so the dropdown is easy to scan
      normalized.sort((a, b) => a.name.localeCompare(b.name));
      setRooms(normalized);
    } catch (e) {
      console.error("Failed to load rooms:", e.message);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedRoom) { setError("Please select a room."); return; }
    if (selectedCategories.length === 0) { setError("Please select at least one issue type."); return; }

    setLoading(true);
    try {
      await ApiService.submitRoomIssue({
        room_id: parseInt(selectedRoom),
        issue_categories: selectedCategories,
        remarks: remarks.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onIssueSubmitted?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)",
          border: "1px solid rgba(167,139,250,0.3)",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(167,139,250,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "rgba(167,139,250,0.2)" }}>
                🔧
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Report Room Issue</h2>
                <p className="text-sm text-purple-300">Help keep classrooms in great shape</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-purple-300 hover:text-white hover:bg-white/10 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Success overlay */}
          {success && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-2xl"
              style={{ background: "rgba(30,27,75,0.97)" }}>
              <div className="text-6xl mb-4 animate-bounce">✅</div>
              <p className="text-xl font-bold text-white">Issue Reported!</p>
              <p className="text-purple-300 text-sm mt-1">Admin will be notified shortly.</p>
            </div>
          )}

          {/* Room selector */}
          <div>
            <label className="block text-sm font-semibold text-purple-200 mb-2">
              Select Room <span className="text-red-400">*</span>
            </label>
            {loadingRooms ? (
              <div className="w-full h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
            ) : (
              <select
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm font-medium outline-none"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(167,139,250,0.3)",
                }}
                required
              >
                <option value="" style={{ background: "#312e81" }}>— Choose a classroom —</option>
                {rooms.map(r => (
                  <option key={r.room_id} value={r.room_id} style={{ background: "#312e81" }}>
                    {r.name} {r.capacity ? `(Cap: ${r.capacity})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Issue category chips */}
          <div>
            <label className="block text-sm font-semibold text-purple-200 mb-2">
              Issue Type <span className="text-red-400">*</span>
              <span className="font-normal text-purple-400 ml-1">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const selected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                      selected
                        ? "scale-105 shadow-lg " + cat.color
                        : "border-white/20 text-white/70 hover:border-purple-400 hover:text-white"
                    }`}
                    style={!selected ? { background: "rgba(255,255,255,0.06)" } : {}}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                    {selected && <span className="ml-1 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks textarea */}
          <div>
            <label className="block text-sm font-semibold text-purple-200 mb-2">
              Detailed Remarks
              <span className="font-normal text-purple-400 ml-1">(optional — describe what's wrong)</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
              placeholder="e.g. Fan makes loud noise, 2 benches have broken legs, right window glass cracked..."
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none placeholder-purple-400/60"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(167,139,250,0.3)",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-purple-300 hover:text-white transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-60"
              style={{
                background: loading ? "rgba(139,92,246,0.5)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : "🚨 Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CATEGORIES };
