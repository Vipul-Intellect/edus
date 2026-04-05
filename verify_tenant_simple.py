import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app import create_app
from models.user import User
import jwt
from flask import current_app

app = create_app()
with app.app_context():
    # 1. College 1 token
    token = jwt.encode({"user_id": 1, "college_id": 1, "role": "admin"}, current_app.config["SECRET_KEY"], algorithm="HS256")
    with app.test_client() as client:
        headers = {"Authorization": f"Bearer {token}"}
        print("--- COLLEGE 1 ---")
        response = client.get("/api/debug/tenant", headers=headers)
        print(f"Users: {response.json['visible_users_count']}")
        
    # 2. College 2 token
    token2 = jwt.encode({"user_id": 2, "college_id": 2, "role": "admin"}, current_app.config["SECRET_KEY"], algorithm="HS256")
    with app.test_client() as client:
        headers = {"Authorization": f"Bearer {token2}"}
        print("\n--- COLLEGE 2 ---")
        response = client.get("/api/debug/tenant", headers=headers)
        print(f"Users: {response.json['visible_users_count']}")
