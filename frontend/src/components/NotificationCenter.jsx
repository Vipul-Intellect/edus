import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Bell, Check, Trash2, Settings } from 'lucide-react';
import ApiService from '../services/api';

const NotificationCenter = ({ position = 'bottom-right' }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferences, setPreferences] = useState(null);

    // Position mapping
    const positionClasses = {
        'bottom-right': 'absolute right-0 top-full mt-2',
        'top-right': 'absolute right-0 bottom-full mb-2',
        'sidebar-right': 'absolute left-full bottom-0 ml-2'
    };
    const currentPositionClass = positionClasses[position] || positionClasses['bottom-right'];

    useEffect(() => {
        fetchNotifications();

        // Polling for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await ApiService.getNotifications();
            if (data) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const markRead = async (id) => {
        try {
            await ApiService.markNotificationRead(id);

            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllRead = async () => {
        try {
            await ApiService.markAllNotificationsRead();

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const clearAll = async () => {
        if (!confirm("Clear all notifications?")) return;
        try {
            await ApiService.clearAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPreferences = async () => {
        try {
            const data = await ApiService.getNotificationPreferences();
            if (data) {
                setPreferences(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const updatePreferences = async () => {
        try {
            await ApiService.updateNotificationPreferences(preferences);
            alert("Preferences saved!");
            setShowPreferences(false);
        } catch (err) {
            alert("Failed to save preferences");
        }
    };

    const togglePreference = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleOpenPreferences = () => {
        if (!preferences) fetchPreferences();
        setShowPreferences(true);
    };

    // Icons Helper
    const getIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="relative">
            {/* Bell Icon Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Notifications"
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center translate-x-1 -translate-y-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className={`${currentPositionClass} w-80 md:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border z-50 overflow-hidden transform transition-all`}>

                    {/* Header */}
                    <div className="p-3 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                        <div className="flex gap-2">
                            <button onClick={handleOpenPreferences} title="Settings" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button onClick={markAllRead} title="Mark all read" className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600 transition-colors">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={clearAll} title="Clear all" className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Preferences Mode */}
                    {showPreferences ? (
                        <div className="p-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">Settings</h4>
                                <button onClick={() => setShowPreferences(false)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
                            </div>

                            {preferences ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase">Channels</h5>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Email Notifications</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.email_enabled}
                                                onChange={() => togglePreference('email_enabled')}
                                                className="accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">In-App Alerts</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.app_enabled}
                                                onChange={() => togglePreference('app_enabled')}
                                                className="accent-blue-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase">Alert Types</h5>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">System Alerts</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.system_alerts}
                                                onChange={() => togglePreference('system_alerts')}
                                                className="accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Academic Updates</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.academic_updates}
                                                onChange={() => togglePreference('academic_updates')}
                                                className="accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Resource Updates</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.resource_updates}
                                                onChange={() => togglePreference('resource_updates')}
                                                className="accent-blue-600"
                                            />
                                        </div>
                                    </div>

                                    <Button onClick={updatePreferences} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">Save Preferences</Button>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500">Loading settings...</div>
                            )}
                        </div>
                    ) : (
                        /* Notification List */
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {(Array.isArray(notifications) ? notifications : []).map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                                            onClick={() => !notif.is_read && markRead(notif.id)}
                                        >
                                            <div className="flex gap-3">
                                                <div className="text-xl pt-0.5">{getIcon(notif.type)}</div>
                                                <div className="flex-1 space-y-1">
                                                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2">
                                                        <span>{notif.time_ago}</span>
                                                        <span className="capitalize bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                            {notif.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
