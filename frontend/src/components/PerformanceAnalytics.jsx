import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { API_URL } from '../api';

const PerformanceAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/admin/performance/analytics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading analytics...</div>;
    if (!analytics) return <div>No data available</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Performance Analytics</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-gray-800">{analytics.total_students}</div>
                        <div className="text-sm text-gray-500">Total Students</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-blue-600">{analytics.average_attendance}%</div>
                        <div className="text-sm text-gray-500">Avg. Attendance</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-green-600">{analytics.average_performance}%</div>
                        <div className="text-sm text-gray-500">Avg. Performance</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-red-600">{analytics.at_risk_students}</div>
                        <div className="text-sm text-red-700">At-Risk Students</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Recent Performance Records</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left bg-gray-50">
                                <th className="p-3">Course</th>
                                <th className="p-3">Attendance</th>
                                <th className="p-3">Grade</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(analytics.recent_records && Array.isArray(analytics.recent_records) ? analytics.recent_records : []).map((rec, i) => (
                                <tr key={i} className="border-t">
                                    <td className="p-3 font-medium">{rec.course_name}</td>
                                    <td className="p-3">{rec.attendance_percentage}%</td>
                                    <td className="p-3">{rec.average_percentage}% ({rec.current_grade})</td>
                                    <td className="p-3">
                                        {rec.at_risk ?
                                            <span className="text-red-600 font-bold text-xs uppercase">At Risk</span> :
                                            <span className="text-green-600 text-xs uppercase">Stable</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};

export default PerformanceAnalytics;
