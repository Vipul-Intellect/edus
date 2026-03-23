import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ApiService from "../services/api";
import MyMeetingsModal from "../components/Dashboard/MyMeetingsModal";
import NotificationCenter from "../components/NotificationCenter";
import GoogleCalendarConnect from "../components/GoogleCalendarConnect";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Calendar, Clock, BookOpen, Target, TrendingUp,
  User, Mail, Phone, GraduationCap, MapPin, Bell,
  Settings, LogOut, AlertTriangle, ChevronRight,
  Sparkles, BookMarked, Award, Video, Radio, ExternalLink
} from "lucide-react";

export default function StudentDashboard({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ totalCourses: 0, totalClasses: 0, attendedClasses: 0, upcomingClasses: 0, cgpa: 0, attendance: 0 });
  const [timetable, setTimetable] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: "Student", email: "", department: "", year: "", semester: "", rollNumber: "", phone: "" });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMyMeetingsModal, setShowMyMeetingsModal] = useState(false);

  useEffect(() => { loadStudentData(); }, []);

  // Handle URL hashes for sidebar navigation jumps
  useEffect(() => {
    if (!isLoading) {
      if (location.hash === "#profile") {
        setShowProfileModal(true);
      } else if (location.hash === "#timetable") {
        const el = document.getElementById("weekly-timetable");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (location.hash === "#calendar") {
        const el = document.getElementById("calendar");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (location.hash === "#meetings") {
        setShowMyMeetingsModal(true);
      } else {
        setShowProfileModal(false);
      }
    }
  }, [location.hash, isLoading]);

  const loadStudentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const timetableResponse = await ApiService.getStudentTimetable();
      let timetableData = Array.isArray(timetableResponse) ? timetableResponse : (timetableResponse?.timetable || []);
      setTimetable(timetableData);
      const todayClasses = getTodayClasses(timetableData);
      const courseStats = calculateCourseStats(timetableData);
      const profile = await ApiService.getStudentProfile();
      
      let meetingsData = [];
      try {
        const meets = await ApiService.getMeetings();
        meetingsData = meets?.meetings || [];
      } catch (err) { }
      setMeetings(meetingsData);

      setStudentInfo({
        name: profile.full_name || "Student User",
        email: profile.email || "student@college.edu",
        department: profile.department || "Unknown Department",
        year: profile.year ? `${profile.year}th Year` : "Unknown Year",
        semester: profile.semester || "Current Semester",
        rollNumber: profile.roll_number || profile.username,
        phone: profile.phone || "N/A"
      });
      let attendanceData = { overall_attendance: profile.attendance || courseStats.attendancePercentage, total_classes_all: courseStats.totalClasses, attended_classes_all: courseStats.attendedClasses };
      try {
        const detailedAttendance = await ApiService.getDetailedAttendance();
        if (detailedAttendance) {
          attendanceData = { overall_attendance: detailedAttendance.overall_attendance || attendanceData.overall_attendance, total_classes_all: detailedAttendance.total_classes_all || attendanceData.total_classes_all, attended_classes_all: detailedAttendance.attended_classes_all || attendanceData.attended_classes_all };
        }
      } catch { /* use fallback */ }
      setStats({ totalCourses: courseStats.totalCourses, totalClasses: attendanceData.total_classes_all, attendedClasses: attendanceData.attended_classes_all, upcomingClasses: todayClasses.length, cgpa: 8.5, attendance: attendanceData.overall_attendance });
    } catch (error) {
      setError("Failed to load student data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayClasses = (tt) => {
    if (!Array.isArray(tt)) return [];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return tt.filter(item => item?.day?.toLowerCase() === today.toLowerCase());
  };

  const calculateCourseStats = (tt) => {
    if (!Array.isArray(tt)) return { totalCourses: 0, totalClasses: 0, attendedClasses: 0 };
    const uniqueCourses = new Set(tt.map(i => i.course)).size;
    // We only calculate total courses here. Attendance should only come from the backend.
    return { totalCourses: uniqueCourses, totalClasses: 0, attendedClasses: 0 };
  };

  const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const todayClasses = getTodayClasses(timetable);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
        <div className="bg-white rounded-3xl p-10 text-center shadow-xl max-w-md w-full border border-gray-100">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Oops!</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={loadStudentData} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">Try Again</button>
            <button onClick={onLogout} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition">Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-transparent">
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden px-6 pt-8 pb-32">
        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Greeting */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👋</span>
              <span className="text-blue-600 font-bold text-sm uppercase tracking-widest">Welcome back</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2 leading-tight">
              {greeting}, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{studentInfo.name.split(' ')[0]}!</span>
            </h1>
            <p className="text-slate-500 font-medium text-base">{currentDay} • {currentTime}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[studentInfo.department, studentInfo.year, studentInfo.semester].filter(Boolean).map((tag, i) => (
                <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{tag}</span>
              ))}
            </div>
          </div>

          {/* Action buttons - Removed since they are now in the Sidebar */}
          <div className="flex flex-wrap gap-2 hidden md:flex opacity-0 pointer-events-none">
             {/* Holding space if needed, otherwise just empty */}
          </div>
        </div>

        {/* Floating Stat Cards — overlapping the hero */}
        <div className="relative max-w-7xl mx-auto mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <HeroStatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} suffix="" color="blue" isLoading={isLoading} emoji="📚" />
          <HeroStatCard
            icon={Target} label="Attendance" value={stats.attendance} suffix="%" color={stats.attendance >= 75 ? "emerald" : "rose"} isLoading={isLoading}
            emoji={stats.attendance >= 75 ? "✅" : "⚠️"}
            subtext={stats.attendance >= 75 ? "You're on track!" : "Needs attention"}
          />
          <HeroStatCard icon={Clock} label="Today's Classes" value={todayClasses.length} suffix="" color="violet" isLoading={isLoading} emoji="🗓️" subtext={todayClasses.length === 0 ? "Free day!" : `${todayClasses.length} class${todayClasses.length > 1 ? 'es' : ''} today`} />
          <div className="cursor-pointer" onClick={() => setShowMyMeetingsModal(true)} title="View my meetings">
            <HeroStatCard icon={Video} label="My Meetings" value={meetings.length} suffix="" color="indigo" isLoading={isLoading} emoji="📹" subtext={meetings.length === 0 ? "No meetings yet" : `${meetings.length} scheduled`} />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative max-w-7xl mx-auto px-6 -mt-10 pb-12 space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Today's Schedule + Weekly Timetable */}
          <div className="lg:col-span-2 space-y-6">
            <TodaySchedule classes={todayClasses} isLoading={isLoading} />
            <div id="weekly-timetable">
              <WeeklyTimetable timetable={timetable} isLoading={isLoading} />
            </div>
          </div>

          {/* Right: Profile + Google Calendar + Announcements */}
          <div className="space-y-5">
            <ProfileSummary student={studentInfo} isLoading={isLoading} onEdit={() => setShowProfileModal(true)} />
            <div id="calendar">
              <GoogleCalendarConnect />
            </div>
            
            {meetings.length > 0 && (
              <ActiveMeetingsCard meetings={meetings} />
            )}

            <AnnouncementsCard />
          </div>
        </div>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} student={studentInfo} />
      <MyMeetingsModal 
        isOpen={showMyMeetingsModal} 
        onClose={() => {
          setShowMyMeetingsModal(false);
          if (location.hash === "#meetings") navigate('/student');
        }} 
        meetings={meetings}
      />
    </div>
  );
}

