// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/Login/Loginpage';
import Dashboard from './pages/dashboard/dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses/Course';
import Teachers from './pages/Teachers/teachers';
import Students from './pages/Students/Students';
import Sections from './pages/Sections/Sections';
import Rooms from './pages/rooms/Rooms';
import Timetable from './pages/Timetable/timetable';
import RegisterUser from './pages/Admin/RegisterUser';
import SuperAdminDashboard from './pages/Admin/SuperAdminDashboard';
import MarkAttendance from './pages/Teachers/MarkAttendance';
import StudentAttendance from './pages/Students/StudentAttendance';
import Layout from './Layout/Layout';
import ApiService from './services/api';
import ResourceBookingSystem from './components/ResourceBookingSystem';
import AdminNotificationManager from './pages/Admin/NotificationManager';

// Inner component that has access to useLocation
function AppRoutes() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check authentication status
  const checkAuth = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (token && role) {
        setIsAuthenticated(true);
        setUserRole(role);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
    setLoading(false);
  }, [checkAuth]);

  // Check authentication when route changes (e.g., after login)
  useEffect(() => {
    checkAuth();
  }, [location.pathname, checkAuth]);

  const handleLogout = () => {
    ApiService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ?
            <Navigate to={userRole === 'superadmin' ? '/super-admin' : `/${userRole}`} replace /> :
            <LoginPage />
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          isAuthenticated && userRole === 'superadmin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <SuperAdminDashboard />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Dashboard />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/courses"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Courses />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/teachers"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Teachers />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/students"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Students />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/sections"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Sections />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/rooms"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Rooms />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/timetable"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Timetable />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/register-user"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <RegisterUser />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/notifications"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <AdminNotificationManager />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/*"
        element={
          isAuthenticated && userRole === 'admin' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Dashboard />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          isAuthenticated && userRole === 'teacher' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <TeacherDashboard onLogout={handleLogout} />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/teacher/mark-attendance"
        element={
          isAuthenticated && userRole === 'teacher' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <MarkAttendance />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/teacher/*"
        element={
          isAuthenticated && userRole === 'teacher' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <Dashboard />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      {/* Note: TeacherDashboard usually doesn't use Layout if it has its own, but routes under /teacher/* might. 
          Assuming Layout handles teacher nav if role is passed. 
          Standardizing Layout usage for all roles is better. 
      */}

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          isAuthenticated && userRole === 'student' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <StudentDashboard onLogout={handleLogout} />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/student/attendance"
        element={
          isAuthenticated && userRole === 'student' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <StudentAttendance />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/student/*"
        element={
          isAuthenticated && userRole === 'student' ?
            <Layout onLogout={handleLogout} role={userRole}>
              <StudentDashboard onLogout={handleLogout} />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />

      {/* Shared Routes */}
      <Route
        path="/resources"
        element={
          isAuthenticated ?
            <Layout onLogout={handleLogout} role={userRole}>
              <ResourceBookingSystem />
            </Layout> :
            <Navigate to="/login" replace />
        }
      />

      {/* Default Route - Redirect to login or dashboard based on auth */}
      <Route
        path="/"
        element={
          isAuthenticated ?
            <Navigate to={userRole === 'superadmin' ? '/super-admin' : `/${userRole}`} replace /> :
            <Navigate to="/login" replace />
        }
      />

      {/* Catch all other routes */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? (userRole === 'superadmin' ? '/super-admin' : `/${userRole}`) : "/login"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;