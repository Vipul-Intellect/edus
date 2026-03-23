import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, RefreshCw, Loader2, Unplug } from 'lucide-react';
import ApiService from '../services/api';

const GoogleCalendarConnect = () => {
    const [status, setStatus] = useState(null); // null = loading, false = not connected
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        checkStatus();

        // Handle OAuth callback: if URL has ?code=... exchange it
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            handleOAuthCallback(code);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkStatus = async () => {
        try {
            const data = await ApiService.getGoogleCalendarStatus();
            setStatus(data?.is_connected ? data : false);
        } catch {
            setStatus(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setIsLoading(true);
            const redirectUri = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
            const data = await ApiService.getGoogleAuthUrl(redirectUri);
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (e) {
            setMessage('Failed to initiate connection. Check backend.');
            setIsLoading(false);
        }
    };

    const handleOAuthCallback = async (code) => {
        try {
            setIsLoading(true);
            setMessage('Connecting to Google Calendar...');
            const redirectUri = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
            await ApiService.connectGoogleCalendar(code, redirectUri);
            setMessage('✅ Google Calendar connected & synced!');
            await checkStatus();
        } catch (e) {
            setMessage('❌ Connection failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            setMessage('');
            await ApiService.syncGoogleCalendar();
            setMessage('✅ Timetable synced to Google Calendar!');
            await checkStatus();
        } catch {
            setMessage('❌ Sync failed. Please reconnect.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Google Calendar? Events will remain in your calendar.')) return;
        try {
            setIsLoading(true);
            await ApiService.disconnectGoogleCalendar();
            setStatus(false);
            setMessage('Disconnected from Google Calendar.');
        } catch {
            setMessage('Failed to disconnect.');
        } finally {
            setIsLoading(false);
        }
    };

    const getSyncStatusBadge = () => {
        if (!status) return null;
        const colors = {
            synced: 'bg-green-100 text-green-700',
            syncing: 'bg-blue-100 text-blue-700',
            failed: 'bg-red-100 text-red-700',
            pending: 'bg-yellow-100 text-yellow-700',
        };
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status.sync_status] || 'bg-gray-100 text-gray-600'}`}>
                {status.sync_status}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 p-4 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking Google Calendar status...</span>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-800">Google Calendar Sync</h3>
                    <p className="text-xs text-gray-500">Auto-sync your timetable as calendar events</p>
                </div>
            </div>

            {/* Status */}
            {status ? (
                <div className="space-y-2">
                    {/* Connected info */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">Connected</span>
                        </div>
                        {getSyncStatusBadge()}
                    </div>

                    {status.last_synced_at && (
                        <p className="text-xs text-gray-400">
                            Last synced: {new Date(status.last_synced_at).toLocaleString('en-IN')}
                        </p>
                    )}

                    {status.last_error && (
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded">
                            ⚠️ {status.last_error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <Unplug className="w-3 h-3" />
                            Disconnect
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span>Not connected</span>
                    </div>
                    <button
                        onClick={handleConnect}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className="w-4 h-4"
                        />
                        Connect with Google
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">
                        Your timetable will sync to your registered email's Google Calendar
                    </p>
                </div>
            )}

            {/* Feedback Message */}
            {message && (
                <p className="text-xs text-center text-gray-600 bg-gray-50 rounded p-2">{message}</p>
            )}
        </div>
    );
};

export default GoogleCalendarConnect;
