import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app import create_app
import jwt
from flask import current_app

app = create_app()
with app.app_context():
    # 1. Generate a valid token for college 1
    token = jwt.encode({
        "user_id": 1,
        "college_id": 1,
        "role": "admin"
    }, current_app.config["SECRET_KEY"], algorithm="HS256")
    
    # 2. Test debug route using test client
    with app.test_client() as client:
        headers = {"Authorization": f"Bearer {token}"}
        print("Testing with college_id=1...")
        response = client.get("/api/debug/tenant", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json}")
        
    # 3. Repeat with college_id=2
    token2 = jwt.encode({
        "user_id": 2,
        "college_id": 2,
        "role": "admin"
    }, current_app.config["SECRET_KEY"], algorithm="HS256")
    with app.test_client() as client:
        headers = {"Authorization": f"Bearer {token2}"}
        print("\nTesting with college_id=2...")
        response = client.get("/api/debug/tenant", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json}")
