import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load credentials from .env
load_dotenv()

def test_smtp():
    user = os.getenv("MAIL_USER")
    password = os.getenv("MAIL_PASS")
    
    print("="*50)
    print("📧 SMTP CREDENTIALS TEST")
    print("="*50)
    print(f"User: {user}")
    print(f"Pass: {'*' * len(password) if password else 'NOT SET'}")
    print("-" * 50)

    if not user or not password:
        print("❌ Error: MAIL_USER or MAIL_PASS missing in .env")
        return

    # Create message
    msg = MIMEMultipart()
    msg['From'] = user
    msg['To'] = user
    msg['Subject'] = "Timetable System - Login Test"
    msg.attach(MIMEText("If you see this, your Gmail App Password is working!", 'plain'))

    try:
        print("Connecting to smtp.gmail.com:587...")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        
        print(f"Attempting login for {user}...")
        server.login(user, password)
        
        print("Sending test email to yourself...")
        server.send_message(msg)
        
        server.quit()
        print("\n✅ SUCCESS! Your credentials are correct.")
        print("You can now restart your backend and use the app.")
        
    except smtplib.SMTPAuthenticationError:
        print("\n❌ FAILED: Authentication Error (Invalid Password)")
        print("REASON: Google rejected the username/password.")
        print("\nTROUBLESHOOTING:")
        print("1. Did you enable 2-Step Verification on your Google account?")
        print("2. Did you use an 'App Password' (16 characters) or your normal password?")
        print("3. Check for typos or extra spaces in your .env file.")
    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")

if __name__ == "__main__":
    test_smtp()
