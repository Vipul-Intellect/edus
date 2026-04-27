import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../../services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
// import { createPageUrl } from "@/utils";
import {
  BookOpen,
  Users,
  MapPin,
  Calendar,
  Plus,
  Clock,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

import StatCard from "../../components/Dashboard/statCard";
import WeeklyOverview from "../../components/Dashboard/weeklyOverview";
import QuickActions from "../../components/Dashboard/quickActions";
import RecentSwapRequests from "../../components/Dashboard/recentSwapRequests";
import RecentLeaveRequests from "../../components/Dashboard/recentLeaveRequests";
import UserManagement from "../../components/Dashboard/UserManagement";
import DepartmentManagement from "../../components/Dashboard/DepartmentManagement";
import AdminTimetableEditor from "../../components/Dashboard/AdminTimetableEditor";
import AdminCreateMeetingModal from "../../components/Dashboard/AdminCreateMeetingModal";
import MyMeetingsModal from "../../components/Dashboard/MyMeetingsModal";
import SendNotificationModal from "../../components/Dashboard/SendNotificationModal";
import AdminRoomIssues from "../../components/Dashboard/AdminRoomIssues";


export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    courses: 0,
    teachers: 0,
    rooms: 0,
    classes: 0,
    timeSlots: 0
  });
  const [swapRequests, setSwapRequests] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showMyMeetingsModal, setShowMyMeetingsModal] = useState(false);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = ApiService.getCurrentUser();

    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (location.hash === "#meetings") {
      setShowMyMeetingsModal(true);
    } else {
      setShowMyMeetingsModal(false);
    }

    loadDashboardData();
  }, [navigate, location.hash]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Use public endpoints for basic stats (works for all users)
      const [courses, teachers, rooms, timeSlots, swaps, leaves, meetingsRes] = await Promise.all([
        ApiService.getCoursesLegacy(),
        ApiService.getFacultyLegacy(),
        ApiService.getRoomsLegacy(),
        ApiService.getTimetable(), // This will get classes/timetable data
        ApiService.getAdminSwapRequests('pending'),
        ApiService.getAdminLeaveRequests('pending'),
        ApiService.getMeetings()
      ]);

      setMeetings(meetingsRes?.meetings || []);

      setStats({
        courses: courses ? (Array.isArray(courses) ? courses.length : (courses.courses?.length || 0)) : 0,
        teachers: teachers ? (Array.isArray(teachers) ? teachers.length : (teachers.faculty?.length || 0)) : 0,
        rooms: rooms ? (Array.isArray(rooms) ? rooms.length : (rooms.rooms?.length || 0)) : 0,
        classes: timeSlots ? (Array.isArray(timeSlots) ? timeSlots.length : (timeSlots.timetable?.length || 0)) : 0,
        timeSlots: timeSlots ? (Array.isArray(timeSlots) ? timeSlots.length : (timeSlots.timetable?.length || 0)) : 0,
        meetings: meetingsRes?.meetings?.length || 0
      });

      const swapList = Array.isArray(swaps) ? swaps : (swaps?.requests || swaps?.swap_requests || swaps?.data || []);
      const leaveList = Array.isArray(leaves) ? leaves : (leaves?.requests || leaves?.leave_requests || leaves?.data || []);

      setSwapRequests(swapList);
      setLeaveRequests(leaveList);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);

  };
  const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });




  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!
            </h1>
            <p className="text-lg text-slate-600">{currentDay} • {currentTime}</p>
            {/* <p className="text-gray-600 mt-2 text-lg">
              Welcome to your timetable management system
            </p> */}
          </div>
          <QuickActions onAction={(action) => {
            if (action === "create_meeting") setShowCreateMeetingModal(true);
            if (action === "send_notification") setShowNotificationModal(true);
          }} />
        </div>

        {/* <div>
          <Card/>
        </div> */}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Courses"
            value={stats.courses}
            icon={BookOpen}
            color="blue"
            isLoading={isLoading}
            onClick={() => navigate('/courses')}
          />
          <StatCard
            title="Teachers"
            value={stats.teachers}
            icon={Users}
            color="green"
            isLoading={isLoading}
            onClick={() => navigate('/faculty')}
          />
          <StatCard
            title="Rooms"
            value={stats.rooms}
            icon={MapPin}
            color="purple"
            isLoading={isLoading}
            onClick={() => navigate('/rooms')}
          />
          <StatCard
            title="Active Classes"
            value={stats.classes}
            icon={Calendar}
            color="orange"
            isLoading={isLoading}
            onClick={() => navigate('/timetable')}
          />
          <StatCard
            title="Time Slots"
            value={stats.timeSlots}
            icon={Clock}
            color="indigo"
            isLoading={isLoading}
            onClick={() => navigate('/timetable')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-8">
              <RecentSwapRequests requests={swapRequests} isLoading={isLoading} onUpdate={loadDashboardData} />
              <RecentLeaveRequests />
            </div>
          </div>

          {/* Weekly Overview */}
          <div>
            <WeeklyOverview />
          </div>
        </div>

        {/* Management Sections */}
        <div className="mt-8 space-y-8">
          <AdminTimetableEditor />
          <DepartmentManagement />
          <UserManagement />
          {/* ── Room Issues Panel ── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border" style={{ borderColor: "rgba(99,102,241,0.12)" }}>
            <AdminRoomIssues />
          </div>
        </div>

        <AdminCreateMeetingModal 
          isOpen={showCreateMeetingModal} 
          onClose={() => setShowCreateMeetingModal(false)} 
        />

        <MyMeetingsModal 
          isOpen={showMyMeetingsModal} 
          onClose={() => {
            setShowMyMeetingsModal(false);
            if (location.hash === "#meetings") navigate('/admin');
          }} 
          meetings={meetings}
        />

        <SendNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
        />
      </div>
    </div>
  );
}
