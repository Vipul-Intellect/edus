import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { API_URL } from '../api';

const MeetingScheduler = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        location: '',
        meeting_type: 'department'
    });

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/meetings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch meetings');

            const data = await response.json();
            setMeetings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMeeting = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/meetings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to create meeting');

            // Reset form and refresh meetings
            setFormData({
                title: '',
                description: '',
                start_datetime: '',
                end_datetime: '',
                location: '',
                meeting_type: 'department'
            });
            setShowCreateForm(false);
            fetchMeetings();

            alert('Meeting created successfully!');
        } catch (err) {
            alert('Error creating meeting: ' + err.message);
        }
    };

    const handleDeleteMeeting = async (meetingId) => {
        if (!confirm('Are you sure you want to delete this meeting?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/teacher/meetings/${meetingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete meeting');

            fetchMeetings();
            alert('Meeting deleted successfully!');
        } catch (err) {
            alert('Error deleting meeting: ' + err.message);
        }
    };

    const formatDateTime = (datetime) => {
        return new Date(datetime).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getMeetingTypeColor = (type) => {
        switch (type) {
            case 'department': return 'bg-blue-100 text-blue-800';
            case 'research': return 'bg-purple-100 text-purple-800';
            case 'admin': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="text-center py-8">Loading meetings...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Meeting Scheduler</h2>
                <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? 'Cancel' : '+ Schedule Meeting'}
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Create Meeting Form */}
            {showCreateForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule New Meeting</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateMeeting} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="Department Meeting"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md"
                                    rows="3"
                                    placeholder="Meeting agenda..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_datetime}
                                        onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_datetime}
                                        onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="Conference Room A"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Meeting Type</label>
                                    <select
                                        value={formData.meeting_type}
                                        onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="department">Department</option>
                                        <option value="research">Research</option>
                                        <option value="admin">Administrative</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <Button type="submit" className="w-full">
                                Create Meeting
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Meetings List */}
            <div className="space-y-4">
                {(!Array.isArray(meetings) || meetings.length === 0) ? (
                    <Card>
                        <CardContent className="py-8 text-center text-gray-500">
                            No meetings scheduled. Click "Schedule Meeting" to create one.
                        </CardContent>
                    </Card>
                ) : (
                    meetings.map((meeting) => (
                        <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold">{meeting.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${getMeetingTypeColor(meeting.meeting_type)}`}>
                                                {meeting.meeting_type}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${meeting.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                                                meeting.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {meeting.status}
                                            </span>
                                        </div>

                                        {meeting.description && (
                                            <p className="text-sm text-gray-600 mb-3">{meeting.description}</p>
                                        )}

                                        <div className="space-y-1 text-sm text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">📅 Start:</span>
                                                <span>{formatDateTime(meeting.start_datetime)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">🕒 End:</span>
                                                <span>{formatDateTime(meeting.end_datetime)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">⏱️ Duration:</span>
                                                <span>{meeting.duration_hours} hours</span>
                                            </div>
                                            {meeting.location && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">📍 Location:</span>
                                                    <span>{meeting.location}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">👤 Organizer:</span>
                                                <span>{meeting.organizer}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ml-4">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteMeeting(meeting.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default MeetingScheduler;
