import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ApiService from "../services/api";
import NotificationCenter from "../components/NotificationCenter";
import GoogleCalendarConnect from "../components/GoogleCalendarConnect";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  ArrowRightLeft,
  UserCheck,
  UserX,
  FileText,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  GraduationCap,
  AlertTriangle,

  User,
  List,
  Video,
  Radio,
  ExternalLink
} from "lucide-react";
import MyRequestsModal from "./Teachers/MyRequestsModal";
import MyMeetingsModal from "../components/Dashboard/MyMeetingsModal";

const ProfileModal = ({ isOpen, onClose, teacher }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>
            View your personal and academic information.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2 border-4 border-white shadow-lg">
              {teacher.name ? teacher.name.charAt(0).toUpperCase() : <User className="w-12 h-12" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900">{teacher.name}</h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">{teacher.department}</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-sm font-medium text-gray-500">Employee ID</span>
              <span className="col-span-2 text-sm font-semibold text-gray-900">{teacher.employeeId}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-sm font-medium text-gray-500">Email</span>
              <span className="col-span-2 text-sm text-gray-900">{teacher.email}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-sm font-medium text-gray-500">Role</span>
              <span className="col-span-2 text-sm text-gray-900">Faculty Member</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function TeacherDashboard({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    totalClasses: 0,
    todayClasses: 0,
    pendingSwaps: 0,
    leaveRequests: 0
  });
  const [timetable, setTimetable] = useState([]);
  const [roomStatus, setRoomStatus] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState({
    name: "Teacher",
    email: "",
    department: "",
    employeeId: ""
  });

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [showMyMeetingsModal, setShowMyMeetingsModal] = useState(false);

  useEffect(() => {
    loadTeacherData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (location.hash === "#swap") {
        setShowSwapModal(true);
      } else if (location.hash === "#leave") {
        setShowLeaveModal(true);
      } else if (location.hash === "#profile") {
        setShowProfileModal(true);
      } else if (location.hash === "#requests") {
        setShowMyRequestsModal(true);
      } else if (location.hash === "#meetings") {
        setShowMyMeetingsModal(true);
      } else if (location.hash === "#schedule") {
        const el = document.getElementById("schedule");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (location.hash === "#calendar") {
        const el = document.getElementById("calendar");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (location.hash === "#rooms") {
        const el = document.getElementById("rooms");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setShowSwapModal(false);
        setShowLeaveModal(false);
        setShowProfileModal(false);
        setShowMyRequestsModal(false);
      }
    }
  }, [location.hash, isLoading]);

  const processRoomData = (response) => {
    if (response && typeof response === 'object') {
      // Check if it's the expected structure with category arrays
      if (response.free_rooms || response.unmarked_rooms || response.occupied_rooms) {
        return [
          ...(response.free_rooms || []).map(room => ({ ...room, status: 'free' })),
          ...(response.unmarked_rooms || []).map(room => ({ ...room, status: 'unmarked' })),
          ...(response.occupied_rooms || []).map(room => ({ ...room, status: 'occupied' }))
        ];
      }
      // If it's already an array, return it
      if (Array.isArray(response)) return response;
    }
    return [];
  };

  const loadTeacherData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load teacher timetable
      let timetableResponse = [];
      try {
        const response = await ApiService.getTeacherTimetable();
        // API returns {timetable: [...], teacher_name: "...", department: "..."}
        timetableResponse = (response && response.timetable) ? response.timetable : [];
      } catch (timetableError) {
        console.warn("Could not load teacher timetable:", timetableError.message);
        // Continue with empty timetable - teacher might not have faculty record yet
        timetableResponse = [];
      }
      setTimetable(timetableResponse);

      // Load room status
      let roomStatusResponse = [];
      try {
        const response = await ApiService.getRoomStatus();
        roomStatusResponse = processRoomData(response);
      } catch (roomError) {
        console.warn("Could not load room status:", roomError.message);
        roomStatusResponse = [];
      }
      setRoomStatus(roomStatusResponse);

      // Load swap requests
      let swapRequests = [];
      try {
        const response = await ApiService.getTeacherSwapRequests();
        swapRequests = response || [];
      } catch (swapError) {
        console.warn("Could not load swap requests:", swapError.message);
        swapRequests = [];
      }

      // Load meetings
      let meetingsData = [];
      try {
        const meets = await ApiService.getMeetings();
        meetingsData = meets?.meetings || [];
      } catch (err) { }
      setMeetings(meetingsData);

      // Process stats
      const todayClasses = getTodayClasses(timetableResponse);
      const pendingSwaps = swapRequests ? swapRequests.filter(req => req.status === 'pending').length : 0;

      setStats({
        totalClasses: timetableResponse ? timetableResponse.length : 0,
        todayClasses: todayClasses.length,
        pendingSwaps,
        leaveRequests: 0 // Would come from leave API
      });

      // Set teacher info from localStorage or API
      const user = ApiService.getCurrentUser();
      setTeacherInfo({
        name: user.full_name || "Teacher User",
        email: user.email || "teacher@college.edu",
        department: user.department || "Computer Science",
        employeeId: user.user_id || "T001"
      });

    } catch (error) {
      console.error("Error loading teacher data:", error);
      setError("Failed to load teacher data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayClasses = (timetable) => {
    if (!timetable || !Array.isArray(timetable)) return [];

    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return timetable.filter(item =>
      item.day && item.day.toLowerCase() === today.toLowerCase()
    );
  };

  const handleRoomStatusChange = async (roomId, status) => {
    try {
      await ApiService.markRoom(roomId, status);
      // Refresh room status
      const updatedStatusRaw = await ApiService.getRoomStatus();
      const updatedStatus = processRoomData(updatedStatusRaw);
      setRoomStatus(updatedStatus);
    } catch (error) {
      console.error("Error updating room status:", error);
    }
  };

  const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const todayClasses = getTodayClasses(timetable);

  const handleSubmitSwap = async (data) => {
    try {
      await ApiService.createSwapRequest(data);
      // Reload swaps
      loadTeacherData();
      alert("Swap request submitted successfully!");
    } catch (err) {
      alert("Failed to submit swap request: " + err.message);
    }
  };

  const handleSubmitLeave = async (data) => {
    try {
      await ApiService.submitLeaveRequest(data);
      loadTeacherData();
      alert("Leave application submitted successfully!");
    } catch (err) {
      alert("Failed to submit leave request: " + err.message);
    }
  };

  if (error) {
    return (
      <div className="flex-1 p-6 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-4">
                <Button onClick={loadTeacherData}>Try Again</Button>
                <Button variant="outline" onClick={onLogout}>Logout</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-transparent">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, <span className="text-green-600">{teacherInfo.name.split(' ')[0]}!</span>
            </h1>
            <p className="text-lg text-slate-600">{currentDay} • {currentTime}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">{teacherInfo.department}</Badge>
              <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">ID: {teacherInfo.employeeId}</Badge>
            </div>
          </div>
          {/* Action buttons removed since they are now in the sidebar */}
          <div className="flex flex-wrap gap-3 hidden md:flex opacity-0 pointer-events-none"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Classes"
            value={stats.totalClasses}
            icon={BookOpen}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Today's Classes"
            value={stats.todayClasses}
            icon={Clock}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Pending Swaps"
            value={stats.pendingSwaps}
            icon={ArrowRightLeft}
            color="orange"
            isLoading={isLoading}
          />
          <StatCard
            title="Leave Requests"
            value={stats.leaveRequests}
            icon={FileText}
            color="purple"
            isLoading={isLoading}
          />
          <div
            className="cursor-pointer"
            onClick={() => setShowMyMeetingsModal(true)}
            title="View my meetings"
          >
            <StatCard
              title="My Meetings"
              value={meetings.length}
              icon={Video}
              color="indigo"
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2" id="schedule">
            <TodaySchedule
              classes={todayClasses}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4" id="calendar">
            <CreateMeetingCard
              onCreateClick={() => setShowCreateMeetingModal(true)}
            />
            {meetings.length > 0 && (
              <ActiveMeetingsCard meetings={meetings} />
            )}
            <GoogleCalendarConnect />
          </div>

          {/* Room Status */}
          <div className="lg:col-span-2" id="rooms">
            <RoomStatusCard
              rooms={roomStatus}
              onStatusChange={handleRoomStatusChange}
              isLoading={isLoading}
            />
          </div>

          {/* Weekly Overview */}
          <div>
            <WeeklyOverview
              timetable={timetable}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <SwapRequestModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        timetable={timetable}
        onSubmit={handleSubmitSwap}
      />

      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleSubmitLeave}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        teacher={teacherInfo}
      />

      <MyRequestsModal
        isOpen={showMyRequestsModal}
        onClose={() => setShowMyRequestsModal(false)}
      />

      <CreateMeetingModal
        isOpen={showCreateMeetingModal}
        onClose={() => setShowCreateMeetingModal(false)}
        teacherInfo={teacherInfo}
      />

      <MyMeetingsModal
        isOpen={showMyMeetingsModal}
        onClose={() => {
          setShowMyMeetingsModal(false);
          if (location.hash === "#meetings") navigate('/teacher');
        }}
        meetings={meetings}
      />
    </div>
  );
}

// StatCard Component
function StatCard({ title, value, icon: Icon, color, isLoading }) {
  const colorMap = {
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    orange: "bg-orange-100 text-orange-800",
    purple: "bg-purple-100 text-purple-800",
    indigo: "bg-indigo-100 text-indigo-800"
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Today's Schedule Component
function TodaySchedule({ classes, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-16" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No classes today</h3>
            <p className="text-gray-500">Enjoy your free day!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map((classItem, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-center min-w-[80px]">
                  <div className="font-mono text-sm font-bold text-green-800">
                    {classItem.slot || 'N/A'}
                  </div>
                  <div className="text-xs text-green-600">
                    {classItem.room || 'TBA'}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{classItem.course || 'Unknown Course'}</h4>
                  <p className="text-sm text-gray-600">{classItem.section || 'Unknown Section'}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-orange-100 text-orange-800">
                    Scheduled
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Actions Component
function QuickActions({ onSwapClick, onLeaveClick, onProfileClick }) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate('/teacher/mark-attendance')}>
          <UserCheck className="w-4 h-4" />
          Mark Attendance
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={onSwapClick}>
          <ArrowRightLeft className="w-4 h-4" />
          Request Class Swap
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={onLeaveClick}>
          <FileText className="w-4 h-4" />
          Apply for Leave
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline">
          <Bell className="w-4 h-4" />
          View Notifications
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={onProfileClick}>
          <Users className="w-4 h-4" />
          My Profile
        </Button>
      </CardContent>
    </Card>
  );
}

// Swap Request Modal
function SwapRequestModal({ isOpen, onClose, timetable, onSubmit }) {
  const [formData, setFormData] = useState({
    original_timetable_id: "",
    proposed_day: "Monday",
    proposed_start_time: "09:00",
    reason: ""
  });
  const [loading, setLoading] = useState(false);

  // Filter only future classes or valid entries
  const validClasses = timetable || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        original_timetable_id: "",
        proposed_day: "Monday",
        proposed_start_time: "09:00",
        reason: ""
      });
    } catch (error) {
      console.error("Swap request failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Request Class Swap</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Class</label>
            <select
              className="w-full border rounded p-2"
              value={formData.original_timetable_id}
              onChange={(e) => setFormData({ ...formData, original_timetable_id: e.target.value })}
              required
            >
              <option value="">-- Select a class --</option>
              {validClasses.map(t => (
                <option key={t.id} value={t.id}>
                  {t.course} ({t.day} {t.slot})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Proposed Day</label>
              <select
                className="w-full border rounded p-2"
                value={formData.proposed_day}
                onChange={(e) => setFormData({ ...formData, proposed_day: e.target.value })}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Proposed Time</label>
              <input
                type="time"
                className="w-full border rounded p-2"
                value={formData.proposed_start_time}
                onChange={(e) => setFormData({ ...formData, proposed_start_time: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              className="w-full border rounded p-2"
              rows="3"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Leave Request Modal
function LeaveRequestModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    leave_type: "casual",
    start_date: "",
    end_date: "",
    reason: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      setFormData({
        leave_type: "casual",
        start_date: "",
        end_date: "",
        reason: ""
      });
    } catch (error) {
      console.error("Leave request failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Apply for Leave</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <select
              className="w-full border rounded p-2"
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
            >
              <option value="casual">Casual Leave</option>
              <option value="medical">Medical Leave</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              className="w-full border rounded p-2"
              rows="3"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Room Status Card Component
function RoomStatusCard({ rooms, onStatusChange, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Room Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-600" />
          Room Status Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No rooms available</h3>
              <p className="text-gray-500">Room status will appear here</p>
            </div>
          ) : (
            rooms.map((room, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900">{room.room_name || room.name || `Room ${room.room_id}`}</h4>
                  <p className="text-sm text-gray-600">{room.location || 'Unknown location'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={room.status === 'occupied' ? 'default' : 'outline'}
                    onClick={() => onStatusChange(room.room_id, 'occupied')}
                    className="gap-1"
                  >
                    <UserCheck className="w-3 h-3" />
                    Occupied
                  </Button>
                  <Button
                    size="sm"
                    variant={room.status === 'vacant' || room.status === 'free' ? 'default' : 'outline'}
                    onClick={() => onStatusChange(room.room_id, 'free')}
                    className="gap-1"
                  >
                    <UserX className="w-3 h-3" />
                    Vacant
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Weekly Overview Component
function WeeklyOverview({ timetable, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          Weekly Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {daysOfWeek.map(day => {
            const dayClasses = (timetable && Array.isArray(timetable)) ? timetable.filter(item =>
              item.day && item.day.toLowerCase() === day.toLowerCase()
            ) : [];

            return (
              <div key={day} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{day}</h4>
                {dayClasses.length === 0 ? (
                  <p className="text-sm text-gray-500">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {dayClasses.map((classItem, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{classItem.course}</p>
                          <p className="text-xs text-gray-600">{classItem.section}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{classItem.slot}</p>
                          <p className="text-xs text-gray-600">{classItem.room}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Create Meeting Card
function CreateMeetingCard({ onCreateClick }) {
  return (
    <Card className="shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-indigo-800">
          <Video className="w-5 h-5" />
          On-Demand Broadcast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-indigo-600 mb-4">
          Instantly create a meeting and broadcast it to your students or colleagues.
        </p>
        <Button 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          onClick={onCreateClick}
        >
          <Radio className="w-4 h-4 animate-pulse" />
          Create Broadcast
        </Button>
      </CardContent>
    </Card>
  );
}

// Create Meeting Modal
function CreateMeetingModal({ isOpen, onClose, teacherInfo }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    audience_role: "students",
    dept_id: teacherInfo?.dept_id || "",
    year: "",
    section_id: "",
    start_time: "",
    manual_link: "",
    is_instant: true
  });
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Load metadata when opened
  useEffect(() => {
    if (isOpen) {
      // Set default time to now
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setFormData(prev => ({ 
        ...prev, 
        start_time: now.toISOString().slice(0, 16),
        dept_id: teacherInfo?.dept_id || ""
      }));

      const fetchData = async () => {
        try {
          const [sectionsRes, deptsRes, statusRes] = await Promise.all([
            ApiService.getSections(),
            ApiService.getDepartments(),
            ApiService.getCalendarStatus()
          ]);
          
          if (sectionsRes && sectionsRes.sections) setSections(sectionsRes.sections);
          if (deptsRes && deptsRes.departments) setDepartments(deptsRes.departments);
          if (statusRes && statusRes.is_connected) setIsGoogleConnected(true);
        } catch (err) {
          console.error("Failed to load metadata", err);
        }
      };
      fetchData();
    }
  }, [isOpen, teacherInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalStartTime = formData.start_time;
      if (formData.is_instant) {
        finalStartTime = new Date().toISOString();
      } else {
        // Assume local input timezone, convert to UTC string for backend
        finalStartTime = new Date(formData.start_time).toISOString();
      }

      await ApiService.createMeeting({
        title: formData.title,
        description: formData.description,
        audience_role: formData.audience_role,
        dept_id: formData.dept_id || null,
        year: formData.year || null,
        section_id: formData.section_id || null,
        start_time: finalStartTime,
        manual_link: formData.manual_link || null
      });

      alert("Meeting Broadcast Created Successfully!");
      onClose();
      // Reset form
      setFormData({
        title: "",
        description: "",
        audience_type: "section",
        section_id: "",
        start_time: "",
        manual_link: "",
        is_instant: true
      });
    } catch (error) {
      alert("Failed to create meeting: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-800">
          <Video className="w-6 h-6" /> Create Meeting Broadcast
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meeting Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="e.g. Extra Class - Revisions"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              className="w-full border rounded p-2"
              rows="2"
              placeholder="Brief agenda..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Timing</h4>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={formData.is_instant}
                  onChange={() => setFormData({ ...formData, is_instant: true })}
                />
                <span className="font-bold text-red-600">Start Now (Instant)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.is_instant}
                  onChange={() => setFormData({ ...formData, is_instant: false })}
                />
                <span>Schedule for Later</span>
              </label>
            </div>
            
            {!formData.is_instant && (
              <div>
                <label className="block text-sm font-medium mb-1">Start Time <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  className="w-full border rounded p-2"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required={!formData.is_instant}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium mb-1">Target Audience <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'students', label: 'Students' },
                { id: 'teachers', label: 'Teachers' },
                { id: 'all', label: 'Everyone' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, audience_role: opt.id, year: "", section_id: "" })}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    formData.audience_role === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Conditional Filters */}
            <div className="space-y-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1 duration-200">
              {formData.audience_role !== 'all' && (
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">Department</label>
                  <select
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.dept_id}
                    onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                  >
                    <option value="">{formData.audience_role === 'students' ? "Select Department..." : "All Departments"}</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.dept_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.audience_role === 'students' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">Year</label>
                    <select
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value, section_id: "" })}
                    >
                      <option value="">All Years</option>
                      {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">Section</label>
                    <select
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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

          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
            <label className="block text-sm font-bold text-indigo-800 flex items-center gap-2">
              <Video className="w-4 h-4" /> Meeting Link
            </label>
            
            {isGoogleConnected ? (
              <div className="text-[11px] text-green-700 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Google Connected: Meet link will be auto-generated.
              </div>
            ) : (
              <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Calendar not connected. Manual link required.
              </div>
            )}

            <input
              type="url"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              placeholder={isGoogleConnected ? "Paste link here to override auto-generation" : "https://zoom.us/..."}
              value={formData.manual_link}
              onChange={(e) => setFormData({ ...formData, manual_link: e.target.value })}
              required={!isGoogleConnected}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Creating..." : (formData.is_instant ? "Start Broadcast Now" : "Schedule Meeting")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Active Meetings Card
function ActiveMeetingsCard({ meetings }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
      <div className="bg-indigo-50/50 px-4 py-3 flex items-center justify-between border-b gap-2 border-indigo-50">
        <h3 className="font-semibold text-indigo-900 flex items-center gap-2 text-sm">
          <Video className="w-4 h-4 text-indigo-600 animate-pulse" />
          Active Broadcasts
        </h3>
        <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{meetings.length}</span>
      </div>
      <div className="p-3">
        <div className="space-y-2">
          {meetings.map((meet) => {
            const startDate = new Date(meet.start_time);
            const isLive = startDate <= new Date();

            return (
              <div key={meet.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-indigo-50/30 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900 truncate">{meet.title}</h4>
                  {isLive ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 flex-shrink-0 flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 flex-shrink-0">
                      UPCOMING
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/60">
                  <div className="text-[10px] text-gray-500 font-medium truncate pr-2">
                    By {meet.organizer_name}
                  </div>
                  {meet.meeting_link && (
                    <a
                      href={meet.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors flex-shrink-0"
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
