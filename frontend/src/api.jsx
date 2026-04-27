// src/api.jsx
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = API_URL;

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

    // Don't set Content-Type for FormData (file uploads)
    if (!(options.body instanceof FormData)) {
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

      if (response.status === 403) {
        throw new Error('Access forbidden - insufficient permissions');
      }

      if (response.status === 404) {
        throw new Error('Resource not found');
      }

      if (response.status >= 500) {
        throw new Error('Server error - please try again later');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return { success: response.ok };
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection');
      }
      throw error;
    }
  }

  // ==================== AUTHENTICATION ====================

  async login(username, password) {
    const response = await this.makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
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

  async adminLogin(username, password) {
    const response = await this.makeRequest('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
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
    return this.makeRequest('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
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

  // Faculty Unavailability
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

  async updateRoom(roomId, roomData) {
    return this.makeRequest(`/admin/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData)
    });
  }

  async deleteRoom(roomId) {
    return this.makeRequest(`/admin/rooms/${roomId}`, {
      method: 'DELETE'
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

  async updateSection(sectionId, sectionData) {
    return this.makeRequest(`/admin/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(sectionData)
    });
  }

  async deleteSection(sectionId) {
    return this.makeRequest(`/admin/sections/${sectionId}`, {
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

  // ==================== CSV OPERATIONS ====================

  async generateCSVs() {
    return this.makeRequest('/generate_csvs', {
      method: 'POST'
    });
  }

  async uploadDepartments(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/api/upload/departments', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  async uploadFaculty(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/api/upload/faculty', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  async uploadSections(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/api/upload/sections', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  async uploadStudents(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/api/upload/students', {
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
    return this.makeRequest('/api/chat/conversation');
  }

  async clearChatHistory() {
    return this.makeRequest('/api/chat/clear', {
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

  // ==================== LEGACY/GENERAL ENDPOINTS ====================

  // General Department endpoints (non-admin)
  async getDepartmentsPublic() {
    return this.makeRequest('/get_departments');
  }

  async addDepartmentPublic(deptName) {
    return this.makeRequest('/add_department', {
      method: 'POST',
      body: JSON.stringify({ dept_name: deptName })
    });
  }

  // General Faculty endpoints
  async getFacultyPublic() {
    return this.makeRequest('/get_faculty');
  }

  async addFacultyPublic(facultyData) {
    return this.makeRequest('/add_faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData)
    });
  }

  // General Course endpoints
  async getCoursesPublic(deptName = null, year = null) {
    let url = '/get_courses';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async addCoursePublic(courseData) {
    return this.makeRequest('/add_course', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  }

  // General Room endpoints
  async getRoomsPublic() {
    return this.makeRequest('/get_rooms');
  }

  async addRoomPublic(roomData) {
    return this.makeRequest('/add_room', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
  }

  // General Section endpoints
  async getSectionsPublic(deptName = null, year = null) {
    let url = '/get_sections';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async addSectionPublic(sectionData) {
    return this.makeRequest('/add_section', {
      method: 'POST',
      body: JSON.stringify(sectionData)
    });
  }

  // Course Allocation endpoints
  async getCourseAllocationsPublic(deptName = null, year = null) {
    let url = '/get_course_allocations';
    const params = new URLSearchParams();

    if (deptName) params.append('dept_name', deptName);
    if (year) params.append('year', year);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async setCourseAllocationPublic(allocationData) {
    return this.makeRequest('/set_course_allocation', {
      method: 'POST',
      body: JSON.stringify(allocationData)
    });
  }

  // Timetable generation
  async generateTimetablePublic() {
    return this.makeRequest('/generate_timetable', {
      method: 'POST'
    });
  }

  // ==================== TIME SLOTS (for your existing data) ====================

  async getTimeSlots() {
    // This returns the standard time slots used by the backend
    return [
      { id: 1, time: "09:00", label: "09:00 AM" },
      { id: 2, time: "11:00", label: "11:00 AM" },
      { id: 3, time: "01:00", label: "01:00 PM" },
      { id: 4, time: "03:00", label: "03:00 PM" }
    ];
  }

  // ==================== CLASSES/TIMETABLE MANAGEMENT ====================

  // Get all classes (timetable entries)
  async getClasses(sortBy = "-created_date", limit = null) {
    const params = new URLSearchParams();
    if (sortBy) params.append('sort', sortBy);
    if (limit) params.append('limit', limit);

    const queryString = params.toString();
    return this.makeRequest(`/get_timetable${queryString ? `?${queryString}` : ''}`);
  }

  // Create a new class/timetable entry
  async createClass(classData) {
    // This would map to adding a course and generating timetable
    return this.makeRequest('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
  }

  // Update a class/timetable entry
  async updateClass(classId, classData) {
    return this.makeRequest(`/admin/courses/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
  }

  // Delete a class/timetable entry
  async deleteClass(classId) {
    return this.makeRequest(`/admin/courses/${classId}`, {
      method: 'DELETE'
    });
  }

  // Get single class details
  async getClass(classId) {
    return this.makeRequest(`/get_timetable?class_id=${classId}`);
  }

  // ==================== ASSESSMENTS & MARKS ====================

  async getAssessments(courseId = null) {
    let url = '/api/assessments';
    if (courseId) url += `?course_id=${courseId}`;
    return this.makeRequest(url);
  }

  async getTeacherStudents(courseId = null) {
    let url = '/api/teacher/students';
    if (courseId) url += `?course_id=${courseId}`;
    return this.makeRequest(url);
  }

  async getTeacherCourses() {
    return this.makeRequest('/api/teacher/my-courses');
  }

  async createAssessment(assessmentData) {
    return this.makeRequest('/api/assessments', {
      method: 'POST',
      body: JSON.stringify(assessmentData)
    });
  }

  async deleteAssessment(assessmentId) {
    return this.makeRequest(`/api/assessments/${assessmentId}`, {
      method: 'DELETE'
    });
  }

  async uploadMarks(assessmentId, marksData, isFile = false) {
    let body;
    if (isFile) {
      body = new FormData();
      body.append('assessment_id', assessmentId);
      body.append('file', marksData); // marksData is the file object
    } else {
      body = JSON.stringify({
        assessment_id: assessmentId,
        marks: marksData // marksData is the array of {student_id, marks}
      });
    }

    return this.makeRequest('/api/marks/upload', {
      method: 'POST',
      body
    });
  }

  async getStudentMarks() {
    return this.makeRequest('/api/student/marks');
  }

  // ==================== ASSIGNMENTS ====================

  async createAssignment(formData) {
    // formData should be a FormData object containing title, description, file, target_audience, etc.
    return this.makeRequest('/api/assignments/create', {
      method: 'POST',
      body: formData
    });
  }

  async getStudentAssignments() {
    return this.makeRequest('/api/student/assignments');
  }

  async getFacultyAssignments() {
    return this.makeRequest('/api/faculty/assignments');
  }

  // ==================== UTILITY METHODS ====================

  // Get API base URL
  getBaseURL() {
    return API_BASE_URL;
  }

  // Check backend connection
  async checkConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Format error messages
  formatError(error) {
    if (error.response && error.response.data && error.response.data.error) {
      return error.response.data.error;
    }
    return error.message || 'An unknown error occurred';
  }
}

// Export a singleton instance
export default new ApiService();