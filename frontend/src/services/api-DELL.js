import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const loginUser = (credentials) => API.post("/login", credentials);
export const getStudentTimetable = () => API.get("/student/timetable");
export const getAnnouncements = () => API.get("/api/announcements");
export const getUserRole = () => localStorage.getItem("user_role");

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_id");
};

// You can add all other API functions here as well.
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor for Global Error Handling
// Automatically redirects to login if a 401 Unauthorized error occurs.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_role");
      // Redirect to the login page
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);


// ====================================================================
// API Service Objects - A single, consistent way to call endpoints
// ====================================================================

export const Auth = {
  login: (credentials) => API.post("/login", credentials),
  adminLogin: (credentials) => API.post("/admin/login", credentials),
  register: (userData) => API.post("/register", userData),
};

export const Department = {
  list: () => API.get("/admin/departments"),
  create: (data) => API.post("/admin/departments", data),
};

export const Faculty = {
  list: () => API.get("/admin/faculty"),
  create: (data) => API.post("/admin/faculty", data),
  update: (id, data) => API.put(`/admin/faculty/${id}`, data),
  delete: (id) => API.delete(`/admin/faculty/${id}`),
  getUnavailability: (facultyId) => API.get(`/admin/faculty/${facultyId}/unavailability`),
  addUnavailability: (facultyId, data) => API.post(`/admin/faculty/${facultyId}/unavailability`, data),
  deleteUnavailability: (slotId) => API.delete(`/admin/unavailability/${slotId}`),
};

export const Course = {
  list: (params) => API.get("/admin/courses", { params }),
  create: (data) => API.post("/admin/courses", data),
  update: (id, data) => API.put(`/admin/courses/${id}`, data),
  delete: (id) => API.delete(`/admin/courses/${id}`),
};

export const Room = {
  list: () => API.get("/admin/rooms"),
  create: (data) => API.post("/admin/rooms", data),
  update: (id, data) => API.put(`/admin/rooms/${id}`, data),
  delete: (id) => API.delete(`/admin/rooms/${id}`),
  getStatuses: () => API.get("/rooms/status"),
  markStatus: (data) => API.post("/teacher/mark_room", data),
};

export const Student = {
  list: () => API.get("/admin/students"),
  create: (data) => API.post("/admin/students", data),
  get: (id) => API.get(`/admin/students/${id}`),
  update: (id, data) => API.put(`/admin/students/${id}`, data),
  delete: (id) => API.delete(`/admin/students/${id}`),
  deleteBulk: (studentIds) => API.post("/admin/students/delete_bulk", { student_ids: studentIds }),
};

export const Section = {
  list: () => API.get("/admin/sections"),
  create: (data) => API.post("/admin/sections", data),
};

export const Timetable = {
  generate: (data) => API.post("/generate_timetable", data),
  get: (params) => API.get("/get_timetable", { params }),
  getForTeacher: () => API.get("/teacher/timetable"),
  getForStudent: () => API.get("/student/timetable"),
};

export const CourseAllocation = {
  set: (data) => API.post("/set_course_allocation", data),
  get: () => API.get("/get_course_allocations"),
};

export const LeaveRequest = {
  // For students/teachers
  submit: (data) => API.post("/leave/request", data),
  getMyRequests: () => API.get("/leave/my-requests"),
  getRequest: (id) => API.get(`/leave/request/${id}`),
  update: (id, data) => API.put(`/leave/request/${id}`, data),
  cancel: (id) => API.delete(`/leave/request/${id}`),
  // For admins
  getAll: (params) => API.get("/admin/leave-requests", { params }),
  approve: (id, notes) => API.post(`/admin/leave-requests/${id}/approve`, { admin_notes: notes }),
  reject: (id, notes) => API.post(`/admin/leave-requests/${id}/reject`, { admin_notes: notes }),
  getStats: () => API.get("/admin/leave-requests/stats"),
  bulkAction: (data) => API.post("/admin/leave-requests/bulk-action", data),
};

export const SwapRequest = {
  // For teachers
  submit: (data) => API.post("/teacher/swap-requests", data),
  getForTeacher: () => API.get("/teacher/swap-requests"),
  // For admins
  getAll: (status) => API.get("/admin/swap-requests", { params: { status } }),
  approve: (id) => API.post(`/admin/swap-requests/${id}/approve`),
  reject: (id, reason) => API.post(`/admin/swap-requests/${id}/reject`, { reason }),
};

export const Chat = {
  sendMessage: (message) => API.post("/api/chatbot", { message }),
  getHistory: () => API.get("/api/chat/conversation"),
  clearHistory: () => API.post("/api/chat/clear"),
};

export const Announcement = {
  get: () => API.get("/api/announcements"),
  create: (data) => API.post("/api/announcements", data),
};

export const Upload = {
  departments: (file) => API.post("/api/upload/departments", createFormData(file)),
  sections: (file) => API.post("/api/upload/sections", createFormData(file)),
  faculty: (file) => API.post("/api/upload/faculty", createFormData(file)),
  students: (file) => API.post("/api/upload/students", createFormData(file)),
};

export const Export = {
  generateCSVs: () => API.post("/generate_csvs"),
};

// Helper for file uploads
function createFormData(file) {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}