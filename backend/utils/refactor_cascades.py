import os
import re

models_dir = 'models'
files_to_fix = {
    'attendance.py': r'backref="attendance_records"',
    'student_performance.py': r'backref="performance_records"',
    'leave_request.py': r'backref="leave_requests"',
    'assessment.py': r'backref="created_assessments"',
    'booking.py': r'backref="my_bookings"',
    'chatbot_conversation.py': r'backref="chat_conversations"',
    'grade.py': r'backref="grades_received"',
    'meeting.py': r'backref="organized_meetings"',
    'notification.py': [(r'backref="notifications"', r'backref=db.backref("notifications", cascade="all, delete-orphan")'),
                        (r'backref=db.backref\("notification_preferences", uselist=False\)', r'backref=db.backref("notification_preferences", uselist=False, cascade="all, delete-orphan")')],
    'system_announcement.py': r'backref="announcements"',
    'calendar_event_map.py': r"backref=db.backref\('calendar_event_maps', lazy=True\)"
}

for filename, patterns in files_to_fix.items():
    filepath = os.path.join(models_dir, filename)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if isinstance(patterns, list):
        for old, new in patterns:
            content = re.sub(old, new, content)
    elif "backref=db.backref" in patterns:
        old = patterns
        new = patterns.replace(")", ", cascade=\"all, delete-orphan\")")
        content = re.sub(old, new, content)
    else:
        old = patterns
        match = re.search(r'backref="([^"]+)"', old)
        if match:
            backref_name = match.group(1)
            new = f'backref=db.backref("{backref_name}", cascade="all, delete-orphan")'
            content = re.sub(old, new, content)
            
    with open(filepath, 'w') as f:
        f.write(content)
        
print("Refactoring complete.")
