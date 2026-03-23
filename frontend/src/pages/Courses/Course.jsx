import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Search, Filter } from "lucide-react";

import CourseForm from "../../components/courses/CourseForm";
import CourseCard from "../../components/courses/CourseCard";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

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
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Add New Course
          </Button>
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

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No courses found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first course to get started'}
              </p>
            </div>
          ) : (
            (Array.isArray(filteredCourses) ? filteredCourses : []).map((course, index) => (
              <CourseCard
                key={course.id || course.course_id || `course-${index}`}
                course={course}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}