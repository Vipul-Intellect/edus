"""
Room Issue Routes
Blueprint: room_issues_bp
Prefix: /api/room-issues   (teacher) and /api/admin/room-issues (admin)

Endpoints:
  POST   /api/room-issues                  — Teacher: file a new issue
  GET    /api/room-issues                  — Teacher/Admin: list all college issues
  GET    /api/room-issues/<id>             — Any auth: single issue detail
  PATCH  /api/room-issues/<id>/status      — Admin: update status + notes
  DELETE /api/room-issues/<id>             — Admin: remove an issue
  GET    /api/admin/room-issues            — Admin: filtered list (status, room_id, category)
"""

from flask import Blueprint, request, jsonify, g
from extensions import db
from models import Classroom, RoomIssue
from models.user import User
from models.notification import Notification
from utils.decorators import token_required, admin_required, teacher_required
from datetime import datetime

room_issues_bp = Blueprint("room_issues", __name__)

# ────────────────────────────────────────────────────────────────────────────
# Valid categories that the frontend can send
# ────────────────────────────────────────────────────────────────────────────
VALID_CATEGORIES = {
    "electricity_fault",
    "window_damage",
    "bench_damaged",
    "fan_damaged",
    "other",
}

VALID_STATUSES = {"pending", "in_progress", "resolved", "dismissed"}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _notify_admins(college_id: int, issue: RoomIssue):
    """Create an in-app notification for every admin in this college."""
    try:
        admins = User.query.filter_by(college_id=college_id, role="admin").all()
        for admin in admins:
            notif = Notification(
                college_id=college_id,
                user_id=admin.id,
                title="🔧 New Room Issue Reported",
                message=(
                    f"{issue.reporter.full_name if issue.reporter else 'A teacher'} reported an issue "
                    f"in {issue.room.name if issue.room else 'a room'}. "
                    f"Categories: {', '.join(issue.get_categories())}."
                ),
                notification_type="warning",
                category="resource",
                link=f"/admin/room-issues/{issue.id}",
                sender_name=issue.reporter.full_name if issue.reporter else "Teacher",
            )
            db.session.add(notif)
        db.session.commit()
    except Exception as e:
        # Non-critical — don't fail the main request if notification fails
        print(f"[RoomIssues] Failed to create admin notifications: {e}")


# ── POST /api/room-issues  — Teacher submits issue ────────────────────────────

