import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Bell, Send, CheckCircle, AlertCircle, Search } from 'lucide-react';
import ApiService from '../../services/api';

const AdminNotificationManager = () => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        target_audience: 'all', // all, role, user
        target_role: 'student', // student, teacher
        target_user_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [users, setUsers] = useState([]);
    
    // Custom Combobox State
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await ApiService.getUsers();
                if (Array.isArray(response)) {
                    setUsers(response);
                } else if (response && Array.isArray(response.users)) {
                    setUsers(response.users);
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        fetchUsers();
    }, []);

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
        setStatus({ type: '', message: '' });

        try {
            const payload = {
                title: formData.title,
                message: formData.message,
                target_audience: formData.target_audience
            };

            if (formData.target_audience === 'role') {
                payload.target_role = formData.target_role;
            } else if (formData.target_audience === 'user') {
                if (!formData.target_user_id) {
                    throw new Error("Please select a valid user from the dropdown.");
                }
                payload.target_user_id = formData.target_user_id;
            }

            const response = await ApiService.sendNotification(payload);

            setStatus({
                type: 'success',
                message: response.message || 'Notification sent successfully!'
            });

            // Reset form
            setFormData({
                title: '',
                message: '',
                target_audience: 'all',
                target_role: 'student',
                target_user_id: ''
            });
            setSearchQuery('');

        } catch (err) {
            console.error(err);
            setStatus({
                type: 'error',
                message: err.message || 'Failed to send notification'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const rawName = u.full_name || u.name || '';
        const nameMatch = rawName.toLowerCase().includes(searchQuery.toLowerCase());
        const usernameMatch = (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
        const idMatch = ((u.id || u.user_id || '') + '').toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || usernameMatch || idMatch;
    });

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                    <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notification Manager</h1>
                    <p className="text-gray-500">Send announcements and alerts to users</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Send New Notification</CardTitle>
                    <CardDescription>Compose a message to send to students, teachers, or specific users.</CardDescription>
                </CardHeader>
                <CardContent>
                    {status.message && (
                        <div className={`p-4 mb-6 rounded-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {status.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="target_audience">Target Audience</Label>
                                <Select
                                    value={formData.target_audience}
                                    onValueChange={(val) => {
                                        handleSelectChange('target_audience', val);
                                        if (val !== 'user') setSearchQuery('');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        <SelectItem value="role">Specific Role</SelectItem>
                                        <SelectItem value="user">Specific User (Name & Username)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.target_audience === 'role' && (
                                <div className="space-y-2">
                                    <Label htmlFor="target_role">Select Role</Label>
                                    <Select
                                        value={formData.target_role}
                                        onValueChange={(val) => handleSelectChange('target_role', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="student">Students</SelectItem>
                                            <SelectItem value="teacher">Teachers</SelectItem>
                                            <SelectItem value="admin">Admins</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {formData.target_audience === 'user' && (
                                <div className="space-y-2 relative">
                                    <Label htmlFor="target_user_id">Search User</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Type name or username..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowDropdown(true);
                                                handleSelectChange('target_user_id', ''); // clear actual selection while typing
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                            required={!formData.target_user_id}
                                        />
                                    </div>
                                    
                                    {showDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map((u) => {
                                                    const userId = u.id || u.user_id;
                                                    const displayName = u.full_name || u.name || 'Unknown User';
                                                    const displayUsername = u.username ? `(@${u.username})` : '';
                                                    return (
                                                        <div 
                                                            key={userId} 
                                                            className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent input from losing focus
                                                                handleSelectChange('target_user_id', userId);
                                                                setSearchQuery(`${displayName} ${displayUsername}`);
                                                                setShowDropdown(false);
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900">{displayName} <span className="text-gray-500 font-normal">{displayUsername}</span></span>
                                                            </div>
                                                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full capitalize">{u.role}</span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 italic text-center">No users found matching "{searchQuery}"</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Notification Title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="Type your message here..."
                                value={formData.message}
                                onChange={handleChange}
                                required
                                className="min-h-[120px]"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading} className="w-full md:w-auto">
                                {loading ? 'Sending...' : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Notification
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminNotificationManager;
