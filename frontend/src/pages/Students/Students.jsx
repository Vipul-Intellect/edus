import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search, Filter } from "lucide-react";

import StudentForm from "../../components/Students/StudentForm";
import StudentCard from "../../components/Students/StudentCard";

export default function Students() {
    const [students, setStudents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("all");
    const [filterYear, setFilterYear] = useState("all");
    const [filterSection, setFilterSection] = useState("all");
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [studentsData, departmentsData, sectionsData] = await Promise.all([
                api.getStudents(),
                api.getDepartments(),
                api.getSections()
            ]);

            const studentList = Array.isArray(studentsData) ? studentsData : (studentsData?.students || studentsData?.data || []);
            const deptList = Array.isArray(departmentsData) ? departmentsData : (departmentsData?.departments || departmentsData?.data || []);
            const sectionList = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || sectionsData?.data || []);

            setStudents(studentList);
            setDepartments(deptList);
            setSections(sectionList);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
            setStudents([]);
            setDepartments([]);
            setSections([]);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (studentData) => {
        try {
            await api.addStudent(studentData);
            alert("Student added successfully!");
            setShowForm(false);
            setEditingStudent(null);
            loadData();
        } catch (error) {
            console.error('Error submitting student:', error);
            alert(`Error: ${error.message || 'Failed to save student'}`);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = filterDepartment === "all" || student.dept_name === filterDepartment;
        const matchesYear = filterYear === "all" || student.year === parseInt(filterYear);
        const matchesSection = filterSection === "all" || student.section_name === filterSection;
        return matchesSearch && matchesDepartment && matchesYear && matchesSection;
    });

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Student Management
                        </h1>
                        <p className="text-gray-600 mt-1">Manage students and their information</p>
                    </div>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:scale-105 transition-all duration-300"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Student
                    </Button>
                </div>

                {/* Search and Filters */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search students by name or username..."
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
                                    {(Array.isArray(departments) ? departments : []).map(dept => (
                                        <option key={dept.id} value={dept.dept_name}>{dept.dept_name}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                >
                                    <option value="all">All Years</option>
                                    <option value="1">Year 1</option>
                                    <option value="2">Year 2</option>
                                    <option value="3">Year 3</option>
                                    <option value="4">Year 4</option>
                                </select>
                                <select
                                    value={filterSection}
                                    onChange={(e) => setFilterSection(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                >
                                    <option value="all">All Sections</option>
                                    {[...new Set((Array.isArray(sections) ? sections : []).map(s => s.name))].sort().map(sectionName => (
                                        <option key={sectionName} value={sectionName}>{sectionName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Student Form */}
                {showForm && (
                    <StudentForm
                        student={editingStudent}
                        departments={departments}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingStudent(null);
                        }}
                    />
                )}

                {/* Students Grid */}
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
                    ) : filteredStudents.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No students found</h3>
                            <p className="text-gray-500">
                                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first student to get started'}
                            </p>
                        </div>
                    ) : (
                        filteredStudents.map((student) => (
                            <StudentCard
                                key={student.id}
                                student={student}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
