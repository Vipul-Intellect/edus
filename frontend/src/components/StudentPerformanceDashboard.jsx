import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { API_URL } from '../api';

const StudentPerformanceDashboard = () => {
    const [performanceData, setPerformanceData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPerformance();
    }, []);

    const fetchPerformance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/student/performance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPerformanceData(data);
            }
        } catch (err) {
            console.error('Error fetching performance:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-8">Loading performance data...</div>;
    if (!performanceData) return <div className="text-center py-8">No performance data available.</div>;

    const student_info = performanceData.student_info || {};
    const overall_attendance = performanceData.overall_attendance || 0;
    const overall_grade = performanceData.overall_grade || 0;
    const courses = Array.isArray(performanceData.courses) ? performanceData.courses : [];

    const getGradeColor = (grade) => {
        if (!grade) return 'bg-gray-100 text-gray-800';
        if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
        if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
        if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-gray-500">
                                {student_info.name?.charAt(0) || '?'}
                            </div>
                            <h3 className="font-bold text-lg">{student_info.name || 'Student'}</h3>
                            <p className="text-gray-500">{student_info.roll_number || 'N/A'}</p>
                            <p className="text-sm text-gray-400 mt-1">Year {student_info.year || '-'} • Dept {student_info.department_id || '-'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Overall Status</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-8">
                        <div className="text-center">
                            <p className="text-gray-500 mb-2">My Attendance</p>
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="flex items-center justify-center w-full h-full rounded-full border-8 border-blue-100">
                                    <span className="text-3xl font-bold text-blue-600">{overall_attendance}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-500 mb-2">Avg. Score</p>
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="flex items-center justify-center w-full h-full rounded-full border-8 border-green-100">
                                    <span className="text-3xl font-bold text-green-600">{overall_grade}%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h3 className="text-xl font-bold mt-8 mb-4">Course Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.length > 0 ? courses.map(course => (
                    <Card key={course.course_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-lg">{course.course_name}</h4>
                                    <p className="text-sm text-gray-500">Semester: {course.semester || 'Current'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(course.current_grade)}`}>
                                    {course.current_grade || 'N/A'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Attendance</span>
                                        <span className="font-semibold">{course.attendance_percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${course.attendance_percentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Assessments Completed</span>
                                        <span className="font-semibold">{course.completed_assessments} / {course.total_assessments}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${(course.completed_assessments / (course.total_assessments || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {course.at_risk && (
                                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm mt-2 flex items-center">
                                        ⚠️ At Risk: Low attendance or grades
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border">
                        No course performance records found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentPerformanceDashboard;
