
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Clock, Calendar } from "lucide-react";

import ApiService from '../../services/api';

export default function RecentSwapRequests({ requests = [], isLoading = false, onUpdate }) {
    const handleAction = async (id, action) => {
        try {
            if (action === 'approve') {
                if (confirm('Approve this swap request?')) {
                    await ApiService.adminApproveSwap(id);
                    alert('Swap request approved');
                }
            } else {
                const reason = prompt('Enter rejection reason:');
                if (reason) {
                    await ApiService.adminRejectSwap(id, reason);
                    alert('Swap request rejected');
                }
            }
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            alert('Action failed: ' + error.message);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Swap Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                    Pending Swap Requests
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(!Array.isArray(requests) || requests.length === 0) ? (
                        <div className="text-center py-10 px-4">
                            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <ArrowRightLeft className="w-8 h-8 text-orange-300" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-700 mb-1">All clear!</h3>
                            <p className="text-sm text-gray-400">No pending swap requests right now.</p>
                            <p className="text-xs text-gray-300 mt-2">New requests from teachers will appear here.</p>
                        </div>
                    ) : (
                        requests.map((request) => (
                            <div
                                key={request.id}
                                className="group p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 hover:border-orange-200 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{request.requesting_faculty}</h4>
                                        <p className="text-sm text-gray-600">{request.course_name} • {request.section_name}</p>
                                    </div>
                                    <Badge variant="outline" className="bg-white text-orange-600 border-orange-200">
                                        {request.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3 text-sm mb-3">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span className="line-through text-xs">{request.original_day} {request.original_start_time}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-orange-700 font-medium">
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span className="text-xs">{request.proposed_day} {request.proposed_start_time}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => handleAction(request.id, 'approve')}
                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleAction(request.id, 'reject')}
                                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
