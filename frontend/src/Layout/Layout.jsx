import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils/navigation";


import {
  LayoutDashboard,
  BookOpen,
  Users,
  MapPin,
  Clock,
  Calendar,
  GraduationCap,
  Settings,
  LogOut,
  ArrowRightLeft,
  FileText,
  List,
  Video
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  // Shared / Role-specific Dashboards
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    role: "admin",
  },
  {
    title: "Dashboard",
    url: "/student",
    icon: LayoutDashboard,
    role: "student",
  },
  {
    title: "Dashboard",
    url: "/teacher",
    icon: LayoutDashboard,
    role: "teacher",
  },
  // Admin Routes
  {
    title: "Timetable",
    url: createPageUrl("Timetable"),
    icon: Calendar,
    role: "admin",
  },
  {
    title: "Courses",
    url: createPageUrl("Courses"),
    icon: BookOpen,
    role: "admin",
  },
  {
    title: "Teachers",
    url: createPageUrl("Teachers"),
    icon: Users,
    role: "admin",
  },
  {
    title: "Students",
    url: createPageUrl("Students"),
    icon: GraduationCap,
    role: "admin",
  },
  {
    title: "Sections",
    url: createPageUrl("Sections"),
    icon: Users,
    role: "admin",
  },
  {
    title: "Rooms",
    url: createPageUrl("Rooms"),
    icon: MapPin,
    role: "admin",
  },
  {
    title: "Register User",
    url: "/admin/register-user",
    icon: Users,
    role: "admin",
  },
  {
    title: "Resources",
    url: "/resources",
    icon: BookOpen,
    role: "admin",
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
    role: "admin",
  },
  {
    title: "My Meetings",
    url: "/admin#meetings",
    icon: Video,
    role: "admin",
  },
  // Student Routes
  {
    title: "Attendance",
    url: "/student/attendance",
    icon: Clock,
    role: "student",
  },
  {
    title: "My Timetable",
    url: "/student#timetable", 
    icon: Calendar,
    role: "student",
  },
  {
    title: "Google Calendar",
    url: "/student#calendar",
    icon: Calendar,
    role: "student",
  },
  {
    title: "My Profile",
    url: "/student#profile", 
    icon: Users,
    role: "student",
  },
  {
    title: "My Meetings",
    url: "/student#meetings",
    icon: Video,
    role: "student",
  },
  // Teacher Routes
  {
    title: "Mark Attendance",
    url: "/teacher/mark-attendance",
    icon: Clock,
    role: "teacher",
  },
  {
    title: "My Schedule",
    url: "/teacher#schedule",
    icon: Calendar,
    role: "teacher",
  },
  {
    title: "Swap Classes",
    url: "/teacher#swap",
    icon: ArrowRightLeft,
    role: "teacher",
  },
  {
    title: "Apply Leave",
    url: "/teacher#leave",
    icon: FileText,
    role: "teacher",
  },
  {
    title: "My Requests",
    url: "/teacher#requests",
    icon: List,
    role: "teacher",
  },
  {
    title: "Room Management",
    url: "/teacher#rooms",
    icon: MapPin,
    role: "teacher",
  },
  {
    title: "Google Calendar",
    url: "/teacher#calendar",
    icon: Calendar,
    role: "teacher",
  },
  {
    title: "My Profile",
    url: "/teacher#profile",
    icon: Users,
    role: "teacher",
  },
  {
    title: "My Meetings",
    url: "/teacher#meetings",
    icon: Video,
    role: "teacher",
  }
];

import NotificationCenter from "../components/NotificationCenter";
import { Bell } from "lucide-react"; // Ensure Bell is imported
import Chatbot from "../components/Chatbot";

export default function Layout({ children, onLogout, role }) {
  const location = useLocation();

  // Filter items based on role
  const visibleItems = navigationItems.filter(item => !item.role || item.role === role);
  
  // Get user details for dropdown
  const userName = localStorage.getItem('full_name') || localStorage.getItem('username') || (role === 'admin' ? 'Admin User' : 'Student User');
  const userInitials = userName.charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Sidebar className="border-r border-blue-100/60 bg-white/80 backdrop-blur-sm">
          {/* ... Header ... */}
          <SidebarHeader className="border-b border-blue-100/60 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">EduScheduler</h2>
                <p className="text-xs text-blue-600 font-medium capitalize">{role || 'System'} Portal</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item, idx) => {
                    const currentPathWithHash = location.pathname + location.hash;
                    // Check exact match (including hash) or fallback for deep inner pages
                    const isActive = currentPathWithHash === item.url || (item.url === `/${role}` && currentPathWithHash === `/${role}`);
                    
                    return (
                      <SidebarMenuItem key={`${item.title}-${idx}`}>
                        <SidebarMenuButton
                          asChild
                          className={`group hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 rounded-xl mb-2 ${isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                            : 'text-gray-600'
                            }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : ''
                              }`} />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-blue-100/60 p-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <NotificationCenter position="sidebar-right" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 transition-colors duration-200 border border-blue-100/50 hover:border-blue-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">{userInitials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{userName}</p>
                    <p className="text-xs text-blue-600 truncate capitalize">{role}</p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border border-gray-100 shadow-xl p-2">
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-600 font-medium hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 cursor-pointer rounded-lg p-2.5 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100/60 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EduScheduler
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
          <Chatbot />
        </main>
      </div>
    </SidebarProvider>
  );
}