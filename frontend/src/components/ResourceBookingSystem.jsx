import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ApiService from '../services/api';

const ResourceBookingSystem = () => {
    const [resources, setResources] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        resource_id: '',
        title: '',
        purpose: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: ''
    });

    const [isAdmin, setIsAdmin] = useState(false); // Should determine from token/user context

    useEffect(() => {
        fetchResources();
        fetchBookings();
        // Simplified role check
        const user = ApiService.getCurrentUser();
        if (user && user.role === 'admin') {
            setIsAdmin(true);
        }
    }, []);

    const fetchResources = async () => {
        try {
            const data = await ApiService.getResources();
            if (data) {
                setResources(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBookings = async () => {
        try {
            const data = await ApiService.getBookings();
            if (data) {
                setBookings(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBookClick = (resource) => {
        setSelectedResource(resource);
        setFormData({
            ...formData,
            resource_id: resource.id,
            title: '',
            purpose: '',
            start_date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            end_date: new Date().toISOString().split('T')[0],
            end_time: '10:00'
        });
        setShowBookingForm(true);
    };

    const handleSubmitBooking = async (e) => {
        e.preventDefault();
        try {
            const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
            const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

            await ApiService.createBooking({
                resource_id: formData.resource_id,
                title: formData.title,
                purpose: formData.purpose,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString()
            });

            alert('Booking request submitted!');
            setShowBookingForm(false);
            fetchBookings();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleStatusChange = async (bookingId, newStatus) => {
        try {
            await ApiService.updateBookingStatus(bookingId, newStatus);
            fetchBookings();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        const map = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        return map[status] || 'bg-gray-100';
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            {/* Resources List */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Available Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(Array.isArray(resources) ? resources : []).map(resource => (
                        <Card key={resource.id} className="hover:shadow-md transition">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">{resource.name}</h3>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                                        {resource.resource_type}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">{resource.description}</p>
                                <div className="flex justify-between items-center text-sm mb-4">
                                    <span>Capacity: {resource.capacity}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${resource.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {resource.status}
                                    </span>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => handleBookClick(resource)}
                                    disabled={resource.status !== 'available'}
                                >
                                    Book Now
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Booking Form Dialog/Modal */}
            {showBookingForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Book {selectedResource?.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitBooking} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Event Title *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border rounded px-3 py-2"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full border rounded px-3 py-2"
                                            value={formData.start_date}
                                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full border rounded px-3 py-2"
                                            value={formData.start_time}
                                            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full border rounded px-3 py-2"
                                            value={formData.end_date}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full border rounded px-3 py-2"
                                            value={formData.end_time}
                                            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Purpose/Description</label>
                                    <textarea
                                        className="w-full border rounded px-3 py-2"
                                        value={formData.purpose}
                                        onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 justify-end mt-4">
                                    <Button type="button" variant="outline" onClick={() => setShowBookingForm(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">Confirm Booking</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* My Bookings List */}
            <div>
                <h2 className="text-2xl font-bold mb-4">My Bookings</h2>
                <Card>
                    <CardContent className="pt-0">
                        <table className="w-full text-sm mt-4">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="p-3">Resource</th>
                                    <th className="p-3">Event</th>
                                    <th className="p-3">From</th>
                                    <th className="p-3">To</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {(!Array.isArray(bookings) || bookings.length === 0) ? (
                                    <tr><td colSpan="6" className="p-4 text-center text-gray-500">No bookings found</td></tr>
                                ) : (
                                    bookings.map(booking => (
                                        <tr key={booking.id}>
                                            <td className="p-3 font-medium">{booking.resource_name}</td>
                                            <td className="p-3">{booking.title}</td>
                                            <td className="p-3">{new Date(booking.start_time).toLocaleString()}</td>
                                            <td className="p-3">{new Date(booking.end_time).toLocaleString()}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs lowercase ${getStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {booking.status === 'pending' && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                                {/* Admin Actions (Simple check - real app needs proper auth check) */}
                                                {booking.status === 'pending' && (
                                                    // In real app, only show this if isAdmin
                                                    // For now, hidden logic or assume authorized for demo
                                                    <span className="hidden">
                                                        <Button size="sm" className="bg-green-600 mr-2">Approve</Button>
                                                        <Button size="sm" variant="destructive">Reject</Button>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ResourceBookingSystem;
