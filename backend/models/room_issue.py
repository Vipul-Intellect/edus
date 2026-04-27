"""
RoomIssue Model — Room damage / maintenance issue reports filed by teachers.
"""

from extensions import db
from datetime import datetime
import json


class RoomIssue(db.Model):
    """
    Tracks damage or maintenance issues reported by teachers for classrooms.
    Multi-tenant scoped by college_id.
    """
    __tablename__ = "room_issues"

    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(
        db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True
    )

    # Which room has the issue
    room_id = db.Column(
        db.Integer, db.ForeignKey("classrooms.room_id"), nullable=False
    )

    # Who reported it
    reported_by = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )

    # Issue categorisation — stored as JSON list
    # Allowed values: electricity_fault | window_damage | bench_damaged | fan_damaged | other
    issue_categories = db.Column(db.Text, nullable=False, default="[]")

    # Free-text explanation from the teacher
    remarks = db.Column(db.Text, nullable=True)

    # Lifecycle status
    # pending → in_progress → resolved | dismissed
    status = db.Column(
        db.String(20), nullable=False, default="pending", index=True
    )

    # Admin resolution note
    admin_notes = db.Column(db.Text, nullable=True)

    # Who resolved it and when
    resolved_by = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    room = db.relationship("Classroom", backref=db.backref("issues", lazy=True))
    reporter = db.relationship(
        "User",
        foreign_keys=[reported_by],
        backref=db.backref("reported_room_issues", lazy=True),
    )
    resolver = db.relationship(
        "User",
        foreign_keys=[resolved_by],
        backref=db.backref("resolved_room_issues", lazy=True),
    )

    # ── Helpers ───────────────────────────────────────────────────────────────
    def get_categories(self):
        """Return issue_categories as a Python list."""
        try:
            return json.loads(self.issue_categories) if self.issue_categories else []
        except (ValueError, TypeError):
            return []

    def set_categories(self, categories: list):
        """Persist a Python list to the JSON text column."""
        self.issue_categories = json.dumps(categories)

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "room_name": self.room.name if self.room else "Unknown Room",
            "reported_by": self.reported_by,
            "reporter_name": self.reporter.full_name if self.reporter else "Unknown",
            "issue_categories": self.get_categories(),
            "remarks": self.remarks,
            "status": self.status,
            "admin_notes": self.admin_notes,
            "resolved_by": self.resolved_by,
            "resolver_name": self.resolver.full_name if self.resolver else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "time_ago": self._time_ago(),
        }

    def _time_ago(self):
        now = datetime.utcnow()
        diff = now - self.created_at
        seconds = diff.total_seconds()
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            return f"{int(seconds // 60)}m ago"
        elif seconds < 86400:
            return f"{int(seconds // 3600)}h ago"
        else:
            return f"{int(seconds // 86400)}d ago"
