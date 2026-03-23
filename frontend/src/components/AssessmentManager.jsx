import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import ApiService from '../services/api';

const AssessmentManager = () => {
    const [assessments, setAssessments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        course_id: '',
        title: '',
        assessment_type: 'quiz',
        max_marks: '',
        weightage: '',
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: '60',
        location: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchAssessments(),
                fetchCourses()
            ]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const data = await ApiService.makeRequest('/admin/courses');
            setCourses(Array.isArray(data) ? data : (data?.courses || []));
        } catch (err) {
            console.error('Error fetching courses:', err);
        }
    };

    const fetchAssessments = async () => {
        try {
            const data = await ApiService.makeRequest('/api/performance/assessments');
            setAssessments(Array.isArray(data) ? data : (data?.assessments || []));
        } catch (err) {
            console.error('Error fetching assessments:', err);
            throw err;
        }
    };

    const handleCreateAssessment = async (e) => {
        e.preventDefault();

        try {
            const response = await ApiService.makeRequest('/api/performance/assessments', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    max_marks: parseFloat(formData.max_marks),
                    weightage: parseFloat(formData.weightage) || 0,
                    duration_minutes: parseInt(formData.duration_minutes)
                })
            });

            if (response && !response.error) {
                setFormData({
                    course_id: '',
                    title: '',
                    assessment_type: 'quiz',
                    max_marks: '',
                    weightage: '',
                    scheduled_date: '',
                    scheduled_time: '',
                    duration_minutes: '60',
                    location: ''
                });
                setShowCreateForm(false);
                fetchAssessments();
                alert('Assessment created successfully!');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteAssessment = async (id) => {
        if (!confirm('Delete this assessment? All grades will be removed.')) return;

        try {
            const response = await ApiService.makeRequest(`/api/performance/assessments/${id}`, {
                method: 'DELETE'
            });

            if (response && !response.error) {
                fetchAssessments();
                alert('Assessment deleted successfully!');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            quiz: 'bg-blue-100 text-blue-800',
            assignment: 'bg-purple-100 text-purple-800',
            midterm: 'bg-orange-100 text-orange-800',
            final: 'bg-red-100 text-red-800',
            project: 'bg-green-100 text-green-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    const upcomingAssessments = assessments.filter(a => new Date(a.scheduled_date) >= new Date() && a.status === 'scheduled');
    const pastAssessments = assessments.filter(a => new Date(a.scheduled_date) < new Date() || a.status !== 'scheduled');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Assessment Manager</h2>
                <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? 'Cancel' : '+ Create Assessment'}
                </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <Card>
                    <CardHeader><CardTitle>Create New Assessment</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAssessment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Course *</label>
                                    <select
                                        value={formData.course_id}
                                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">Select Course</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Assessment Type *</label>
                                    <select
                                        value={formData.assessment_type}
                                        onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="quiz">Quiz</option>
                                        <option value="assignment">Assignment</option>
                                        <option value="midterm">Midterm Exam</option>
                                        <option value="final">Final Exam</option>
                                        <option value="project">Project</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g., Midterm Exam - Chapter 1-5"
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Max Marks *</label>
                                    <input
                                        type="number"
                                        value={formData.max_marks}
                                        onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                                        required
                                        min="0"
                                        step="0.5"
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Weightage (%)</label>
                                    <input
                                        type="number"
                                        value={formData.weightage}
                                        onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
                                        min="0"
                                        max="100"
                                        placeholder="20"
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Duration (min)</label>
                                    <input
                                        type="number"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                        min="15"
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date *</label>
                                    <input
                                        type="date"
                                        value={formData.scheduled_date}
                                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={formData.scheduled_time}
                                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Room 101 or Online"
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            <Button type="submit" className="w-full">Create Assessment</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Upcoming Assessments */}
            {upcomingAssessments.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Upcoming Assessments</h3>
                    <div className="grid gap-4">
                        {upcomingAssessments.map(assessment => (
                            <Card key={assessment.id} className="border-l-4 border-l-blue-500">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-lg">{assessment.title}</h4>
                                                <span className={`px-2 py-1 rounded text-xs ${getTypeColor(assessment.assessment_type)}`}>
                                                    {assessment.assessment_type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{assessment.course_name}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                                <div><span className="font-medium">📅 Date:</span> {new Date(assessment.scheduled_date).toLocaleDateString()}</div>
                                                <div><span className="font-medium">⏰ Time:</span> {assessment.scheduled_time || 'TBD'}</div>
                                                <div><span className="font-medium">📊 Marks:</span> {assessment.max_marks}</div>
                                                <div><span className="font-medium">⏱️ Duration:</span> {assessment.duration_minutes} min</div>
                                            </div>
                                            {assessment.location && (
                                                <div className="text-sm mt-2"><span className="font-medium">📍 Location:</span> {assessment.location}</div>
                                            )}
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAssessment(assessment.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Assessments */}
            {pastAssessments.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Past Assessments</h3>
                    <div className="grid gap-3">
                        {pastAssessments.map(assessment => (
                            <Card key={assessment.id} className="opacity-75">
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-semibold">{assessment.title}</span>
                                            <span className="text-sm text-gray-600 ml-2">({assessment.course_name})</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(assessment.scheduled_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {assessments.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        No assessments yet. Create one to get started!
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AssessmentManager;
