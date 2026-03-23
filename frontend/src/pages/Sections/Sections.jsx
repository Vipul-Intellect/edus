import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search, Filter } from "lucide-react";

import SectionForm from "../../components/Sections/SectionForm";
import SectionCard from "../../components/Sections/SectionCard";

export default function Sections() {
    const [sections, setSections] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("all");
    const [filterYear, setFilterYear] = useState("all");
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [sectionsData, departmentsData] = await Promise.all([
                api.getSections(),
                api.getDepartments()
            ]);

            const sectionList = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || sectionsData?.data || []);
            const deptList = Array.isArray(departmentsData) ? departmentsData : (departmentsData?.departments || departmentsData?.data || []);

            setSections(sectionList);
            setDepartments(deptList);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
            setSections([]);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (sectionData) => {
        try {
            await api.addSection(sectionData);
            alert("Section added successfully!");
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error('Error submitting section:', error);
            alert(`Error: ${error.message || 'Failed to save section'}`);
        }
    };

    const filteredSections = sections.filter(section => {
        const matchesSearch = section.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = filterDepartment === "all" || section.dept_id === parseInt(filterDepartment);
        const matchesYear = filterYear === "all" || section.year === parseInt(filterYear);
        return matchesSearch && matchesDepartment && matchesYear;
    });

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Sections Management
                        </h1>
                        <p className="text-gray-600 mt-1">Manage sections for each department and year</p>
                    </div>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:scale-105 transition-all duration-300"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Section
                    </Button>
                </div>

                {/* Search and Filters */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search sections..."
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
                                        <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
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
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section Form */}
                {showForm && (
                    <SectionForm
                        departments={departments}
                        onSubmit={handleSubmit}
                        onCancel={() => setShowForm(false)}
                    />
                )}

                {/* Sections Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {isLoading ? (
                        Array(8).fill(0).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="space-y-3">
                                        <div className="h-10 bg-gray-200 rounded"></div>
                                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : filteredSections.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No sections found</h3>
                            <p className="text-gray-500">
                                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first section to get started'}
                            </p>
                        </div>
                    ) : (
                        (Array.isArray(filteredSections) ? filteredSections : []).map((section) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                departments={departments}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