/* ─── Hero Stat Card ─── */
function HeroStatCard({ icon: Icon, label, value, suffix, color, isLoading, emoji, subtext }) {
  const colors = {
    blue:    { card: "from-blue-50 to-white", border: "border-blue-100", icon: "text-blue-600", badge: "bg-blue-100 text-blue-700", num: "text-blue-900", sub: "text-blue-600" },
    emerald: { card: "from-emerald-50 to-white", border: "border-emerald-100", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", num: "text-emerald-900", sub: "text-emerald-600" },
    rose:    { card: "from-rose-50 to-white", border: "border-rose-100", icon: "text-rose-600", badge: "bg-rose-100 text-rose-700", num: "text-rose-900", sub: "text-rose-600" },
    violet:  { card: "from-violet-50 to-white", border: "border-violet-100", icon: "text-violet-600", badge: "bg-violet-100 text-violet-700", num: "text-violet-900", sub: "text-violet-600" },
    indigo:  { card: "from-indigo-50 to-white", border: "border-indigo-100", icon: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700", num: "text-indigo-900", sub: "text-indigo-600" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`relative rounded-3xl bg-gradient-to-br ${c.card} shadow-lg shadow-gray-200/50 border ${c.border} p-6 overflow-hidden group hover:scale-[1.02] hover:shadow-xl transition-all duration-300`}>
      <div className="absolute top-4 right-4 text-2xl drop-shadow-sm">{emoji}</div>
      <div className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${c.badge} mb-4`}>
        <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        {label}
      </div>
      {isLoading ? (
        <Skeleton className="h-12 w-24 bg-gray-200 mb-2 rounded-xl" />
      ) : (
        <p className={`text-5xl font-black ${c.num} mb-1 tracking-tight`}>{value}{suffix}</p>
      )}
      {subtext && <p className={`text-sm font-semibold ${c.sub}`}>{subtext}</p>}
    </div>
  );
}

/* ─── Today's Schedule ─── */
function TodaySchedule({ classes, isLoading }) {
  const COURSE_COLORS = [
    "from-blue-500 to-blue-600", "from-violet-500 to-violet-600", "from-emerald-500 to-emerald-600",
    "from-amber-500 to-orange-500", "from-rose-500 to-pink-500", "from-indigo-500 to-indigo-600",
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Today's Schedule</h2>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        {classes.length > 0 && (
          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
            {classes.length} class{classes.length > 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center p-4 rounded-2xl bg-gray-50 animate-pulse">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">No classes today! 🎉</h3>
            <p className="text-gray-400 text-sm">Enjoy your free day and get some rest.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50/50 border border-gray-100 hover:border-blue-200 transition-all group cursor-pointer">
                {/* Color badge */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COURSE_COLORS[i % COURSE_COLORS.length]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{cls.course || "Unknown Course"}</p>
                  <p className="text-sm text-gray-500 truncate">{cls.faculty || "Unknown Faculty"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-700">{cls.slot || cls.start_time || "—"}</p>
                  <p className="text-xs text-gray-400">{cls.room || "TBA"}</p>
                </div>
                <span className="hidden group-hover:flex items-center text-blue-500">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Weekly Timetable ─── */
function WeeklyTimetable({ timetable, isLoading }) {
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString("en-US", { weekday: "long" }));
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const COLORS = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-violet-100 text-violet-800 border-violet-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
  ];

  let safeTimetable = Array.isArray(timetable) ? timetable : [];

  const dayClasses = safeTimetable.filter(
    item => item?.day?.toLowerCase() === activeDay.toLowerCase()
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-50">
            <Calendar className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Weekly Timetable</h2>
            <p className="text-xs text-gray-400">Click a day to view classes</p>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1.5 px-6 py-4 overflow-x-auto">
        {days.map(day => {
          const count = safeTimetable.filter(i => i?.day?.toLowerCase() === day.toLowerCase()).length;
          const isActive = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              {count > 0 && (
                <span className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Class List */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        ) : dayClasses.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No classes on {activeDay}</p>
            <p className="text-gray-400 text-sm">Enjoy your free time!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayClasses.map((cls, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${COLORS[i % COLORS.length]} transition-all hover:scale-[1.01]`}>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{cls.course || "Course"}</p>
                  <p className="text-xs opacity-70 truncate">{cls.faculty || "Faculty"}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-bold">{cls.slot || cls.start_time || "—"}</p>
                  <p className="text-xs opacity-70">{cls.room || "TBA"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Profile Summary ─── */
function ProfileSummary({ student, isLoading, onEdit }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 pt-8 pb-12 relative text-center">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-white/30 shadow-xl">
            <User className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-extrabold text-white text-xl">{student.name}</h3>
          <p className="text-blue-200 text-sm mt-0.5">{student.rollNumber}</p>
        </div>
      </div>

      {/* Info pulled up over the gradient */}
      <div className="px-5 -mt-5 pb-5">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {[
            { icon: Mail, label: student.email },
            { icon: GraduationCap, label: student.year },
            { icon: MapPin, label: student.department },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-700 truncate font-medium">{label || "—"}</span>
            </div>
          ))}
        </div>

        <button onClick={onEdit} className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all hover:-translate-y-0.5">
          View Full Profile
        </button>
      </div>
    </div>
  );
}

/* ─── Announcements ─── */
function AnnouncementsCard() {
  // Mock announcements removed for realism until hooked up to backend API
  const announcements = [];

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="p-2 rounded-xl bg-amber-50">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Announcements</h2>
          <p className="text-xs text-gray-400">
            {announcements.length > 0 ? `${announcements.length} new updates` : "Check back later"}
          </p>
        </div>
      </div>
      <div className="p-5">
        {announcements.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-300" />
            </div>
            <h3 className="text-sm font-bold text-gray-700 mb-1">No announcements yet</h3>
            <p className="text-xs text-gray-400">Important college updates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
                <div className={`h-1.5 w-full bg-gradient-to-r ${ann.color}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-700 transition">{ann.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{ann.type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">{ann.message}</p>
                  <p className="text-[10px] text-gray-400">{new Date(ann.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Profile Modal ─── */
const ProfileModal = ({ isOpen, onClose, student }) => {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
            <User className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">{student.name}</h3>
          <span className="mt-2 inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full font-semibold">{student.department}</span>
        </div>
        <div className="p-6 space-y-3">
          {[
            ["Roll Number", student.rollNumber],
            ["Year & Semester", `${student.year}, ${student.semester}`],
            ["Email", student.email],
            ["Phone", student.phone],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm font-medium text-gray-400">{label}</span>
              <span className="text-sm font-bold text-gray-900 text-right max-w-[200px] truncate">{val || "—"}</span>
            </div>
          ))}
          <button onClick={onClose} className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:shadow-lg transition">Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Active Meetings Card ─── */
function ActiveMeetingsCard({ meetings }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-50">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-indigo-50 bg-indigo-50/50">
        <div className="p-2 rounded-xl bg-indigo-100">
          <Video className="w-5 h-5 text-indigo-600 animate-pulse" />
        </div>
        <div>
          <h2 className="font-bold text-indigo-900 text-lg">Live & Upcoming Broadcasts</h2>
          <p className="text-xs text-indigo-600 font-medium">
            {meetings.length} active meeting{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {meetings.map((meet) => {
            const startDate = new Date(meet.start_time);
            const isLive = startDate <= new Date();

            return (
              <div key={meet.id} className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all group p-4 bg-gradient-to-r from-white to-gray-50">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <h4 className="font-bold text-sm text-gray-900">{meet.title}</h4>
                  {isLive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0 flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                      UPCOMING
                    </span>
                  )}
                </div>
                {meet.description && <p className="text-xs text-gray-500 mb-3">{meet.description}</p>}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 font-medium">
                    By {meet.organizer_name}
                  </div>
                  {meet.meeting_link && (
                    <a
                      href={meet.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Join <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
