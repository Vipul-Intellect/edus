from extensions import db
from datetime import datetime

class College(db.Model):
    __tablename__ = "colleges"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    college_code = db.Column(db.String(50), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Store feature flags as JSON: {"ai_chatbot": true, "meetings": false, ...}
    feature_flags = db.Column(db.JSON, default=dict)
    
    # Subscription tiers: "free", "pro", "enterprise"
    subscription_tier = db.Column(db.String(50), default="free")
    
    # Optional branding per college
    logo_url = db.Column(db.String(500), nullable=True)
    primary_color = db.Column(db.String(7), nullable=True)  # Hex code like #FF5733
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = db.relationship("User", backref="college", lazy=True)
    # Most other models will follow this pattern after migration

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "college_code": self.college_code,
            "is_active": self.is_active,
            "feature_flags": self.feature_flags or {},
            "subscription_tier": self.subscription_tier,
            "logo_url": self.logo_url,
            "primary_color": self.primary_color,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<College {self.college_code}>"
