
import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Save, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegisterUser = () => {
    const [role, setRole] = useState('student');
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        dept_name: '',
        year: '',
        section_name: '',
        roll_number: ''
    });

    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deptLoading, setDeptLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (role === 'student' && formData.dept_name && formData.year) {
            fetchSections();
        }
    }, [formData.dept_name, formData.year, role]);

    const fetchDepartments = async () => {
        try {
            const data = await ApiService.getDepartments();
            const list = Array.isArray(data) ? data : (data?.departments || data?.data || []);
            setDepartments(list);
        } catch (err) {
            console.error("Failed to fetch departments", err);
            setError("Failed to load departments.");
        } finally {
            setDeptLoading(false);
        }
    };

    const fetchSections = async () => {
        try {
            const data = await ApiService.getSections(formData.dept_name, formData.year);
            const list = Array.isArray(data) ? data : (data?.sections || data?.data || []);
            setSections(list);
        } catch (err) {
            console.error("Failed to fetch sections", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = { ...formData, role };

            // Clean up payload based on role
            if (role === 'teacher') {
                delete payload.year;
                delete payload.section_name;
                delete payload.roll_number;
            }

            await ApiService.registerUser(payload);
            setSuccess(`Successfully registered new ${role}: ${formData.full_name}`);

            // Reset form but keep some context
            setFormData({
                username: '',
                password: '',
                full_name: '',
                email: '',
                phone: '',
                dept_name: formData.dept_name,
                year: formData.year,
                section_name: '',
                roll_number: ''
            });

        } catch (err) {
            setError(err.message || "Failed to register user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-blue-600" />
                        Register New User
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select
                                    value={formData.dept_name}
                                    onValueChange={(val) => handleSelectChange('dept_name', val)}
                                    disabled={deptLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.dept_name}>
                                                {d.dept_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="e.g. johndoe123"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Minimum 6 characters"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email (Optional)</Label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone (Optional)</Label>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91 9876543210"
                                />
                            </div>
                        </div>

                        {role === 'student' && (
                            <div className="p-4 bg-gray-50 rounded-lg space-y-4 border">
                                <h3 className="font-semibold text-gray-700">Student Details</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Year</Label>
                                        <Select
                                            value={formData.year}
                                            onValueChange={(val) => {
                                                setFormData(prev => ({ ...prev, year: val }));
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1st Year</SelectItem>
                                                <SelectItem value="2">2nd Year</SelectItem>
                                                <SelectItem value="3">3rd Year</SelectItem>
                                                <SelectItem value="4">4th Year</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Section</Label>
                                        <Select
                                            value={formData.section_name}
                                            onValueChange={(val) => handleSelectChange('section_name', val)}
                                            disabled={!formData.year || !formData.dept_name}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map(s => (
                                                    <SelectItem key={s.id} value={s.name}>
                                                        Section {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Roll Number</Label>
                                        <Input
                                            name="roll_number"
                                            value={formData.roll_number}
                                            onChange={handleChange}
                                            placeholder="e.g. CS21001"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Register User
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default RegisterUser;
