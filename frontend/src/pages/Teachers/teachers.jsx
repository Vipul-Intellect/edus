import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search, Filter } from "lucide-react";

import TeacherForm from "../../components/Teachers/TeacherForm";
import TeacherCard from "../../components/Teachers/TeacherCard";

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[Teachers] Starting to load data...');
      setIsLoading(true);
      const [teachersData, departmentsData] = await Promise.all([
        api.getFaculty(),
        api.getDepartments()
      ]);

      const teacherList = Array.isArray(teachersData) ? teachersData : (teachersData?.faculty || teachersData?.data || []);
      const deptList = Array.isArray(departmentsData) ? departmentsData : (departmentsData?.departments || departmentsData?.data || []);

      setTeachers(teacherList);
      setDepartments(deptList);
      setIsLoading(false);
      console.log('[Teachers] Data loading complete, isLoading set to false');
    } catch (error) {
      console.error('[Teachers] Error loading data:', error);
      console.error('[Teachers] Error details:', error.message, error.stack);
      setTeachers([]);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (teacherData) => {
    try {
      if (editingTeacher) {
        await api.updateFaculty(editingTeacher.id, teacherData);
        alert("Teacher updated successfully!");
      } else {
        await api.addFaculty(teacherData);
        alert("Teacher added successfully!");
      }
      setShowForm(false);
      setEditingTeacher(null);
      loadData();
    } catch (error) {
      console.error('Error submitting teacher:', error);
      alert(`Error: ${error.message || 'Failed to save teacher'}`);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setShowForm(true);
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || teacher.dept_name === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  console.log('[Teachers] Filtering - Total teachers:', teachers.length, 'Filtered:', filteredTeachers.length, 'isLoading:', isLoading);


  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Teacher Management
            </h1>
            <p className="text-gray-600 mt-1">Manage faculty members and their information</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Add New Teacher
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search teachers by name or employee ID..."
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
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.dept_name}>{dept.dept_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Form */}
        {showForm && (
          <TeacherForm
            teacher={editingTeacher}
            departments={departments}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTeacher(null);
            }}
          />
        )}

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredTeachers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No teachers found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first teacher to get started'}
              </p>
            </div>
          ) : (
            filteredTeachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}