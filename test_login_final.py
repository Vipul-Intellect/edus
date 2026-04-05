import requests
import sys

BASE_URL = "http://localhost:5000"

def test_login():
    print("Testing Login at /api/login...")
    payload = {
        "college_code": "DEFAULT",
        "username": "admin",
        "password": "password"
    }
    try:
        # Standard login is now back at /api/login
        response = requests.post(f"{BASE_URL}/api/login", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
