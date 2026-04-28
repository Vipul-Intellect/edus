import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import './MarkAttendance.css';

const MarkAttendance = () => {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedYear, setSelectedYear] = useState('1');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        if (selectedDept && selectedYear) {
            loadSections();
            loadCourses();
        }
    }, [selectedDept, selectedYear]);

    // Reload students when date changes if other fields are selected
    useEffect(() => {
        if (selectedDept && selectedYear && selectedSection && selectedDate) {
            loadStudents();
        }
    }, [selectedDate, selectedCourse, selectedDept, selectedYear, selectedSection]); // Added all dependencies

    const loadDepartments = async () => {
        try {
            const data = await apiService.makeRequest('/teacher/departments');
            setDepartments(data || []);
        } catch (error) {
            setError('Failed to load departments');
        }
    };

    const loadSections = async () => {
        try {
            const data = await apiService.getTeacherSections(selectedDept, selectedYear);
            setSections(data || []);
        } catch (error) {
            setError('Failed to load sections');
        }
    };

    const loadCourses = async () => {
        try {
            const data = await apiService.getTeacherCourses(selectedDept, selectedYear);
            setCourses(data || []);
        } catch (error) {
            console.error("Failed to load courses", error);
        }
    };

    const loadStudents = async () => {
        if (!selectedDept || !selectedYear || !selectedSection || !selectedDate) {
            setError('Please select department, year, section, and date');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            // Check for existing attendance first
            let existingData = null;
            try {
                // We now pass course_id if selected to get specific attendance
                const params = new URLSearchParams({
                    date: selectedDate,
                    department: selectedDept,
                    year: selectedYear,
                    section: selectedSection
                });

                if (selectedCourse) {
                    params.append('course_id', selectedCourse);
                }

                existingData = await apiService.makeRequest(`/teacher/attendance/view?${params.toString()}`);
            } catch (e) {
                console.log("No existing attendance or error fetching it");
            }

            if (existingData && existingData.students) {
                setStudents(existingData.students);
                const initialAttendance = {};
                existingData.students.forEach(student => {
                    // Use existing status or null (unmarked)
                    initialAttendance[student.id] = student.status || null;
                });
                setAttendance(initialAttendance);
            } else {
                // Fallback to loading student list if specific endpoint fails
                const data = await apiService.getTeacherStudents(
                    selectedDept,
                    selectedYear,
                    selectedSection
                );

                if (data && data.students) {
                    setStudents(data.students);
                    // Initialize all as null (unmarked) by default
                    const initialAttendance = {};
                    data.students.forEach(student => {
                        initialAttendance[student.id] = null;
                    });
                    setAttendance(initialAttendance);
                }
            }
        } catch (error) {
            setError(error.message || 'Failed to load students');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAttendance = (studentId) => {
        setAttendance(prev => {
            const currentStatus = prev[studentId];
            let nextStatus;

            // Cycle: unmarked (null) -> present -> absent -> unmarked
            if (currentStatus === null) nextStatus = 'present';
            else if (currentStatus === 'present') nextStatus = 'absent';
            else nextStatus = null; // Back to unmarked

            return {
                ...prev,
                [studentId]: nextStatus
            };
        });
    };

    const markAllPresent = () => {
        const newAttendance = {};
        students.forEach(student => {
            newAttendance[student.id] = 'present';
        });
        setAttendance(newAttendance);
    };

    const markAllAbsent = () => {
        const newAttendance = {};
        students.forEach(student => {
            newAttendance[student.id] = 'absent';
        });
        setAttendance(newAttendance);
    };

    const resetToUnmarked = () => {
        const newAttendance = {};
        students.forEach(student => {
            newAttendance[student.id] = null;
        });
        setAttendance(newAttendance);
    };

    const submitAttendance = async () => {
        // Filter out unmarked students - we only send marked ones
        const attendanceRecords = Object.entries(attendance)
            .filter(([_, status]) => status !== null)
            .map(([studentId, status]) => ({
                student_id: parseInt(studentId),
                status: status
            }));

        if (attendanceRecords.length === 0) {
            setError('Please mark attendance for at least one student');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');
        try {
            await apiService.markAttendance({
                attendance: attendanceRecords,
                date: selectedDate,
                course_id: selectedCourse || null // Pass selected course
            });

            setSuccessMessage(`Attendance marked successfully for ${selectedDate}!`);

            // Optional: Don't clear immediately so they can see what they submitted
            // setTimeout(() => {
            //     setStudents([]);
            //     setAttendance({});
            //     setSuccessMessage('');
            // }, 2000);
        } catch (error) {
            setError(error.message || 'Failed to mark attendance');
        } finally {
            setIsSubmitting(false);
        }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
    const unmarkedCount = students.length - presentCount - absentCount;

    return (
        <div className="mark-attendance-container">
            <div className="page-header">
                <button className="back-button" onClick={() => navigate('/teacher')}>
                    ← Back to Dashboard
                </button>
                <h1>Mark Attendance</h1>
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            <div className="selection-card">
                <h2>Select Class & Date</h2>

                <div className="form-row">
                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]} // Prevent future dates if needed
                            className="date-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Department</label>
                        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.dept_name}>{dept.dept_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Year</label>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Section</label>
                        <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                            <option value="">Select Section</option>
                            {sections.map((section) => (
                                <option key={section.id} value={section.name}>{section.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Subject (Optional)</label>
                        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                            <option value="">General Attendance</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button className="btn-primary" onClick={loadStudents} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load Students'}
                </button>
            </div>

            {students.length > 0 && (
                <>
                    <div className="stats-card">
                        <div className="stat-item">
                            <div className="stat-number">{students.length}</div>
                            <div className="stat-label">Total</div>
                        </div>
                        <div className="stat-item success">
                            <div className="stat-number">{presentCount}</div>
                            <div className="stat-label">Present</div>
                        </div>
                        <div className="stat-item danger">
                            <div className="stat-number">{absentCount}</div>
                            <div className="stat-label">Absent</div>
                        </div>
                        <div className="stat-item neutral">
                            <div className="stat-number">{unmarkedCount}</div>
                            <div className="stat-label">Unmarked</div>
                        </div>
                    </div>

                    <div className="bulk-actions">
                        <button className="btn-success" onClick={markAllPresent}>
                            ✓ All Present
                        </button>
                        <button className="btn-danger" onClick={markAllAbsent}>
                            ✗ All Absent
                        </button>
                        <button className="btn-secondary" onClick={resetToUnmarked}>
                            ↺ Reset
                        </button>
                    </div>

                    <div className="students-card">
                        <div className="card-header-row">
                            <h2>Students</h2>
                            <span className="info-badge">
                                Click rows to toggle: Unmarked → Present → Absent
                            </span>
                        </div>

                        <div className="students-list">
                            {students.map((student) => {
                                const status = attendance[student.id];
                                let statusClass = 'unmarked';
                                let statusText = '○ Unmarked';

                                if (status === 'present') {
                                    statusClass = 'present';
                                    statusText = '✓ Present';
                                } else if (status === 'absent') {
                                    statusClass = 'absent';
                                    statusText = '✗ Absent';
                                }

                                return (
                                    <div
                                        key={student.id}
                                        className={`student-row ${statusClass}`}
                                        onClick={() => toggleAttendance(student.id)}
                                    >
                                        <div className="student-info">
                                            <div className="student-name">{student.full_name}</div>
                                            <div className="student-roll">{student.roll_number || 'N/A'}</div>
                                        </div>
                                        <div className={`status-badge ${statusClass}`}>
                                            {statusText}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        className="btn-submit"
                        onClick={submitAttendance}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Attendance'}
                    </button>
                </>
            )}
        </div>
    );
};

export default MarkAttendance;