@room_issues_bp.route("/room-issues", methods=["POST", "OPTIONS"])
@token_required
@teacher_required
def create_room_issue(current_user):
    """Teacher files a new room damage / maintenance issue."""
    try:
        data = request.get_json(silent=True) or {}

        room_id = data.get("room_id")
        categories = data.get("issue_categories", [])
        remarks = data.get("remarks", "").strip()

        # ── Validation ──────────────────────────────────────────────────────
        if not room_id:
            return jsonify({"error": "room_id is required"}), 400

        if not categories or not isinstance(categories, list):
            return jsonify({"error": "At least one issue_category is required"}), 400

        invalid = [c for c in categories if c not in VALID_CATEGORIES]
        if invalid:
            return jsonify({
                "error": f"Invalid categories: {invalid}. "
                         f"Allowed: {list(VALID_CATEGORIES)}"
            }), 400

        room = Classroom.query.get(room_id)
        if not room:
            return jsonify({"error": "Room not found"}), 404

        # ── Create issue ────────────────────────────────────────────────────
        issue = RoomIssue(
            college_id=current_user.college_id,
            room_id=room_id,
            reported_by=current_user.id,
            remarks=remarks or None,
            status="pending",
        )
        issue.set_categories(categories)
        db.session.add(issue)
        db.session.flush()          # Get the ID before committing

        db.session.commit()

        # Notify admins asynchronously (best-effort)
        _notify_admins(current_user.college_id, issue)

        return jsonify({
            "message": "Issue reported successfully.",
            "issue": issue.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── GET /api/room-issues  — List all college issues (teacher-visible) ─────────

@room_issues_bp.route("/room-issues", methods=["GET", "OPTIONS"])
@token_required
def list_room_issues(current_user):
    """
    Return all room issues for this college.
    Visible to teachers, admins, and superadmins.
    Query params: status, room_id
    """
    try:
        status_filter = request.args.get("status")
        room_id_filter = request.args.get("room_id", type=int)

        query = RoomIssue.query.filter_by(college_id=current_user.college_id)

        if status_filter and status_filter in VALID_STATUSES:
            query = query.filter_by(status=status_filter)

        if room_id_filter:
            query = query.filter_by(room_id=room_id_filter)

        issues = query.order_by(RoomIssue.created_at.desc()).all()

        return jsonify({
            "issues": [i.to_dict() for i in issues],
            "total": len(issues)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/room-issues/<id>  — Single issue detail ─────────────────────────

@room_issues_bp.route("/room-issues/<int:issue_id>", methods=["GET", "OPTIONS"])
@token_required
def get_room_issue(current_user, issue_id):
    """Return a single room issue (must belong to the same college)."""
    try:
        issue = RoomIssue.query.filter_by(
            id=issue_id,
            college_id=current_user.college_id
        ).first()

        if not issue:
            return jsonify({"error": "Issue not found"}), 404

        return jsonify(issue.to_dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PATCH /api/room-issues/<id>/status  — Admin updates status ────────────────

@room_issues_bp.route("/room-issues/<int:issue_id>/status", methods=["PATCH", "OPTIONS"])
@token_required
@admin_required
def update_room_issue_status(current_user, issue_id):
    """
    Admin updates issue status and optionally adds a note.
    Body: { status: "resolved"|"in_progress"|"dismissed"|"pending", admin_notes?: str }
    """
    try:
        data = request.get_json(silent=True) or {}
        new_status = data.get("status")
        admin_notes = data.get("admin_notes", "").strip()

        if not new_status or new_status not in VALID_STATUSES:
            return jsonify({
                "error": f"Invalid status. Must be one of: {list(VALID_STATUSES)}"
            }), 400

        issue = RoomIssue.query.filter_by(
            id=issue_id,
            college_id=current_user.college_id
        ).first()

        if not issue:
            return jsonify({"error": "Issue not found"}), 404

        issue.status = new_status
        if admin_notes:
            issue.admin_notes = admin_notes

        if new_status in ("resolved", "dismissed"):
            issue.resolved_by = current_user.id
            issue.resolved_at = datetime.utcnow()
        else:
            # Allow reverting — clear resolution data
            issue.resolved_by = None
            issue.resolved_at = None

        issue.updated_at = datetime.utcnow()
        db.session.commit()

        # Notify the reporter that their issue was actioned
        try:
            label_map = {
                "resolved": "✅ resolved",
                "dismissed": "❌ dismissed",
                "in_progress": "🔄 marked in progress",
                "pending": "🔁 reverted to pending",
            }
            notif = Notification(
                college_id=current_user.college_id,
                user_id=issue.reported_by,
                title="Room Issue Update",
                message=(
                    f"Your issue report for {issue.room.name if issue.room else 'a room'} "
                    f"has been {label_map.get(new_status, new_status)}"
                    + (f": {admin_notes}" if admin_notes else "."),
                ),
                notification_type="success" if new_status == "resolved" else "info",
                category="resource",
                sender_name=current_user.full_name,
            )
            db.session.add(notif)
            db.session.commit()
        except Exception:
            pass  # Non-critical

        return jsonify({
            "message": f"Issue status updated to '{new_status}'.",
            "issue": issue.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── DELETE /api/room-issues/<id>  — Admin deletes an issue ────────────────────

@room_issues_bp.route("/room-issues/<int:issue_id>", methods=["DELETE", "OPTIONS"])
@token_required
@admin_required
def delete_room_issue(current_user, issue_id):
    """Admin permanently removes an issue report."""
    try:
        issue = RoomIssue.query.filter_by(
            id=issue_id,
            college_id=current_user.college_id
        ).first()

        if not issue:
            return jsonify({"error": "Issue not found"}), 404

        db.session.delete(issue)
        db.session.commit()

        return jsonify({"message": "Issue deleted successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── GET /api/admin/room-issues  — Admin filtered dashboard view ────────────────

@room_issues_bp.route("/admin/room-issues", methods=["GET", "OPTIONS"])
@token_required
@admin_required
def admin_list_room_issues(current_user):
    """
    Admin dashboard view: list all issues with full filter support.
    Query params: status, room_id, category
    """
    try:
        status_filter = request.args.get("status")
        room_id_filter = request.args.get("room_id", type=int)
        category_filter = request.args.get("category")

        query = RoomIssue.query.filter_by(college_id=current_user.college_id)

        if status_filter and status_filter in VALID_STATUSES:
            query = query.filter_by(status=status_filter)

        if room_id_filter:
            query = query.filter_by(room_id=room_id_filter)

        issues = query.order_by(RoomIssue.created_at.desc()).all()

        # Filter by category in Python (stored as JSON)
        if category_filter and category_filter in VALID_CATEGORIES:
            issues = [i for i in issues if category_filter in i.get_categories()]

        # Stats summary for the admin panel header
        all_issues = RoomIssue.query.filter_by(college_id=current_user.college_id).all()
        summary = {
            "total": len(all_issues),
            "pending": sum(1 for i in all_issues if i.status == "pending"),
            "in_progress": sum(1 for i in all_issues if i.status == "in_progress"),
            "resolved": sum(1 for i in all_issues if i.status == "resolved"),
            "dismissed": sum(1 for i in all_issues if i.status == "dismissed"),
        }

        return jsonify({
            "issues": [i.to_dict() for i in issues],
            "total": len(issues),
            "summary": summary,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
