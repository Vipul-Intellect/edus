// src/services/api.js
// API Base URL - automatically switches between development and production
// In production, set VITE_API_URL environment variable to your deployed backend URL
// Example: VITE_API_URL=https://timetable-backend.onrender.com
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Update token from storage
  updateToken() {
    this.token = localStorage.getItem('token');
  }

  // Helper method to make authenticated requests
  async makeRequest(url, options = {}) {
    this.updateToken();

    const headers = {
      ...options.headers
    };

    // Don't set Content-Type for FormData (file uploads) or GET requests
    if (!(options.body instanceof FormData) && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['x-access-token'] = this.token;
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
      });

      // Handle different response statuses
      if (response.status === 401) {
        this.logout();
        return null;
      }

      // Parse response body (try JSON first, fallback to text)
      let responseData;
      const contentType = response.headers.get('content-type');

      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          responseData = text ? { message: text } : { success: response.ok };
        }
      } catch (parseError) {
        // If parsing fails, return error info
        responseData = {
          error: 'Failed to parse response',
          status: response.status,
          statusText: response.statusText
        };
      }

      // Handle error status codes
      if (!response.ok) {
        if (response.status === 403) {
          const isContextError = responseData.error?.includes('College context') || 
                                 responseData.message?.includes('College context');
          
          if (isContextError) {
            console.warn("🛡️ Stale tenant context detected. Clearing local storage and logging out.");
            this.logout();
            return null;
          }
          throw new Error(responseData.error || responseData.message || 'Access forbidden - insufficient permissions');
        }

        if (response.status === 404) {
          throw new Error(responseData.error || responseData.message || 'Resource not found');
        }

        if (response.status >= 500) {
          throw new Error(responseData.error || responseData.message || 'Server error - please try again later');
        }

        // Handle other 4xx errors (400, 422, etc.)
        if (response.status >= 400) {
          const error = new Error(responseData.error || responseData.message || `Request failed with status ${response.status}`);
          error.data = responseData;
          error.status = response.status;
          throw error;
        }
      }

      return responseData;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection and ensure the backend server is running');
      }
      throw error;
    }
  }

  async getMySwapRequests() {
    return this.makeRequest('/teacher/swap-requests');
  }

  async getMyLeaveRequests() {
    return this.makeRequest('/leave/my-requests');
  }

  // ==================== AUTHENTICATION ====================

  async login(college_code, username, password) {
    const response = await this.makeRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ college_code, username, password })
    });

    if (response && response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', response.role);
      localStorage.setItem('user_id', response.user_id);
      localStorage.setItem('full_name', response.full_name || '');
      localStorage.setItem('department', response.department || '');
      this.token = response.token;
    }

    return response;
  }

  async adminLogin(college_code, username, password) {
    const response = await this.makeRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ college_code, username, password })
    });

    if (response && response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', response.role);
      localStorage.setItem('user_id', response.user_id);
      this.token = response.token;
    }

    return response;
  }

  async register(userData) {
    return this.makeRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async registerUser(userData) {
    return this.makeRequest('/admin/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // ==================== SUPER ADMIN ====================

  async fetchColleges() {
    return this.makeRequest('/api/super/colleges');
  }

  async createCollege(collegeData) {
    return this.makeRequest('/api/super/colleges', {
      method: 'POST',
      body: JSON.stringify(collegeData)
    });
  }

  async updateCollege(collegeId, updateData) {
    return this.makeRequest(`/api/super/colleges/${collegeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  async getPlatformStats() {
    return this.makeRequest('/api/super/stats');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('full_name');
    localStorage.removeItem('department');
    this.token = null;
    window.location.href = '/login';
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUserRole() {
    return localStorage.getItem('role');
  }

  getCurrentUser() {
    return {
      role: localStorage.getItem('role'),
      user_id: localStorage.getItem('user_id'),
      full_name: localStorage.getItem('full_name'),
      department: localStorage.getItem('department')
    };
  }

  // ==================== ADMIN - DEPARTMENTS ====================

  async getDepartments() {
    return this.makeRequest('/admin/departments');
  }

  async getDepartmentsPublic() {
    return this.makeRequest('/get_departments');
  }

  async addDepartment(deptName) {
    return this.makeRequest('/admin/departments', {
      method: 'POST',
      body: JSON.stringify({ dept_name: deptName })
    });
  }

  // ==================== ADMIN - FACULTY ====================

  async getFaculty() {
    return this.makeRequest('/admin/faculty');
  }

  async addFaculty(facultyData) {
    return this.makeRequest('/admin/faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData)
    });
  }

  async updateFaculty(facultyId, facultyData) {
    return this.makeRequest(`/admin/faculty/${facultyId}`, {
      method: 'PUT',
      body: JSON.stringify(facultyData)
    });
  }

  async deleteFaculty(facultyId) {
    return this.makeRequest(`/admin/faculty/${facultyId}`, {
      method: 'DELETE'
    });
  }

  // ==================== ADMIN - STUDENTS ====================

  async getStudents() {
    return this.makeRequest('/admin/students');
  }

  async addStudent(studentData) {
    return this.makeRequest('/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  }

  async getSections() {
    return this.makeRequest('/admin/sections');
  }

  async getSectionsPublic(deptName = null, year = null) {
    let url = '/get_sections';
    const params = new URLSearchParams();
    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);
    if (params.toString()) url += `?${params.toString()}`;
    return this.makeRequest(url);
  }

  async addSection(sectionData) {
    return this.makeRequest('/admin/sections', {
      method: 'POST',
      body: JSON.stringify(sectionData)
    });
  }

  // ==================== TIMETABLE ====================
  async generateTimetable() {
    return this.makeRequest('/admin/generate_timetable', {
      method: 'POST'
    });
  }

  async getTimetable(filters = {}) {
    const params = new URLSearchParams();
    if (filters.dept_name) params.append('dept_name', filters.dept_name);
    if (filters.year) params.append('year', filters.year);
    if (filters.section) params.append('section', filters.section);
    const query = params.toString();
    return this.makeRequest(`/get_timetable${query ? '?' + query : ''}`);
  }

  async getAdminSwapRequests(status = 'pending') {
    return this.makeRequest(`/admin/swap-requests?status=${status}`);
  }

  async getAdminLeaveRequests(status = 'pending') {
    return this.makeRequest(`/admin/leave-requests?status=${status}`);
  }

  async getRoomStatus() {
    return this.makeRequest('/rooms/status');
  }

  async getUsers() {
    return this.makeRequest('/admin/users');
  }

  async updateUser(userId, userData) {
    return this.makeRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId) {
    return this.makeRequest(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async adminApproveSwap(requestId, forceSwap = false) {
    return this.makeRequest(`/admin/swap-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ force_swap: forceSwap })
    });
  }

  async adminRejectSwap(requestId, reason = "") {
    return this.makeRequest(`/admin/swap-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async adminApproveLeave(requestId, notes = "") {
    return this.makeRequest(`/admin/leave-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: notes })
    });
  }

  async adminRejectLeave(requestId, notes = "") {
    return this.makeRequest(`/admin/leave-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: notes })
    });
  }

  // ==================== ADMIN - FACULTY UNAVAILABILITY ====================
  async getFacultyUnavailability(facultyId) {
    return this.makeRequest(`/admin/faculty/${facultyId}/unavailability`);
  }

  async addFacultyUnavailability(facultyId, unavailabilityData) {
    return this.makeRequest(`/admin/faculty/${facultyId}/unavailability`, {
      method: 'POST',
      body: JSON.stringify(unavailabilityData)
    });
  }

  async deleteFacultyUnavailability(slotId) {
    return this.makeRequest(`/admin/unavailability/${slotId}`, {
      method: 'DELETE'
    });
  }

  // ==================== ADMIN - COURSES ====================

  async getCourses() {
    return this.makeRequest('/admin/courses');
  }

  async addCourse(courseData) {
    return this.makeRequest('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  }

  async updateCourse(courseId, courseData) {
    return this.makeRequest(`/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    });
  }

  async deleteCourse(courseId) {
    return this.makeRequest(`/admin/courses/${courseId}`, {
      method: 'DELETE'
    });
  }

  // ==================== ADMIN - ROOMS ====================

  async getRooms() {
    return this.makeRequest('/admin/rooms');
  }

  async addRoom(roomData) {
    return this.makeRequest('/admin/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
  }

  // ==================== ADMIN - SECTIONS ====================

  async getSections(deptName = null, year = null) {
    let url = '/admin/sections';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async addSection(sectionData) {
    return this.makeRequest('/admin/sections', {
      method: 'POST',
      body: JSON.stringify(sectionData)
    });
  }

  // ==================== ADMIN - STUDENTS ====================

  async getStudents() {
    return this.makeRequest('/admin/students');
  }

  async addStudent(studentData) {
    return this.makeRequest('/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  }

  async getStudent(studentId) {
    return this.makeRequest(`/admin/students/${studentId}`);
  }

  async updateStudent(studentId, studentData) {
    return this.makeRequest(`/admin/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  }

  async deleteStudent(studentId) {
    return this.makeRequest(`/admin/students/${studentId}`, {
      method: 'DELETE'
    });
  }

  async deleteBulkStudents(studentIds) {
    return this.makeRequest('/admin/students/delete_bulk', {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds })
    });
  }

  // ==================== ADMIN - COURSE ALLOCATIONS ====================

  async getCourseAllocations(deptName = null, year = null) {
    let url = '/admin/allocations';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async setCourseAllocation(allocationData) {
    return this.makeRequest('/admin/allocations', {
      method: 'POST',
      body: JSON.stringify(allocationData)
    });
  }

  // ==================== ADMIN - TIMETABLE ====================

  async generateTimetable() {
    return this.makeRequest('/admin/generate_timetable', {
      method: 'POST'
    });
  }

  // ==================== ADMIN - SWAP REQUESTS ====================

  async getAdminSwapRequests(status = 'pending') {
    return this.makeRequest(`/admin/swap-requests?status=${status}`);
  }

  async approveSwapRequest(requestId) {
    return this.makeRequest(`/admin/swap-requests/${requestId}/approve`, {
      method: 'POST'
    });
  }

  async rejectSwapRequest(requestId, reason) {
    return this.makeRequest(`/admin/swap-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // ==================== ADMIN - LEAVE REQUESTS ====================

  async getAdminLeaveRequests(status = 'pending', department = null, leaveType = null) {
    let url = `/admin/leave-requests?status=${status}`;
    if (department) url += `&department=${department}`;
    if (leaveType) url += `&leave_type=${leaveType}`;
    return this.makeRequest(url);
  }

  async getAdminLeaveRequestDetails(requestId) {
    return this.makeRequest(`/admin/leave-requests/${requestId}`);
  }

  async approveLeaveRequest(requestId, adminNotes = '') {
    return this.makeRequest(`/admin/leave-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: adminNotes })
    });
  }

  async rejectLeaveRequest(requestId, adminNotes) {
    return this.makeRequest(`/admin/leave-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: adminNotes })
    });
  }

  async getLeaveStats() {
    return this.makeRequest('/admin/leave-requests/stats');
  }

  async bulkLeaveAction(action, requestIds, adminNotes = '') {
    return this.makeRequest('/admin/leave-requests/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ action, request_ids: requestIds, admin_notes: adminNotes })
    });
  }

  // ==================== TEACHER - ROOM OCCUPANCY ====================

  async markRoom(roomId, status, notes = '') {
    return this.makeRequest('/teacher/mark_room', {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId, status, notes })
    });
  }

  async getRoomStatus() {
    return this.makeRequest('/rooms/status');
  }

  // ==================== TEACHER - TIMETABLE ====================

  async getTeacherTimetable() {
    return this.makeRequest('/teacher/timetable');
  }

  // ==================== TEACHER - SWAP REQUESTS ====================

  async getTeacherSwapRequests() {
    return this.makeRequest('/teacher/swap-requests');
  }

  async createSwapRequest(swapData) {
    return this.makeRequest('/teacher/swap-requests', {
      method: 'POST',
      body: JSON.stringify(swapData)
    });
  }

  // ==================== STUDENT - TIMETABLE ====================

  async getStudentTimetable() {
    return this.makeRequest('/student/timetable');
  }

  async getStudentProfile() {
    return this.makeRequest('/student/profile');
  }

  // ==================== LEAVE REQUESTS (All Users) ====================

  async submitLeaveRequest(leaveData) {
    return this.makeRequest('/leave/request', {
      method: 'POST',
      body: JSON.stringify(leaveData)
    });
  }

  async getMyLeaveRequests(status = null) {
    let url = '/leave/my-requests';
    if (status) url += `?status=${status}`;
    return this.makeRequest(url);
  }

  async getLeaveRequestDetails(requestId) {
    return this.makeRequest(`/leave/request/${requestId}`);
  }

  async updateLeaveRequest(requestId, leaveData) {
    return this.makeRequest(`/leave/request/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify(leaveData)
    });
  }

  async cancelLeaveRequest(requestId) {
    return this.makeRequest(`/leave/request/${requestId}`, {
      method: 'DELETE'
    });
  }

  // ==================== GENERAL - TIMETABLE ====================

  async getTimetable(filters = {}) {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    return this.makeRequest(`/get_timetable${queryString ? `?${queryString}` : ''}`);
  }

  // ==================== LEGACY ENDPOINTS (Backward Compatibility) ====================

  async getCoursesLegacy(deptName = null, year = null) {
    let url = '/get_courses';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async getFacultyLegacy() {
    return this.makeRequest('/get_faculty');
  }

  async getRoomsLegacy() {
    return this.makeRequest('/get_rooms');
  }

  async getSectionsLegacy(deptName = null, year = null) {
    let url = '/get_sections';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async setCourseAllocationLegacy(allocationData) {
    return this.makeRequest('/set_course_allocation', {
      method: 'POST',
      body: JSON.stringify(allocationData)
    });
  }

  async getCourseAllocationsLegacy(deptName = null, year = null) {
    let url = '/get_course_allocations';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async generateTimetableLegacy() {
    return this.makeRequest('/generate_timetable', {
      method: 'POST'
    });
  }

  // ==================== CSV OPERATIONS ====================

  async generateCSVs() {
    return this.makeRequest('/generate_csvs', {
      method: 'POST'
    });
  }

  async uploadDepartments(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/upload/departments', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set content-type
    });
  }

  async uploadFaculty(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/upload/faculty', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  async uploadSections(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/upload/sections', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  async uploadStudents(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/upload/students', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  // ==================== CHATBOT / AI ASSISTANT ====================

  async sendChatMessage(message) {
    return this.makeRequest('/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  async getChatHistory() {
    return this.makeRequest('/api/conversation');
  }

  async clearChatHistory() {
    return this.makeRequest('/api/clear', {
      method: 'POST'
    });
  }

  // ==================== ANNOUNCEMENTS ====================

  async getAnnouncements() {
    return this.makeRequest('/api/announcements');
  }

  async createAnnouncement(announcementData) {
    return this.makeRequest('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    });
  }

  // ==================== LEGACY ENDPOINTS (Backward Compatibility) ====================

  async addDepartmentLegacy(deptName) {
    return this.makeRequest('/add_department', {
      method: 'POST',
      body: JSON.stringify({ dept_name: deptName })
    });
  }

  async getDepartmentsLegacy() {
    return this.makeRequest('/get_departments');
  }

  async addFacultyLegacy(facultyData) {
    return this.makeRequest('/add_faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData)
    });
  }

  async getFacultyLegacy() {
    return this.makeRequest('/get_faculty');
  }

  async addCourseLegacy(courseData) {
    return this.makeRequest('/add_course', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  }

  async getCoursesLegacy(deptName = null, year = null) {
    let url = '/get_courses';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async addRoomLegacy(roomData) {
    return this.makeRequest('/add_room', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
  }

  async getRoomsLegacy() {
    return this.makeRequest('/get_rooms');
  }

  async addSectionLegacy(sectionData) {
    return this.makeRequest('/add_section', {
      method: 'POST',
      body: JSON.stringify(sectionData)
    });
  }

  async getSectionsLegacy(deptName = null, year = null) {
    let url = '/get_sections';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async setCourseAllocationLegacy(allocationData) {
    return this.makeRequest('/set_course_allocation', {
      method: 'POST',
      body: JSON.stringify(allocationData)
    });
  }

  async getCourseAllocationsLegacy(deptName = null, year = null) {
    let url = '/get_course_allocations';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async generateTimetableLegacy() {
    return this.makeRequest('/generate_timetable', {
      method: 'POST'
    });
  }

  // ==================== ATTENDANCE ====================

  async getDetailedAttendance() {
    return this.makeRequest('/student/attendance/details');
  }

  async getAttendanceForDate(date, department, year, section) {
    const params = new URLSearchParams({ date, department, year, section });
    return this.makeRequest(`/teacher/attendance/view?${params.toString()}`);
  }

  async getTeacherSections(department, year) {
    return this.makeRequest(`/teacher/sections?department=${encodeURIComponent(department)}&year=${year}`);
  }

  async getCourses(department, year) {
    return this.makeRequest(`/teacher/courses?department=${encodeURIComponent(department)}&year=${year}`);
  }

  async getTeacherStudents(department, year, section) {
    const params = new URLSearchParams({ department, year, section });
    return this.makeRequest(`/teacher/students?${params.toString()}`);
  }

  async markAttendance(attendanceData) {
    return this.makeRequest('/teacher/mark-attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData)
    });
  }
  // ==================== NOTIFICATIONS ====================

  async getNotifications() {
    return this.makeRequest('/api/notifications');
  }

  async markNotificationRead(id) {
    return this.makeRequest(`/api/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return this.makeRequest('/api/notifications/read-all', {
      method: 'PUT'
    });
  }

  async clearAllNotifications() {
    return this.makeRequest('/api/notifications', {
      method: 'DELETE'
    });
  }

  async getNotificationPreferences() {
    return this.makeRequest('/api/notifications/preferences');
  }

  async updateNotificationPreferences(prefs) {
    return this.makeRequest('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs)
    });
  }

  // ==================== RESOURCE MANAGEMENT ====================

  async getResources() {
    return this.makeRequest('/api/resources');
  }

  async getBookings() {
    return this.makeRequest('/api/bookings');
  }

  async createBooking(bookingData) {
    return this.makeRequest('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async updateBookingStatus(bookingId, status) {
    return this.makeRequest(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
  async sendNotification(notificationData) {
    return this.makeRequest('/api/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  }
  // ==================== GOOGLE CALENDAR ====================

  async getGoogleAuthUrl(redirectUri) {
    return this.makeRequest(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
  }

  async connectGoogleCalendar(code, redirectUri) {
    return this.makeRequest('/api/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri })
    });
  }

  async getGoogleCalendarStatus() {
    return this.makeRequest('/api/calendar/status');
  }

  async syncGoogleCalendar() {
    return this.makeRequest('/api/calendar/sync', { method: 'POST' });
  }

  async disconnectGoogleCalendar() {
    return this.makeRequest('/api/calendar/disconnect', { method: 'POST' });
  }

  // ==================== ADMIN LEAVE MANAGEMENT ====================

  async adminGetAllLeaveRequests(status = 'pending') {
    return this.makeRequest('/api/leave/admin/all?status=' + status);
  }

  async adminApproveLeave(id, notes = '') {
    return this.makeRequest('/api/leave/admin/approve/' + id, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async adminRejectLeave(id, notes) {
    return this.makeRequest('/api/leave/admin/reject/' + id, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  // ==================== ADMIN TIMETABLE MANAGEMENT ====================

  async adminUpdateTimetable(id, data) {
    return this.makeRequest('/admin/timetable/' + id, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async adminDeleteTimetable(id) {
    return this.makeRequest('/admin/timetable/' + id, { method: 'DELETE' });
  }

  async getMeetings() {
    return this.makeRequest('/api/meetings');
  }

  async adminCreateMeeting(meetingData) {
    return this.makeRequest('/api/meetings/create', {
      method: 'POST',
      body: JSON.stringify(meetingData)
    });
  }
    async getCalendarStatus() {
        return this.makeRequest('/api/calendar/status');
    }

    async createMeeting(meetingData) {
        return this.adminCreateMeeting(meetingData);
    }

    // ==================== NOTIFICATIONS ====================

    async getNotifications() {
        return this.makeRequest('/api/notifications');
    }

    async markNotificationRead(id) {
        return this.makeRequest(`/api/notifications/${id}/read`, { method: 'PUT' });
    }

    async markAllNotificationsRead() {
        return this.makeRequest('/api/notifications/read-all', { method: 'PUT' });
    }

    async clearAllNotifications() {
        return this.makeRequest('/api/notifications', { method: 'DELETE' });
    }

    async getNotificationPreferences() {
        return this.makeRequest('/api/notifications/preferences');
    }

    async updateNotificationPreferences(data) {
        return this.makeRequest('/api/notifications/preferences', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async sendNotification(data) {
        return this.makeRequest('/api/admin/notifications/send', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getNotificationTargets() {
        return this.makeRequest('/api/admin/notifications/targets');
    }

    /**
     * Send notification with optional file attachment.
     * @param {FormData} formData - must contain: title, message, target_audience, file (optional)
     */
    async sendNotificationWithFile(formData) {
        // makeRequest already handles FormData correctly (no Content-Type override)
        return this.makeRequest('/api/admin/notifications/send-with-file', {
            method: 'POST',
            body: formData,
        });
    }

    /**
     * Generic bulk import method for CSV files.
     * @param {string} endpoint - The upload endpoint (e.g., '/upload/courses')
     * @param {FormData} formData - FormData containing the 'file' field
     */
    async bulkImport(endpoint, formData) {
        return this.makeRequest(`/api${endpoint}`, {
            method: 'POST',
            body: formData,
        });
    }
}

export default new ApiService();