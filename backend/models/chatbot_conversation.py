from extensions import db
from datetime import datetime

class ChatbotConversation(db.Model):
    __tablename__ = "chatbot_conversations"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    query = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(50), nullable=True)
    response_type = db.Column(db.String(20), default="text")  # text, timetable, error, info
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("chat_conversations", cascade="all, delete-orphan"))
