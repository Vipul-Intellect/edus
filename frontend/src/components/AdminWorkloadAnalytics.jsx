import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { API_URL } from '../api';

const AdminWorkloadAnalytics = () => {
    const [workloadData, setWorkloadData] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWorkloadOverview();
        fetchWorkloadAlerts();
    }, []);

    const fetchWorkloadOverview = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/admin/workload-overview`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch workload overview');

            const data = await response.json();
            setWorkloadData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkloadAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/admin/workload-alerts`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch alerts');

            const data = await response.json();
            setAlerts(data);
        } catch (err) {
            console.error('Error fetching alerts:', err);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'underloaded': return 'bg-blue-500';
            case 'balanced': return 'bg-green-500';
            case 'overloaded': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    if (loading) {
        return <div className="text-center py-8">Loading analytics...</div>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!workloadData) return null;

    // Calculate summary statistics
    const facultyList = Array.isArray(workloadData.faculty_workloads) ? workloadData.faculty_workloads : [];
    const totalFaculty = facultyList.length;
    const overloaded = facultyList.filter(f => f.status === 'overloaded').length;
    const balanced = facultyList.filter(f => f.status === 'balanced').length;
    const underloaded = facultyList.filter(f => f.status === 'underloaded').length;
    const avgWorkload = totalFaculty > 0 ? (facultyList.reduce((sum, f) => sum + f.total_hours, 0) / totalFaculty).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle>Faculty Workload Analytics</CardTitle>
                    <p className="text-sm text-gray-500">
                        Week {workloadData.week_number}, {workloadData.year}
                    </p>
                </CardHeader>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-800">{totalFaculty}</div>
                            <div className="text-sm text-gray-500 mt-1">Total Faculty</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-red-600">{overloaded}</div>
                            <div className="text-sm text-red-700 mt-1">⚠️ Overloaded</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{balanced}</div>
                            <div className="text-sm text-green-700 mt-1">✅ Balanced</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{underloaded}</div>
                            <div className="text-sm text-blue-700 mt-1">📉 Underloaded</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            {alerts && ((Array.isArray(alerts.overloaded) && alerts.overloaded.length > 0) || (Array.isArray(alerts.underloaded) && alerts.underloaded.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.isArray(alerts.overloaded) && alerts.overloaded.length > 0 && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                <div className="font-semibold mb-2">⚠️ Overloaded Faculty ({alerts.overloaded.length})</div>
                                <ul className="space-y-1 text-sm">
                                    {alerts.overloaded.map((faculty, idx) => (
                                        <li key={idx}>
                                            <strong>{faculty.faculty_name}</strong>: {faculty.total_hours}h / {faculty.max_hours}h ({faculty.percentage}%)
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {Array.isArray(alerts.underloaded) && alerts.underloaded.length > 0 && (
                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertDescription className="text-blue-800">
                                <div className="font-semibold mb-2">📉 Underutilized Faculty ({alerts.underloaded.length})</div>
                                <ul className="space-y-1 text-sm">
                                    {alerts.underloaded.map((faculty, idx) => (
                                        <li key={idx}>
                                            <strong>{faculty.faculty_name}</strong>: {faculty.total_hours}h / {faculty.max_hours}h ({faculty.percentage}%)
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Faculty Workload Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Workload Breakdown</CardTitle>
                    <p className="text-sm text-gray-500">Average workload: {avgWorkload} hours</p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Faculty Name</th>
                                    <th className="px-4 py-3 text-center font-semibold">Teaching</th>
                                    <th className="px-4 py-3 text-center font-semibold">Meetings</th>
                                    <th className="px-4 py-3 text-center font-semibold">Total</th>
                                    <th className="px-4 py-3 text-center font-semibold">Max</th>
                                    <th className="px-4 py-3 text-center font-semibold">Utilization</th>
                                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {facultyList
                                    .sort((a, b) => (b.workload_percentage || 0) - (a.workload_percentage || 0))
                                    .map((faculty, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{faculty.faculty_name}</td>
                                            <td className="px-4 py-3 text-center">{faculty.teaching_hours}h</td>
                                            <td className="px-4 py-3 text-center">{faculty.meeting_hours}h</td>
                                            <td className="px-4 py-3 text-center font-semibold">{faculty.total_hours}h</td>
                                            <td className="px-4 py-3 text-center text-gray-500">{faculty.max_hours}h</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-full rounded-full ${getStatusColor(faculty.status)}`}
                                                            style={{ width: `${Math.min(faculty.workload_percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium w-12 text-right">
                                                        {faculty.workload_percentage}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${faculty.status === 'overloaded' ? 'bg-red-100 text-red-800' :
                                                    faculty.status === 'balanced' ? 'bg-green-100 text-green-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {faculty.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminWorkloadAnalytics;
