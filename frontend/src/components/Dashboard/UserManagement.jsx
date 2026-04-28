import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, Upload, FileUp, Pencil, Trash2, ShieldCheck, ShieldOff, AlertTriangle, Loader2 } from "lucide-react";
import ApiService from "../../services/api";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    // Upload modal state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState("student");
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    // Edit modal state
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [editError, setEditError] = useState(null);

    // Delete confirm state
    const [deletingUser, setDeletingUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
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

    const fetchDepartments = async () => {
        try {
            const data = await ApiService.getDepartments();
            const list = Array.isArray(data) ? data : (data?.departments || []);
            setDepartments(list);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const filterUsers = () => {
        let filtered = users;
        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (roleFilter !== "all") {
            filtered = filtered.filter(user => user.role === roleFilter);
        }
        setFilteredUsers(filtered);
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case "admin": return "bg-red-100 text-red-800 border-red-200";
            case "teacher": return "bg-blue-100 text-blue-800 border-blue-200";
            case "student": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // ============ EDIT ============
    const openEditModal = (user) => {
        setEditingUser(user);
        setEditError(null);
        setEditForm({
            full_name: user.full_name || "",
            email: user.email || "",
            role: user.role,
            dept_name: user.department || "",
            is_active: user.is_active !== false,
            password: ""  // blank = don't change
        });
    };

    const handleEditSave = async () => {
        setIsSaving(true);
        setEditError(null);
        try {
            const payload = {
                full_name: editForm.full_name,
                email: editForm.email || null,
                role: editForm.role,
                dept_name: editForm.dept_name || null,
                is_active: editForm.is_active,
            };
            // Only include password if filled in
            if (editForm.password.trim()) {
                payload.password = editForm.password.trim();
            }
            await ApiService.updateUser(editingUser.id, payload);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setEditError(err.message || "Failed to update user");
        } finally {
            setIsSaving(false);
        }
    };

    // ============ DELETE ============
    const openDeleteConfirm = (user) => {
        setDeletingUser(user);
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            await ApiService.deleteUser(deletingUser.id);
            setDeletingUser(null);
            fetchUsers();
        } catch (err) {
            alert(err.message || "Failed to delete user");
        } finally {
            setIsDeleting(false);
        }
    };

    // ============ UPLOAD ============
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) { alert("Please select a file first"); return; }
        try {
            setIsUploading(true);
            setUploadResult(null);
            let response;
            if (uploadType === "student") {
                response = await ApiService.uploadStudents(uploadFile);
            } else {
                response = await ApiService.uploadFaculty(uploadFile);
            }
            setUploadResult(response);
            fetchUsers();
        } catch (error) {
            alert(error.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadResult(null);
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

                {/* ===== UPLOAD MODAL ===== */}
                <Dialog open={isUploadModalOpen} onOpenChange={handleCloseUploadModal}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Bulk Import Users</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            {!uploadResult ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>User Type</Label>
                                        <Select value={uploadType} onValueChange={setUploadType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="student">Students</SelectItem>
                                                <SelectItem value="teacher">Teachers</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>File (CSV or Excel)</Label>
                                        <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setUploadFile(e.target.files[0])} />
                                        <p className="text-xs text-muted-foreground">
                                            {uploadType === "student" ? (
                                                <>
                                                    <span className="font-medium text-gray-700">Required:</span>{" "}
                                                    username, password, dept_name, year, section_name
                                                    <br />
                                                    <span className="font-medium text-gray-700">Optional:</span>{" "}
                                                    full_name, email
                                                    <br />
                                                    <span className="text-gray-400">Supports .csv, .xlsx, .xls</span>
                                                </>
                                            ) : (
                                                <><span className="font-medium text-gray-700">Required:</span> faculty_name, dept_name, username, password, email, max_hours<br /><span className="text-gray-400">Supports .csv, .xlsx, .xls</span></>
                                            )}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                /* ── Result panel ── */
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                                            ✓ {uploadResult.added ?? 0} added
                                        </span>
                                        {(uploadResult.updated ?? 0) > 0 && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                ↻ {uploadResult.updated} updated
                                            </span>
                                        )}
                                        {(uploadResult.skipped ?? 0) > 0 && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                ⚠ {uploadResult.skipped} skipped
                                            </span>
                                        )}
                                        {(uploadResult.conflicts ?? 0) > 0 && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">
                                                ! {uploadResult.conflicts} conflicts
                                            </span>
                                        )}
                                    </div>

                                    {uploadResult.skip_reasons?.length > 0 && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-xs font-semibold text-amber-800 mb-1.5">Skipped or conflicting rows:</p>
                                            <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                                                {uploadResult.skip_reasons.map((r, i) => (
                                                    <li key={i} className="text-xs text-amber-700 font-mono">{r}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {(uploadResult.skipped ?? 0) === 0 && (
                                        <p className="text-sm text-green-700">All rows imported successfully!</p>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={handleCloseUploadModal}>
                                    {uploadResult ? "Done" : "Cancel"}
                                </Button>
                                {!uploadResult && (
                                    <Button type="submit" disabled={isUploading || !uploadFile}>
                                        {isUploading ? <><FileUp className="w-4 h-4 mr-2 animate-bounce" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload</>}
                                    </Button>
                                )}
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>


                {/* ===== EDIT MODAL ===== */}
                <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="w-4 h-4 text-indigo-600" />
                                Edit User — <span className="text-indigo-600">{editingUser?.username}</span>
                            </DialogTitle>
                        </DialogHeader>

                        {editError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {editError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Full Name</Label>
                                    <Input
                                        value={editForm.full_name}
                                        onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                        placeholder="Email (optional)"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Role</Label>
                                    <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="teacher">Teacher</SelectItem>
                                            <SelectItem value="student">Student</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Department</Label>
                                    <Select value={editForm.dept_name || "__none__"} onValueChange={v => setEditForm(p => ({ ...p, dept_name: v === "__none__" ? "" : v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">— None —</SelectItem>
                                            {departments.map(d => (
                                                <SelectItem key={d.id} value={d.dept_name}>{d.dept_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>New Password <span className="text-gray-400 font-normal">(leave blank to keep unchanged)</span></Label>
                                <Input
                                    type="password"
                                    value={editForm.password}
                                    onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                                    placeholder="Leave blank to keep current password"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Account Status</p>
                                    <p className="text-xs text-gray-500">{editForm.is_active ? "User can log in" : "Login is blocked"}</p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={editForm.is_active ? "outline" : "default"}
                                    className={editForm.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "bg-green-600 hover:bg-green-700 text-white"}
                                    onClick={() => setEditForm(p => ({ ...p, is_active: !p.is_active }))}
                                >
                                    {editForm.is_active
                                        ? <><ShieldOff className="w-3 h-3 mr-1" /> Deactivate</>
                                        : <><ShieldCheck className="w-3 h-3 mr-1" /> Activate</>
                                    }
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleEditSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ===== DELETE CONFIRM MODAL ===== */}
                <Dialog open={!!deletingUser} onOpenChange={(open) => { if (!open) setDeletingUser(null); }}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-700">
                                <Trash2 className="w-5 h-5" />
                                Delete User?
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-sm text-red-800">
                                    You are about to permanently delete:
                                </p>
                                <p className="font-bold text-red-900 mt-1">
                                    {deletingUser?.full_name || deletingUser?.username} <span className="font-normal text-red-700">(@{deletingUser?.username})</span>
                                </p>
                                <p className="text-xs text-red-600 mt-2">This action cannot be undone. All associated data will be removed.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={isDeleting}>Cancel</Button>
                            <Button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="w-4 h-4 mr-1" />Delete User</>}
                            </Button>
                        </DialogFooter>
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
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Username</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Full Name</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Email</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Role</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                                <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-500">No users found</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-gray-900">{user.username}</td>
                                        <td className="py-3 px-4 text-gray-700">{user.full_name || '-'}</td>
                                        <td className="py-3 px-4 text-gray-500 text-sm">{user.email || '-'}</td>
                                        <td className="py-3 px-4">
                                            <Badge className={`text-xs border ${getRoleBadgeColor(user.role)}`}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-gray-700 text-sm">{user.department || '-'}</td>
                                        <td className="py-3 px-4">
                                            <Badge className={user.is_active !== false ? "bg-green-100 text-green-800 border border-green-200" : "bg-gray-100 text-gray-500 border"}>
                                                {user.is_active !== false ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                    onClick={() => openEditModal(user)}
                                                >
                                                    <Pencil className="w-3 h-3 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => openDeleteConfirm(user)}
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
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
