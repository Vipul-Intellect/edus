import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_login(college_code, username, password):
    print(f"Testing Login: {username} @ {college_code}...")
    try:
        resp = requests.post(f"{BASE_URL}/login", json={
            "college_code": college_code,
            "username": username,
            "password": password
        })
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test with the known user from the database
    test_login("PITE", "pite_admin", "Admin@123")
    
    # Test with standard admin (if exists)
    test_login("PITE", "admin", "Admin@123")
