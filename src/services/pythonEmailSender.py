import sys
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email():
    try:
        # Force UTF-8 encoding for standard I/O on Windows
        try:
            sys.stdin.reconfigure(encoding='utf-8')
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)

        data = json.loads(raw_input)
        to_email = data.get("to")
        subject = data.get("subject", "Rankly.ai Verification Code")
        html_content = data.get("html", "")
        text_content = data.get("text", "")

        user = data.get("user", "rankly.ai.com@gmail.com")
        password = data.get("pass", "nkfbubodfvjtgkju").strip().replace(" ", "")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Rankly.ai Security <{user}>"
        msg["Reply-To"] = user
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))
        elif not text_content:
            msg.attach(MIMEText(subject, "plain", "utf-8"))

        try:
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=6)
            server.login(user, password)
            server.sendmail(user, [to_email], msg.as_string())
            server.quit()
        except Exception:
            # Fallback to Port 587 STARTTLS (Universally open on cloud/VPS/Docker)
            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=6)
            server.starttls()
            server.login(user, password)
            server.sendmail(user, [to_email], msg.as_string())
            server.quit()

        print(json.dumps({"success": True, "message": f"Email delivered cleanly to {to_email}"}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    send_email()
