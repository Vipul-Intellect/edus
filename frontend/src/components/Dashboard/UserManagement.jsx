import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, Upload, FileUp } from "lucide-react";
import ApiService from "../../services/api";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState("student");
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [searchTerm, roleFilter, users]);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await ApiService.getUsers();
            const list = Array.isArray(data) ? data : (data?.users || data?.data || []);
            setUsers(list);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            alert("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by role
        if (roleFilter !== "all") {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        setFilteredUsers(filtered);
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case "admin":
                return "bg-red-100 text-red-800";
            case "teacher":
                return "bg-blue-100 text-blue-800";
            case "student":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            alert("Please select a file first");
            return;
        }

        try {
            setIsUploading(true);
            let response;
            if (uploadType === "student") {
                response = await ApiService.uploadStudents(uploadFile);
            } else {
                response = await ApiService.uploadFaculty(uploadFile);
            }

            alert(response.message || "Upload successful!");
            setIsUploadModalOpen(false);
            setUploadFile(null);
            fetchUsers(); // Refresh list
        } catch (error) {
            console.error("Upload failed:", error);
            alert(error.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        User Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">Loading users...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    User Management
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-gray-50 text-purple-600 border-purple-200"
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Bulk Import
                        </Button>
                        <Badge>{filteredUsers.length} users</Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Upload Modal */}
                <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Bulk Import Users</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label>User Type</Label>
                                <Select value={uploadType} onValueChange={setUploadType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Students</SelectItem>
                                        <SelectItem value="teacher">Teachers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>CSV File</Label>
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {uploadType === "student"
                                        ? "Required columns: username, password, dept_name, year, section_name"
                                        : "Required columns: faculty_name, dept_name, username, password, email, max_hours"
                                    }
                                </p>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isUploading || !uploadFile}>
                                    {isUploading ? (
                                        <>
                                            <FileUp className="w-4 h-4 mr-2 animate-bounce" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Search and Filter */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by username, name, or email..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Username</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Full Name</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Email</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Role</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900">{user.username}</td>
                                        <td className="py-3 px-4 text-gray-700">{user.full_name || '-'}</td>
                                        <td className="py-3 px-4 text-gray-700">{user.email || '-'}</td>
                                        <td className="py-3 px-4">
                                            <Badge className={getRoleBadgeColor(user.role)}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-gray-700">{user.department || '-'}</td>
                                        <td className="py-3 px-4">
                                            <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                {user.is_active ? "Active" : "Inactive"}
                                            </Badge>
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
