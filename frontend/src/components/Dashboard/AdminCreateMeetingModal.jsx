import React, { useState, useEffect } from "react";
import { Video, X, Users, GraduationCap, MapPin, Clock, ExternalLink, Calendar, BookOpen, AlertCircle } from "lucide-react";
import ApiService from "../../services/api";

export default function AdminCreateMeetingModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    audience_role: "all", // all, teachers, students
    dept_id: "",
    year: "", // New: For student targeting
    section_id: "",
    start_time: "",
    manual_link: "",
    is_instant: true
  });
  
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Set default time to now
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setFormData(prev => ({ 
        ...prev, 
        start_time: now.toISOString().slice(0, 16),
        is_instant: true
      }));
      setError("");

      // Load data for dropdowns
      const fetchData = async () => {
        try {
          const [sectionsRes, deptsRes, statusRes] = await Promise.all([
            ApiService.getSections(),
            ApiService.getDepartments(),
            ApiService.getCalendarStatus()
          ]);
          
          if (Array.isArray(sectionsRes)) {
            setSections(sectionsRes);
          } else if (sectionsRes && sectionsRes.sections) {
            setSections(sectionsRes.sections);
          }
          
          if (Array.isArray(deptsRes)) {
            setDepartments(deptsRes);
          } else if (deptsRes && deptsRes.departments) {
            setDepartments(deptsRes.departments);
          }

          if (statusRes && statusRes.is_connected) {
            setIsGoogleConnected(true);
          } else {
            setIsGoogleConnected(false);
          }
        } catch (err) {
          console.error("Failed to load metadata", err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let finalStartTime = formData.start_time;
      if (formData.is_instant) {
        finalStartTime = new Date().toISOString();
      } else {
        finalStartTime = new Date(formData.start_time).toISOString();
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        audience_role: formData.audience_role,
        dept_id: formData.dept_id || null,
        year: formData.year || null,
        section_id: formData.section_id || null,
        start_time: finalStartTime,
        manual_link: formData.manual_link || null
      };

      await ApiService.adminCreateMeeting(payload);

      alert("Meeting/Broadcast created successfully!");
      onClose();
      // Reset
      setFormData({
        title: "",
        description: "",
        audience_role: "all",
        dept_id: "",
        year: "",
        section_id: "",
        start_time: "",
        manual_link: "",
        is_instant: true
      });
    } catch (err) {
      setError(err.message || "Failed to create meeting");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold">New Meeting Broadcast</h3>
              <p className="text-blue-100 text-sm opacity-90">Schedule or start an instant session</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                placeholder="e.g. Faculty General Meeting"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Description</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                rows="2"
                placeholder="What is this meeting about?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  formData.is_instant 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : 'text-slate-600 hover:bg-white/50'
                }`}
                onClick={() => setFormData({ ...formData, is_instant: true })}
              >
                <Clock className="w-4 h-4" /> Start Now
              </button>
              <button
                type="button"
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  !formData.is_instant 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-600 hover:bg-white/50'
                }`}
                onClick={() => setFormData({ ...formData, is_instant: false })}
              >
                <Calendar className="w-4 h-4" /> Schedule
              </button>
            </div>

            {!formData.is_instant && (
              <div className="space-y-2 group animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-semibold text-slate-700 ml-1">Start Time <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required={!formData.is_instant}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 ml-1">Target Audience <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'all', label: 'Everyone', icon: Users },
                  { id: 'teachers', label: 'Teachers', icon: Users },
                  { id: 'students', label: 'Students', icon: GraduationCap },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, audience_role: option.id, dept_id: "", year: "", section_id: "" })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      formData.audience_role === option.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <option.icon className="w-5 h-5" />
                    <span className="text-xs font-bold text-center leading-tight">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Conditional Filters */}
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {formData.audience_role !== 'all' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      Department {formData.audience_role === 'students' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                      value={formData.dept_id}
                      onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                      required={formData.audience_role === 'students'}
                    >
                      <option value="">{formData.audience_role === 'students' ? "Select Department..." : "All Departments"}</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.audience_role === 'students' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Year</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value, section_id: "" })}
                      >
                        <option value="">All Years</option>
                        {[1, 2, 3, 4].map(y => (
                          <option key={y} value={y}>Year {y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Section</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        value={formData.section_id}
                        disabled={!formData.year}
                        onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                      >
                        <option value="">All Sections</option>
                        {sections
                          .filter(s => 
                            (!formData.dept_id || s.dept_id == formData.dept_id) && 
                            (s.year == formData.year)
                          )
                          .map(sec => (
                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
              <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                Meeting Link
              </label>
              
              <div className="space-y-3">
                {isGoogleConnected ? (
                  <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs flex items-center gap-2 border border-green-100 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Google Calendar Connected: Meet link will be auto-generated.
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-xs flex items-center gap-2 border border-amber-100 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Google Calendar not connected. Manual link required.
                  </div>
                )}

                <div className="relative">
                  <input
                    type="url"
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder={isGoogleConnected ? "Paste manual link to override auto-generation" : "https://zoom.us/j/123..."}
                    value={formData.manual_link}
                    onChange={(e) => setFormData({ ...formData, manual_link: e.target.value })}
                    required={!isGoogleConnected}
                  />
                  <ExternalLink className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-[2] px-6 py-4 rounded-2xl font-bold text-white transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {formData.is_instant ? <Video className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                {formData.is_instant ? "Start & Broadcast Now" : "Schedule Broadcast"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
