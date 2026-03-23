import React from "react";
import { Video, Radio, Clock, Calendar, X } from "lucide-react";

export default function MyMeetingsModal({ isOpen, onClose, meetings = [] }) {
  if (!isOpen) return null;

  const now = new Date();
  const sorted = [...meetings].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const live = sorted.filter(m => new Date(m.start_time) <= now && new Date(m.end_time) >= now);
  const upcoming = sorted.filter(m => new Date(m.start_time) > now);

  const audienceLabel = {
    all: 'Everyone',
    teachers: 'All Teachers',
    students: 'All Students',
    section: 'Section',
    department: 'Department',
  };

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const MeetingRow = ({ meet, isLive }) => (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${isLive ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-red-500 text-white px-2.5 py-1 rounded-full animate-pulse shadow-sm shadow-red-200">
                <Radio className="w-3 h-3" /> LIVE NOW
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                <Clock className="w-3 h-3" /> UPCOMING
              </span>
            )}
            <span className="inline-flex items-center text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
              {audienceLabel[meet.audience_type] || meet.audience_type}
            </span>
          </div>
          <h4 className="font-bold text-slate-900 text-base mb-1">{meet.title}</h4>
          {meet.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{meet.description}</p>}
          
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDateTime(meet.start_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                {meet.organizer_name?.[0] || 'S'}
              </div>
              <span>Organized by <span className="font-semibold text-slate-600">{meet.organizer_name}</span></span>
            </div>
          </div>
        </div>
        
        {meet.meeting_link && (
          <a
            href={meet.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 ${
              isLive 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-100' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            }`}
          >
            <Video className="w-4 h-4" /> Join
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
              <Video className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Meeting Portal</h2>
              <p className="text-xs text-slate-500 font-medium">Active and upcoming broadcast sessions</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar">
          {meetings.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Video className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-900 font-bold text-lg">No meetings found</p>
              <p className="text-sm text-slate-500 mt-2 max-w-[240px] mx-auto">
                There are no active or upcoming meetings scheduled right now.
              </p>
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Live & Active Now</p>
                  </div>
                  <div className="space-y-3">{live.map(m => <MeetingRow key={m.id} meet={m} isLive={true} />)}</div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Scheduled for Later</p>
                  </div>
                  <div className="space-y-3">{upcoming.map(m => <MeetingRow key={m.id} meet={m} isLive={false} />)}</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Broadcasts appear automatically based on your department or section assignments.
          </p>
        </div>
      </div>
    </div>
  );
}
