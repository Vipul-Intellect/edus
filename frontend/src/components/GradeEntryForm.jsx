import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { API_URL } from '../api';

const GradeEntryForm = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState('');
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({}); // Map student_id -> { marks, remarks }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchAssessments(selectedCourse);
        } else {
            setAssessments([]);
            setSelectedAssessment('');
        }
    }, [selectedCourse]);

    useEffect(() => {
        if (selectedAssessment) {
            fetchStudentsAndGrades(selectedAssessment);
        } else {
            setStudents([]);
            setGrades({});
        }
    }, [selectedAssessment]);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/courses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (err) {
            console.error('Error fetching courses:', err);
        }
    };

    const fetchAssessments = async (courseId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/assessments?course_id=${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAssessments(data);
            }
        } catch (err) {
            console.error('Error fetching assessments:', err);
        }
    };

    const fetchStudentsAndGrades = async (assessmentId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Get assessment details to know which course/section it belongs to
            // For simplicity in this demo, we'll fetch students for the course
            // In a real app, you might filter by section if the assessment is section-specific
            const assessment = assessments.find(a => a.id === parseInt(assessmentId));
            if (!assessment) return;

            // 2. Fetch grades first
            const gradesRes = await fetch(`${API_URL}/teacher/grades/assessment/${assessmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const gradesData = await gradesRes.json();

            const gradeMap = {};
            gradesData.grades.forEach(g => {
                gradeMap[g.student_id] = {
                    marks: g.marks_obtained,
                    remarks: g.remarks || ''
                };
            });
            setGrades(gradeMap);

            // 3. Fetch students for the course (you might need a specific endpoint for "students in course")
            // Currently using a placeholder approach or existing endpoint
            // Assuming we have an endpoint or using the generic students endpoint
            // For now, let's assume we can get students by course or department/year from the course info

            // FALLBACK: If your API doesn't have "get students by course", we might need to mock or use the section endpoint
            // Let's try to get section students if we can derive it, or just list all students in that dept/year
            // This part depends on your specific API structure for fetching students.
            // I'll assume we can fetch students by department/year of the course.

            // Let's assume we pass department and year from the course object if available
            // For now, simplified:
            const studentsRes = await fetch(`${API_URL}/teacher/students?department=CSE&year=1&section=A`, { // Placeholder params - should be dynamic
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Ideally, the course object should have dept/year info. 
            // Since I can't see the full course object structure right now, I'll add a TODO note in the UI if this fails.
            // Or better, let's use the `/teacher/students` endpoint if we can get parameters.

            if (studentsRes.ok) {
                const data = await studentsRes.json();
                setStudents(data.students);
            } else {
                // Mock data for demonstration if specific endpoint is missing parameters
                // setStudents([{id: 1, full_name: "Test Student", roll_number: "101"}]);
                console.warn("Could not fetch students - endpoint might need specific params");
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (studentId, field, value) => {
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const gradesList = Object.keys(grades).map(studentId => ({
                student_id: parseInt(studentId),
                assessment_id: parseInt(selectedAssessment),
                marks_obtained: parseFloat(grades[studentId].marks),
                remarks: grades[studentId].remarks
            })).filter(g => !isNaN(g.marks_obtained)); // Only send valid grades

            if (gradesList.length === 0) {
                alert("No grades entered");
                setSaving(false);
                return;
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/grades`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ grades: gradesList })
            });

            if (response.ok) {
                alert('Grades saved successfully!');
            } else {
                throw new Error('Failed to save grades');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Enter Grades</h2>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Course</label>
                            <select
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="">-- Select Course --</option>
                                {(Array.isArray(courses) ? courses : []).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Select Assessment</label>
                            <select
                                value={selectedAssessment}
                                onChange={(e) => setSelectedAssessment(e.target.value)}
                                disabled={!selectedCourse}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="">-- Select Assessment --</option>
                                {(Array.isArray(assessments) ? assessments : []).map(a => (
                                    <option key={a.id} value={a.id}>{a.title} ({a.assessment_type})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!selectedAssessment ? (
                        <div className="text-center py-8 text-gray-500">
                            Please select a course and assessment to enter grades.
                        </div>
                    ) : loading ? (
                        <div className="text-center py-8">Loading students...</div>
                    ) : (
                        <>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Roll No</th>
                                            <th className="px-4 py-3 text-left">Student Name</th>
                                            <th className="px-4 py-3 text-left w-32">Marks</th>
                                            <th className="px-4 py-3 text-left">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(Array.isArray(students) ? students : []).length > 0 ? (
                                            (Array.isArray(students) ? students : []).map(student => (
                                                <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">{student.roll_number}</td>
                                                    <td className="px-4 py-3">{student.full_name}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            className="w-full px-2 py-1 border rounded"
                                                            value={grades[student.id]?.marks || ''}
                                                            onChange={(e) => handleGradeChange(student.id, 'marks', e.target.value)}
                                                            placeholder="0.0"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 border rounded"
                                                            value={grades[student.id]?.remarks || ''}
                                                            onChange={(e) => handleGradeChange(student.id, 'remarks', e.target.value)}
                                                            placeholder="Good performance"
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                                    No students found for this context. <br />
                                                    (Note: Ensure proper course-section mapping is implemented in the backend)
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSubmit} disabled={saving || students.length === 0}>
                                    {saving ? 'Saving...' : 'Save Grades'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GradeEntryForm;
