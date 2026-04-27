import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Search, Filter, Edit, Trash2, Layers, Clock } from "lucide-react";

import CourseForm from "../../components/courses/CourseForm";
import CourseCard from "../../components/courses/CourseCard";
import BulkImportModal from "../../components/Dashboard/BulkImportModal";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [coursesData, sectionsData] = await Promise.all([
      api.getCoursesLegacy(),
      api.getSections()
    ]);

    const courseList = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || coursesData?.data || []);
    const sectionList = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || sectionsData?.data || []);

    setCourses(courseList);
    setSections(sectionList);

    // Extract unique departments from sections
    const uniqueDepts = [...new Set(
      sectionList
        .map(s => s.dept_name)
        .filter(Boolean)
    )];
    setDepartments(uniqueDepts);
    setIsLoading(false);
  };

  const handleSubmit = async (courseData) => {
    if (editingCourse) {
      await api.updateCourse(editingCourse.id, courseData);
    } else {
      await api.addCourse(courseData);
    }
    setShowForm(false);
    setEditingCourse(null);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
        await api.deleteCourse(id);
        loadData();
    } catch (error) {
        alert("Failed to delete course");
    }
  };

  const getDepartmentColor = (dept) => {
    const colors = {
        "Computer Science": "bg-blue-100 text-blue-700 border-blue-200",
        "Mathematics": "bg-purple-100 text-purple-700 border-purple-200",
        "Physics": "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Engineering": "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[dept] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setShowForm(true);
  };

  const filteredCourses = courses.filter(course => {
    const courseName = (course.name || '').toLowerCase();
    const courseCode = (course.code || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = courseName.includes(searchLower) || courseCode.includes(searchLower);

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
              onClick={() => setShowForm(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Add New Course
            </Button>
          </div>
        </div>

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
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="all">All Departments</option>
                  {departments && Array.isArray(departments) ? departments.map((dept, index) => (
                    <option key={`dept-${dept}-${index}`} value={dept}>{dept}</option>
                  )) : null}
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

        {/* Courses List Table */}
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
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-lg font-medium">No courses found matching your criteria</p>
                                </td>
                            </tr>
                        ) : (
                            filteredCourses.map((course) => (
                                <tr key={course.id || course.course_id} className="group hover:bg-blue-50/30 transition-colors duration-200">
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{course.name}</span>
                                            <span className="text-xs text-blue-600 font-medium">{course.code || 'NO-CODE'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <Badge variant="outline" className={`${course.type?.toLowerCase() === 'theory' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'} font-medium`}>
                                            {course.type || 'N/A'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold">
                                            {course.credits || '?'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                            Y{course.year} - S{course.semester}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <Badge variant="outline" className={`${getDepartmentColor(course.dept_name || course.department)} font-medium px-2.5 py-0.5 rounded-full`}>
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
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDelete(course.id || course.course_id)}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100/50"
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
            </div>
        </Card>

        {/* Bulk Import Modal */}
        <BulkImportModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title="Bulk Import Courses"
          endpoint="/api/upload/courses"
          templateInfo="name, type, credits, year, semester, dept_name, hours_per_week, [faculty_name]"
          onSuccess={() => loadData()}
        />
      </div>
    </div>
  );
}