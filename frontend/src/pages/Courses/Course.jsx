import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Search, Filter, Edit, Trash2, Layers, AlertCircle, RefreshCw } from "lucide-react";

import CourseForm from "../../components/Courses/courseForm";
import BulkImportModal from "../../components/Dashboard/BulkImportModal";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Run both fetches independently — one failing won't block the other
      const [coursesResult, deptsResult] = await Promise.allSettled([
        api.makeRequest('/admin/courses'),   // direct call bypasses the duplicate getCourses problem
        api.getDepartments()
      ]);

      // Courses
      if (coursesResult.status === 'fulfilled') {
        const raw = coursesResult.value;
        const courseList = Array.isArray(raw)
          ? raw
          : (raw?.courses || raw?.data || []);
        setCourses(courseList);
      } else {
        console.error("Failed to load courses:", coursesResult.reason);
        setError(`Could not load courses: ${coursesResult.reason?.message || 'Server error'}`);
      }

      // Departments — fallback to extracting from courses if API fails
      if (deptsResult.status === 'fulfilled') {
        const raw = deptsResult.value;
        const deptList = Array.isArray(raw)
          ? raw
          : (raw?.departments || raw?.data || []);
        setDepartments(deptList.map(d => typeof d === 'string' ? d : d.dept_name).filter(Boolean));
      } else {
        // Fallback: derive unique dept names from whatever courses we loaded
        if (coursesResult.status === 'fulfilled') {
          const raw = coursesResult.value;
          const courseList = Array.isArray(raw) ? raw : (raw?.courses || raw?.data || []);
          const uniqueDepts = [...new Set(courseList.map(c => c.dept_name).filter(Boolean))];
          setDepartments(uniqueDepts);
        }
      }
    } catch (err) {
      console.error("Unexpected error loading data:", err);
      setError("Unexpected error. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (courseData) => {
    try {
      if (editingCourse) {
        await api.updateCourse(editingCourse.id, courseData);
      } else {
        await api.addCourse(courseData);
      }
      setShowForm(false);
      setEditingCourse(null);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to save course");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await api.deleteCourse(id);
      loadData();
    } catch (error) {
      alert(error.message || "Failed to delete course");
    }
  };

  const getDepartmentColor = (dept) => {
    const palette = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];
    if (!dept) return "bg-gray-100 text-gray-700 border-gray-200";
    // Deterministic color by dept name hash
    let hash = 0;
    for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setShowForm(true);
  };

  const filteredCourses = courses.filter(course => {
    const courseName = (course.name || '').toLowerCase();
    const courseCode = (course.code || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchLower || courseName.includes(searchLower) || courseCode.includes(searchLower);
    const courseDept = course.dept_name || course.department || '';
    const matchesDepartment = filterDepartment === "all" || courseDept === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Course Management
            </h1>
            <p className="text-gray-600 mt-1">Manage your college courses and curriculum</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowBulkModal(true)}
              variant="outline"
              className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Filter className="w-4 h-4 rotate-90" />
              Bulk Import
            </Button>
            <Button
              onClick={() => { setEditingCourse(null); setShowForm(true); }}
              className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Add New Course
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              className="text-red-600 hover:bg-red-100 gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search courses by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept, index) => (
                    <option key={`dept-${dept}-${index}`} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Form */}
        {showForm && (
          <CourseForm
            course={editingCourse}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingCourse(null);
            }}
          />
        )}

        {/* Courses Table */}
        <Card className="shadow-xl border-0 overflow-hidden bg-white/90 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Credits</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Year/Sem</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="h-10 bg-gray-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                      <p className="text-lg font-medium text-gray-400">
                        {error ? "Failed to load courses" : searchTerm || filterDepartment !== "all"
                          ? "No courses match your filters"
                          : "No courses yet — add one or bulk import"}
                      </p>
                      {!error && !searchTerm && filterDepartment === "all" && (
                        <Button
                          onClick={() => { setEditingCourse(null); setShowForm(true); }}
                          className="mt-4 bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add First Course
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr
                      key={course.id || course.course_id}
                      className="group hover:bg-blue-50/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{course.name}</span>
                          {course.faculty_name && (
                            <span className="text-xs text-gray-400 mt-0.5">👤 {course.faculty_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          variant="outline"
                          className={`${
                            course.type?.toLowerCase() === 'lab'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : course.type?.toLowerCase() === 'practical'
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : 'bg-orange-50 text-orange-700 border-orange-100'
                          } font-medium`}
                        >
                          {course.type || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-sm">
                          {course.credits ?? '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Y{course.year} – S{course.semester}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          variant="outline"
                          className={`${getDepartmentColor(course.dept_name || course.department)} font-medium px-2.5 py-0.5 rounded-full`}
                        >
                          {course.dept_name || course.department || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(course)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                            title="Edit course"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(course.id || course.course_id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100/50"
                            title="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Footer count */}
            {!isLoading && filteredCourses.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500">
                Showing {filteredCourses.length} of {courses.length} course{courses.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </Card>

        {/* Bulk Import Modal */}
        <BulkImportModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title="Bulk Import Courses"
          endpoint="/api/upload/courses"
          templateInfo="name, type, credits, year, semester, dept_name, hours_per_week, [faculty_name]"
          onSuccess={() => { setShowBulkModal(false); loadData(); }}
        />
      </div>
    </div>
  );
}
