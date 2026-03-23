import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Calendar, Edit3, Trash2, Save, X, RefreshCw,
    ChevronDown, AlertCircle, Filter
} from "lucide-react";
import ApiService from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export default function AdminTimetableEditor() {
    const [timetable, setTimetable] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [filters, setFilters] = useState({ dept: '', day: '' });

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchTimetable = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ApiService.getTimetable();
            setTimetable(Array.isArray(data) ? data : (data?.timetable || []));
        } catch (e) {
            showToast('Failed to load timetable', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

    const startEdit = (entry) => {
        setEditingId(entry.id);
        setEditData({
            day: entry.day || '',
            start_time: entry.start_time || '',
            course_name: entry.course_name || '',
            faculty_name: entry.faculty_name || '',
            room: entry.room || '',
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleSave = async (id) => {
        setActionLoading(true);
        try {
            await ApiService.adminUpdateTimetable(id, editData);
            showToast('✅ Timetable entry updated');
            setEditingId(null);
            fetchTimetable();
        } catch (e) {
            showToast(e.message || 'Update failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setActionLoading(true);
        try {
            await ApiService.adminDeleteTimetable(id);
            showToast('🗑️ Entry deleted');
            setDeleteConfirm(null);
            fetchTimetable();
        } catch (e) {
            showToast(e.message || 'Delete failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filtered = timetable.filter(entry => {
        const matchDay = !filters.day || entry.day === filters.day;
        const matchDept = !filters.dept ||
            (entry.course_name || '').toLowerCase().includes(filters.dept.toLowerCase()) ||
            (entry.faculty_name || '').toLowerCase().includes(filters.dept.toLowerCase()) ||
            (entry.section || '').toLowerCase().includes(filters.dept.toLowerCase());
        return matchDay && matchDept;
    });

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Delete Entry?</h3>
                                <p className="text-xs text-gray-500">This will also remove the Google Calendar event for all synced users.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-4">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={actionLoading}
                                onClick={() => handleDelete(deleteConfirm)}
                            >
                                {actionLoading ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            Timetable Manager
                            <span className="text-sm font-normal text-gray-500">({filtered.length} entries)</span>
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Day filter */}
                            <select
                                value={filters.day}
                                onChange={e => setFilters(f => ({ ...f, day: e.target.value }))}
                                className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">All Days</option>
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search course / faculty..."
                                value={filters.dept}
                                onChange={e => setFilters(f => ({ ...f, dept: e.target.value }))}
                                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
                            />
                            <Button variant="outline" size="sm" onClick={fetchTimetable} className="gap-1">
                                <RefreshCw className="w-3 h-3" /> Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
                            <AlertCircle className="w-10 h-10" />
                            <p className="font-medium">No timetable entries found</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                            {filtered.map((entry, index) => (
                                <div
                                    key={entry.id || `entry-${index}`}
                                    className={`border rounded-xl p-4 transition-all duration-200 ${editingId === entry.id
                                            ? 'border-indigo-300 bg-indigo-50/40 shadow-md'
                                            : 'bg-white hover:shadow-sm hover:border-gray-300'
                                        }`}
                                >
                                    {editingId === entry.id ? (
                                        /* ── Edit Mode ── */
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Day</label>
                                                    <select
                                                        value={editData.day}
                                                        onChange={e => setEditData(d => ({ ...d, day: e.target.value }))}
                                                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                    >
                                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Start Time</label>
                                                    <select
                                                        value={editData.start_time}
                                                        onChange={e => setEditData(d => ({ ...d, start_time: e.target.value }))}
                                                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                    >
                                                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Course</label>
                                                    <input
                                                        value={editData.course_name}
                                                        onChange={e => setEditData(d => ({ ...d, course_name: e.target.value }))}
                                                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Faculty</label>
                                                    <input
                                                        value={editData.faculty_name}
                                                        onChange={e => setEditData(d => ({ ...d, faculty_name: e.target.value }))}
                                                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Room</label>
                                                    <input
                                                        value={editData.room}
                                                        onChange={e => setEditData(d => ({ ...d, room: e.target.value }))}
                                                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end pt-1">
                                                <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-1">
                                                    <X className="w-3.5 h-3.5" /> Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                                                    disabled={actionLoading}
                                                    onClick={() => handleSave(entry.id)}
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── View Mode ── */
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`px-2 py-1 rounded-lg text-xs font-bold text-white min-w-[72px] text-center
                          ${entry.day === 'Monday' ? 'bg-blue-500' :
                                                        entry.day === 'Tuesday' ? 'bg-purple-500' :
                                                            entry.day === 'Wednesday' ? 'bg-green-500' :
                                                                entry.day === 'Thursday' ? 'bg-orange-500' :
                                                                    entry.day === 'Friday' ? 'bg-red-500' : 'bg-gray-500'}`}>
                                                    {entry.day?.slice(0, 3)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                                        {entry.course_name || 'Unknown Course'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {entry.start_time} · {entry.faculty_name || 'Staff'} · {entry.room || 'TBD'}
                                                        {entry.section && <span className="ml-2 bg-gray-100 px-1.5 py-0.5 rounded">§{entry.section}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => startEdit(entry)}
                                                    className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition"
                                                    title="Edit entry"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(entry.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition"
                                                    title="Delete entry"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
