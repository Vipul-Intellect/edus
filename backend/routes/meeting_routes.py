from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import dateutil.parser

from extensions import db
from models.meeting import Meeting
from models.user import User
from models.section import Section
from models import UserGoogleAuth
from routes.notification_routes import create_notification
from utils.decorators import token_required
from utils.tenant_middleware import require_feature
from services.google_calendar_service import create_google_event_with_meet

meeting_bp = Blueprint('meeting', __name__)

@meeting_bp.route('/meetings/create', methods=['POST', 'OPTIONS'])
@token_required
@require_feature('meetings')
def create_meeting(current_user):
    """
    Teacher/Admin creates a meeting.
    Generates notification and Google Meet link if connected.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    if current_user.role not in ['admin', 'teacher']:
        return jsonify({'error': 'Unauthorized to create meetings'}), 403

    data = request.json or {}
    
    title = data.get('title')
    description = data.get('description', '')
    audience_role = data.get('audience_role', 'all')  # all/teachers/students
    dept_id = data.get('dept_id')
    year = data.get('year')
    section_id = data.get('section_id')
    start_time_str = data.get('start_time')
    manual_link = data.get('manual_link')
    
    if not title:
        return jsonify({'error': 'Meeting title is required'}), 400
        
    if not start_time_str:
        return jsonify({'error': 'Start time is required'}), 400

    # 1. Structured Validations
    if audience_role == "students" and not dept_id:
        return jsonify({'error': 'Department is required for student targeting'}), 400

    if section_id and not year:
        return jsonify({'error': 'Year is required when targeting a specific section'}), 400
        
    try:
        # Try to parse ISO string
        start_time = dateutil.parser.isoparse(start_time_str)
        # End time defaults to +1 hr
        from datetime import timedelta
        end_time = start_time + timedelta(hours=1)
    except Exception as e:
        return jsonify({'error': 'Invalid start_time format'}), 400

    # Validate start_time > now for non-instant meetings (though instant naturally are >= now)
    nowutc = datetime.now(timezone.utc)
    # Convert start_time to UTC for comparison if it's aware, or assume local
    if start_time.tzinfo is not None:
        if start_time < nowutc - timedelta(minutes=5): # 5 min grace
            return jsonify({'error': 'Start time cannot be in the past'}), 400
    
    # 2. Hybrid Meeting Link Logic
    meeting_link = manual_link
    
    # Check if Google is connected
    google_auth = UserGoogleAuth.query.filter_by(user_id=current_user.id).first()
    has_google = google_auth is not None
    
    if not meeting_link and has_google:
        try:
            generated_link = create_google_event_with_meet(
                current_user,
                title,
                description,
                start_time_str
            )
            if generated_link:
                meeting_link = generated_link
            else:
                print(f"WARN: Google Meet link could not be generated for user {current_user.id}. Check server logs for details.")
        except Exception as e:
            print(f"Meet Generation CRITICAL Error: {e}")
            import traceback
            traceback.print_exc()
            pass # Fallback to manual link validation

    # 3. Save meeting in DB
    try:
        meeting = Meeting(
            title=title,
            description=description,
            organizer_id=current_user.id,
            start_datetime=start_time.replace(tzinfo=None) if start_time.tzinfo else start_time,
            end_datetime=end_time.replace(tzinfo=None) if end_time.tzinfo else end_time,
            meeting_link=meeting_link,
            audience_role=audience_role,
            dept_id=dept_id,
            year=year,
            section_id=section_id,
            created_by_role=current_user.role,
            status='scheduled'
        )
        meeting.calculate_duration()
        db.session.add(meeting)
        db.session.flush() # To get meeting.id
        
        # 4. Determine Audience
        query = User.query
        if audience_role == "teachers":
            query = query.filter(User.role == "teacher")
            if dept_id:
                query = query.filter(User.dept_id == dept_id)
        elif audience_role == "students":
            query = query.filter(User.role == "student")
            if dept_id:
                query = query.filter(User.dept_id == dept_id)
            if year:
                query = query.filter(User.year == year)
            if section_id:
                query = query.filter(User.section_id == section_id)
        elif audience_role == "all":
            pass # No filtering

        users_to_notify = query.all()

        # Filter out the organizer so they don't notify themselves
        users_to_notify = [u for u in users_to_notify if u.id != current_user.id]

        # 4. Send Notifications
        notified_count = 0
        formatted_start = meeting.start_datetime.strftime("%I:%M %p, %b %d")
        for u in users_to_notify:
            create_notification(
                user_id=u.id,
                title=f"New Meeting: {title}",
                message=f"Scheduled for {formatted_start}. {description[:50]}...",
                category='academic' if u.role == 'student' else 'system',
                type='meeting',
                link=meeting_link
            )
            notified_count += 1
            
        db.session.commit()
        
        return jsonify({
            'message': 'Meeting created successfully',
            'meeting_id': meeting.id,
            'meeting_link': meeting_link,
            'notified_users_count': notified_count
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@meeting_bp.route('/meetings', methods=['GET', 'OPTIONS'])
@token_required
@require_feature('meetings')
def get_meetings(current_user):
    """
    Get relevant active/future meetings for the current user to display the Join card.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        now = datetime.utcnow()
        query = Meeting.query.filter(Meeting.end_datetime >= now, Meeting.status != 'cancelled')
        
        # Filter visibility based on role/audience
        # If admin, see all. If organizer, see their own.
        meetings = []
        for m in query.order_by(Meeting.start_datetime.asc()).all():
            if current_user.role == 'admin' or current_user.id == m.organizer_id:
                meetings.append(m)
                continue
                
            is_visible = False
            if m.audience_role == 'all':
                is_visible = True
            elif m.audience_role == 'teachers' and current_user.role == 'teacher':
                if not m.dept_id or current_user.dept_id == m.dept_id:
                    is_visible = True
            elif m.audience_role == 'students' and current_user.role == 'student':
                # Check dept -> year -> section
                if not m.dept_id or current_user.dept_id == m.dept_id:
                    if not m.year or current_user.year == m.year:
                        if not m.section_id or current_user.section_id == m.section_id:
                            is_visible = True

            if is_visible:
                meetings.append(m)

        results = []
        for m in meetings:
            organizer = User.query.get(m.organizer_id)
            org_name = organizer.full_name if organizer else 'System'
            
            results.append({
                'id': m.id,
                'title': m.title,
                'description': m.description,
                'start_time': m.start_datetime.isoformat() + "Z",
                'end_time': m.end_datetime.isoformat() + "Z",
                'meeting_link': m.meeting_link,
                'organizer_name': org_name,
                'audience_role': m.audience_role,
                'section_id': m.section_id,
                'year': m.year,
                'dept_id': m.dept_id
            })
            
        return jsonify({'meetings': results}), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
