import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle, XCircle, FileText, Calendar, User,
    Clock, ChevronDown, Filter, RefreshCw, AlertCircle
} from "lucide-react";
import ApiService from '../../services/api';

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
};

const LEAVE_TYPE_COLORS = {
    sick: 'bg-red-50 text-red-700',
    vacation: 'bg-blue-50 text-blue-700',
    personal: 'bg-purple-50 text-purple-700',
    emergency: 'bg-orange-50 text-orange-700',
    medical: 'bg-pink-50 text-pink-700',
    family: 'bg-teal-50 text-teal-700',
    casual: 'bg-gray-50 text-gray-700',
    'Casual Leave': 'bg-gray-50 text-gray-700',
};

export default function AdminLeaveApproval() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectModal, setRejectModal] = useState(null); // { id, name }
    const [rejectNotes, setRejectNotes] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ApiService.adminGetAllLeaveRequests(statusFilter);
            const list = Array.isArray(data) ? data : (data?.leave_requests || data?.requests || data?.data || []);
            setRequests(list);
        } catch (e) {
            showToast('Failed to fetch requests', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleApprove = async (id, name) => {
        if (!window.confirm(`Approve leave request from ${name}?`)) return;
        setActionLoading(id + '-approve');
        try {
            await ApiService.adminApproveLeave(id);
            showToast(`✅ Leave approved for ${name}`);
            fetchRequests();
        } catch (e) {
            showToast(e.message || 'Approval failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectNotes.trim()) {
            showToast('Rejection notes are required', 'error');
            return;
        }
        setActionLoading(rejectModal.id + '-reject');
        try {
            await ApiService.adminRejectLeave(rejectModal.id, rejectNotes);
            showToast(`❌ Leave rejected for ${rejectModal.name}`);
            setRejectModal(null);
            setRejectNotes('');
            fetchRequests();
        } catch (e) {
            showToast(e.message || 'Rejection failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Reject Notes Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-1 text-gray-900">Reject Leave Request</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Rejecting request from <span className="font-semibold">{rejectModal.name}</span>
                        </p>
                        <textarea
                            value={rejectNotes}
                            onChange={e => setRejectNotes(e.target.value)}
                            placeholder="Enter reason for rejection (required)..."
                            className="w-full border rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => { setRejectModal(null); setRejectNotes(''); }}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={actionLoading !== null}
                                onClick={handleRejectSubmit}
                            >
                                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Leave Requests
                            {pendingCount > 0 && statusFilter === 'pending' && (
                                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {pendingCount} pending
                                </span>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {/* Filter */}
                            <div className="flex items-center gap-1 text-sm">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="all">All</option>
                                </select>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-1">
                                <RefreshCw className="w-3 h-3" /> Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
                            <AlertCircle className="w-10 h-10" />
                            <p className="font-medium">No {statusFilter !== 'all' ? statusFilter : ''} leave requests</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                            {requests.map(req => (
                                <div
                                    key={req.id}
                                    className="p-4 rounded-xl border bg-white hover:shadow-md transition-all duration-200"
                                >
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                {(req.full_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{req.full_name}</p>
                                                <p className="text-xs text-gray-500 capitalize">{req.role} · @{req.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_TYPE_COLORS[req.leave_type] || 'bg-gray-100 text-gray-700'}`}>
                                                {req.leave_type}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[req.status] || 'bg-gray-100'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Date & Info */}
                                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {req.start_date} → {req.end_date}
                                        </span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{req.days_requested} day{req.days_requested !== 1 ? 's' : ''}</span>
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">"{req.reason}"</p>

                                    {req.admin_notes && (
                                        <p className="text-xs text-gray-400 mb-3 bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="font-medium">Admin note:</span> {req.admin_notes}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => handleApprove(req.id, req.full_name)}
                                                disabled={actionLoading !== null}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium transition disabled:opacity-60"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                {actionLoading === req.id + '-approve' ? 'Approving...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => setRejectModal({ id: req.id, name: req.full_name })}
                                                disabled={actionLoading !== null}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-medium transition disabled:opacity-60"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Reject
                                            </button>
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
