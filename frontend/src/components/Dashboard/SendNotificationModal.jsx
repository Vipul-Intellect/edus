import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../Ui/dialog';
import { Button } from '../Ui/button';
import { Input } from '../Ui/input';
import { Label } from '../Ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Ui/select';
import { BellRing, Send, Users, Building2, BookOpen, User, Search, X, Loader2 } from 'lucide-react';
import ApiService from '../../services/api';

const AUDIENCE_OPTIONS = [
    { value: 'all',        label: 'Everyone',              icon: Users,     desc: 'All active users on the platform' },
    { value: 'role',       label: 'By Role',               icon: Users,     desc: 'All students, teachers or admins' },
    { value: 'department', label: 'By Department',         icon: Building2, desc: 'Everyone in a specific department' },
    { value: 'section',    label: 'By Section (Students)', icon: BookOpen,  desc: 'Students in a specific section' },
    { value: 'user',       label: 'Specific Person',       icon: User,      desc: 'Send to one individual user' },
];

const SendNotificationModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        target_audience: 'all',
        target_role: 'student',
        target_user_id: '',
        target_dept_id: '',
        target_section_id: '',
    });

    const [targets, setTargets] = useState({ users: [], departments: [], sections: [] });
    const [targetsLoading, setTargetsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // User search state
    const [userSearch, setUserSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filtered sections based on selected department
    const filteredSections = formData.target_dept_id
        ? targets.sections.filter(s => s.dept_id === parseInt(formData.target_dept_id))
        : targets.sections;

    useEffect(() => {
        if (isOpen && targets.users.length === 0) {
            loadTargets();
        }
    }, [isOpen]);

    const loadTargets = async () => {
        setTargetsLoading(true);
        try {
            const data = await ApiService.getNotificationTargets();
            if (data) setTargets(data);
        } catch (err) {
            console.error('Failed to load notification targets:', err);
        } finally {
            setTargetsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const payload = {
                title: formData.title,
                message: formData.message,
                target_audience: formData.target_audience,
            };

            if (formData.target_audience === 'role') {
                payload.target_role = formData.target_role;
            } else if (formData.target_audience === 'user') {
                payload.target_user_id = parseInt(formData.target_user_id);
            } else if (formData.target_audience === 'department') {
                payload.target_dept_id = parseInt(formData.target_dept_id);
            } else if (formData.target_audience === 'section') {
                payload.target_section_id = parseInt(formData.target_section_id);
            }

            const result = await ApiService.sendNotification(payload);
            setSuccess(`✅ ${result?.message || 'Notification sent successfully!'}`);

            setTimeout(() => { handleClose(); }, 2500);
        } catch (err) {
            setError(err.message || 'Failed to send notification');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '', message: '', target_audience: 'all',
            target_role: 'student', target_user_id: '',
            target_dept_id: '', target_section_id: '',
        });
        setError('');
        setSuccess('');
        setUserSearch('');
        setSelectedUser(null);
        setShowSuggestions(false);
        onClose();
    };

    const filteredUsers = userSearch.trim().length > 0
        ? targets.users.filter(u =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.dept && u.dept.toLowerCase().includes(userSearch.toLowerCase())) ||
            u.role.toLowerCase().includes(userSearch.toLowerCase())
          )
        : targets.users.slice(0, 8);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        set('target_user_id', String(user.id));
        setUserSearch(user.name);
        setShowSuggestions(false);
    };

    const handleClearUser = () => {
        setSelectedUser(null);
        set('target_user_id', '');
        setUserSearch('');
        setShowSuggestions(false);
    };

    const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

    const selectedAudience = AUDIENCE_OPTIONS.find(o => o.value === formData.target_audience);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <BellRing className="w-4 h-4 text-blue-600" />
                        </div>
                        Send Notification
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Broadcast an announcement to specific users, departments or sections.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Status Messages */}
                    {error && (
                        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <span className="text-base">⚠️</span> {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                            {success}
                        </div>
                    )}

                    {/* Audience Selector */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Target Audience</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {AUDIENCE_OPTIONS.map(opt => {
                                const Icon = opt.icon;
                                const isSelected = formData.target_audience === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => set('target_audience', opt.value)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{opt.label}</p>
                                            <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>{opt.desc}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Conditional Sub-Selectors */}
                    {formData.target_audience === 'role' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <Label>Which role?</Label>
                            <Select value={formData.target_role} onValueChange={v => set('target_role', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">All Students</SelectItem>
                                    <SelectItem value="teacher">All Teachers</SelectItem>
                                    <SelectItem value="admin">All Admins</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {formData.target_audience === 'user' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <Label>Search &amp; Select User</Label>
                            {targetsLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 p-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-9 pr-9 py-2 rounded-md border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Type a name, role or department..."
                                            value={userSearch}
                                            onChange={e => {
                                                setUserSearch(e.target.value);
                                                setSelectedUser(null);
                                                set('target_user_id', '');
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                            autoComplete="off"
                                        />
                                        {userSearch && (
                                            <button
                                                type="button"
                                                onClick={handleClearUser}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {showSuggestions && filteredUsers.length > 0 && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                            {filteredUsers.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onMouseDown={() => handleSelectUser(u)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                                                        selectedUser?.id === u.id ? 'bg-blue-50' : ''
                                                    }`}
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600">
                                                        {(u.name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                                                        <p className="text-xs text-slate-400 capitalize">{u.role}{u.dept ? ` · ${u.dept}` : ''}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {showSuggestions && userSearch.trim() && filteredUsers.length === 0 && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-400">
                                            No users found matching "{userSearch}"
                                        </div>
                                    )}

                                    {selectedUser && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                                            <User className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium">{selectedUser.name}</span>
                                            <span className="text-blue-400 capitalize text-xs">({selectedUser.role})</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {formData.target_audience === 'department' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <Label>Select Department</Label>
                            {targetsLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 p-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading departments...
                                </div>
                            ) : (
                                <Select value={formData.target_dept_id} onValueChange={v => set('target_dept_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Choose a department..." /></SelectTrigger>
                                    <SelectContent>
                                        {targets.departments.map(d => (
                                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {formData.target_audience === 'section' && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <Label>Filter by Department (optional)</Label>
                                {targetsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 p-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                    </div>
                                ) : (
                                    <Select value={formData.target_dept_id} onValueChange={v => {
                                        set('target_dept_id', v);
                                        set('target_section_id', ''); // reset section when dept changes
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="All departments..." /></SelectTrigger>
                                        <SelectContent>
                                            {targets.departments.map(d => (
                                                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Select Section <span className="text-red-500">*</span></Label>
                                <Select value={formData.target_section_id} onValueChange={v => set('target_section_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Choose a section..." /></SelectTrigger>
                                    <SelectContent className="max-h-52">
                                        {filteredSections.map(s => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                <span className="font-medium">Year {s.year} – Section {s.name}</span>
                                                {s.dept_name && <span className="ml-2 text-xs text-slate-400">· {s.dept_name}</span>}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-1" />

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="notif-title">
                            Notification Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="notif-title"
                            placeholder="e.g., Class cancelled tomorrow"
                            value={formData.title}
                            onChange={e => set('title', e.target.value)}
                            required
                        />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <Label htmlFor="notif-message">
                            Message <span className="text-red-500">*</span>
                        </Label>
                        <textarea
                            id="notif-message"
                            className="w-full flex min-h-[100px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 resize-y"
                            placeholder="Write the full announcement details here..."
                            value={formData.message}
                            onChange={e => set('message', e.target.value)}
                            required
                        />
                    </div>

                    <DialogFooter className="pt-2 gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !formData.title || !formData.message}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {loading ? 'Sending...' : 'Send Notification'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default SendNotificationModal;
