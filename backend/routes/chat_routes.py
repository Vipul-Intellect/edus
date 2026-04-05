"""
Chatbot and announcements routes
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, make_response
from sqlalchemy import or_
from extensions import db
from models import ChatbotConversation, SystemAnnouncement
from utils.decorators import token_required, admin_required
from utils.tenant_middleware import require_feature
from utils.chatbot_utils import (
    detect_intent, save_conversation, get_user_timetable_chatbot,
    get_next_class_chatbot, get_free_rooms_chatbot, get_faculty_load_chatbot,
    get_room_utilization_chatbot, get_leave_status_chatbot,
    get_announcements_chatbot, get_swap_requests_chatbot
)

chat_bp = Blueprint('chat', __name__)


@chat_bp.route("/chatbot", methods=["POST", "OPTIONS"])
@token_required
@require_feature('ai_chatbot')
def chatbot_assistant(current_user):
    # Flask-CORS handles OPTIONS preflight automatically
    if request.method == "OPTIONS":
        return make_response(), 200
    
    try:
        data = request.get_json() or {}
        query = (data.get("message") or "").strip()

        if not query:
            response_text = "👋 Hi! I'm your SIH Timetable Assistant. I can help you with:\n\n"
            response_text += "📅 **Timetable & Classes:**\n• 'my timetable' - View your schedule\n• 'next class' - Find upcoming class\n\n"
            response_text += "🏫 **Rooms & Facilities:**\n• 'free rooms' - Check available rooms\n• 'book room' - Reserve a room\n\n"
            response_text += "👨‍🏫 **Faculty & Admin:**\n• 'faculty load' - Check teacher workload\n• 'room utilization' - Room usage stats\n\n"
            response_text += "📢 **Other:**\n• 'announcements' - View latest updates\n• 'leave status' - Check leave requests\n• 'help' - Show all commands"
            
            return jsonify({
                "success": True,
                "response": response_text,
                "type": "greeting",
                "timestamp": datetime.utcnow().isoformat()
            })

        intent = detect_intent(query)
        
        if intent == "help":
            response_text = "🤖 **SIH Timetable Assistant Commands:**\n\n"
            response_text += "📅 **Schedule Management:**\n• 'my timetable' - View your complete schedule\n• 'next class' - Find your next class\n• 'today classes' - Today's schedule\n\n"
            response_text += "🏫 **Room Management:**\n• 'free rooms' - Currently available rooms\n• 'book room' - Reserve a room\n• 'room status' - Room occupancy\n\n"
            response_text += "👨‍🏫 **Faculty Features:**\n• 'faculty load' - Teaching workload\n• 'swap class' - Request class swap\n• 'leave status' - Check leave requests\n\n"
            response_text += "📢 **System Info:**\n• 'announcements' - Latest updates\n• 'room utilization' - Room usage statistics\n• 'help' - Show this menu"
            
            if current_user.role == "admin":
                response_text += "\n\n🔧 **Admin Commands:**\n• 'system stats' - Overall statistics\n• 'pending requests' - Review pending items"
            
            save_conversation(current_user.id, query, response_text, intent, "help")
            return jsonify({
                "success": True,
                "response": response_text,
                "type": "help",
                "timestamp": datetime.utcnow().isoformat()
            })

        elif intent == "timetable":
            result = get_user_timetable_chatbot(current_user)
            save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
            return result

        elif intent == "next_class":
            result = get_next_class_chatbot(current_user)
            save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
            return result

        elif intent == "free_rooms":
            result = get_free_rooms_chatbot(current_user)
            save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
            return result

        elif intent == "faculty_load":
            if current_user.role in ["admin", "teacher"]:
                result = get_faculty_load_chatbot()
                save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
                return result
            else:
                response_text = "❌ Only teachers and administrators can check faculty workload."
                save_conversation(current_user.id, query, response_text, intent, "error")
                return jsonify({
                    "success": False,
                    "response": response_text,
                    "type": "error",
                    "timestamp": datetime.utcnow().isoformat()
                })

        elif intent == "room_utilization":
            if current_user.role == "admin":
                result = get_room_utilization_chatbot()
                save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
                return result
            else:
                response_text = "❌ Only administrators can check room utilization statistics."
                save_conversation(current_user.id, query, response_text, intent, "error")
                return jsonify({
                    "success": False,
                    "response": response_text,
                    "type": "error",
                    "timestamp": datetime.utcnow().isoformat()
                })

        elif intent == "leave_status":
            result = get_leave_status_chatbot(current_user)
            save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
            return result

        elif intent == "announcements":
            result = get_announcements_chatbot(current_user)
            save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
            return result

        elif intent == "swap_request":
            result = get_swap_requests_chatbot(current_user)
            save_conversation(current_user.id, query, result.json["response"], intent, result.json["type"])
            return result

        else:
            response_text = "🤔 I didn't understand that. Here are some things I can help with:\n\n"
            response_text += "• Ask about your 'timetable' or 'next class'\n• Check 'free rooms' or 'room availability'\n"
            response_text += "• View 'announcements' or 'leave status'\n• Type 'help' for all commands"
            
            save_conversation(current_user.id, query, response_text, intent, "unknown")
            return jsonify({
                "success": True,
                "response": response_text,
                "type": "unknown",
                "timestamp": datetime.utcnow().isoformat()
            })

    except Exception as e:
        error_response = f"❌ Sorry, I encountered an error: {str(e)}"
        save_conversation(current_user.id, query, error_response, "error", "error")
        return jsonify({
            "success": False,
            "response": error_response,
            "type": "error",
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@chat_bp.route("/conversation", methods=["GET"])
@token_required
@require_feature('ai_chatbot')
def get_chatbot_history(current_user):
    try:
        conversations = db.session.query(ChatbotConversation).filter_by(user_id=current_user.id)\
            .order_by(ChatbotConversation.timestamp.desc())\
            .limit(50).all()
        
        history = []
        for conv in reversed(conversations):
            history.extend([
                {
                    "type": "user",
                    "message": conv.query,
                    "timestamp": conv.timestamp.isoformat()
                },
                {
                    "type": "bot",
                    "message": conv.response,
                    "timestamp": conv.timestamp.isoformat()
                }
            ])
        
        return jsonify({"history": history})
    except Exception as e:
        print(f"ERROR in get_chatbot_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@chat_bp.route("/clear", methods=["POST"])
@token_required
def clear_chat_history(current_user):
    try:
        deleted = db.session.query(ChatbotConversation).filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({"message": f"Cleared {deleted} conversations"})
    except Exception as e:
        db.session.rollback()
        print(f"ERROR in clear_chat_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@chat_bp.route("/announcements", methods=["GET"])
@token_required
def get_announcements(current_user):
    try:
        announcements = SystemAnnouncement.query.filter(
            SystemAnnouncement.is_active == True,
            or_(
                SystemAnnouncement.target_roles.is_(None),
                SystemAnnouncement.target_roles.contains(current_user.role)
            ),
            or_(
                SystemAnnouncement.expires_at.is_(None),
                SystemAnnouncement.expires_at > datetime.utcnow()
            )
        ).order_by(SystemAnnouncement.created_at.desc()).all()
        
        return jsonify([{
            "id": ann.id,
            "title": ann.title,
            "message": ann.message,
            "priority": ann.priority,
            "created_at": ann.created_at.isoformat(),
            "expires_at": ann.expires_at.isoformat() if ann.expires_at else None
        } for ann in announcements])
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chat_bp.route("/announcements", methods=["POST"])
@token_required
@admin_required
def create_announcement(current_user):
    try:
        data = request.json
        required_fields = ["title", "message"]
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields: title, message"}), 400
        
        announcement = SystemAnnouncement(
            title=data["title"],
            message=data["message"],
            priority=data.get("priority", "normal"),
            target_roles=data.get("target_roles"),
            created_by=current_user.id,
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None
        )
        
        db.session.add(announcement)
        db.session.commit()
        
        return jsonify({
            "message": "Announcement created successfully",
            "announcement_id": announcement.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
