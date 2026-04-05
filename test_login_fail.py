import requests
import sys

BASE_URL = "http://localhost:5000"

def test_login():
    print("Testing Teacher Login...")
    payload = {
        "college_code": "DEFAULT",
        "username": "Jaya_rani",
        "password": "password" # Assume common default
    }
    try:
        # Standard login for teachers/students is at /api/auth/login
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
