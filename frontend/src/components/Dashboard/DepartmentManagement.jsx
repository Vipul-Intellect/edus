
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search } from "lucide-react";
import ApiService from "../../services/api";

export default function DepartmentManagement() {
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newDeptName, setNewDeptName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setIsLoading(true);
            const data = await ApiService.getDepartments();
            // API may return { departments: [...] } or a plain array
            const list = Array.isArray(data) ? data : (data?.departments || data?.data || []);
            setDepartments(list);
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddDepartment = async (e) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        try {
            setIsSubmitting(true);
            await ApiService.addDepartment(newDeptName);
            setNewDeptName("");
            setIsAddModalOpen(false);
            fetchDepartments(); // Refresh list
        } catch (error) {
            console.error("Failed to add department:", error);
            alert(error.message || "Failed to add department");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.dept_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Department Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">Loading departments...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Department Management
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Department
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Add Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Department</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddDepartment} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="deptName">Department Name</Label>
                                <Input
                                    id="deptName"
                                    placeholder="e.g. Computer Science"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || !newDeptName.trim()}>
                                    {isSubmitting ? "Adding..." : "Add Department"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Search */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search departments..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Departments Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">ID</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department Name</th>
                                <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDepartments.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-8 text-gray-500">
                                        No departments found
                                    </td>
                                </tr>
                            ) : (
                                filteredDepartments.map((dept) => (
                                    <tr key={dept.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-600">#{dept.id}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900">{dept.dept_name}</td>
                                        <td className="py-3 px-4 text-right">
                                            {/* Future: Add Edit/Delete buttons */}
                                            <span className="text-xs text-gray-400">View Only</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
