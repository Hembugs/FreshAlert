import firebase_admin
from firebase_admin import credentials, messaging
import os

def init_firebase():
    import json
    cred_json = os.getenv('FIREBASE_CREDENTIALS')
    print(f'FIREBASE_CREDENTIALS found: {cred_json is not None}')
    if cred_json:
        cred_dict = json.loads(cred_json)
        cred = credentials.Certificate(cred_dict)
    else:
        cred = credentials.Certificate(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase-credentials.json'))
    firebase_admin.initialize_app(cred)

def send_notification(token, title, body):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body
        ),
        token=token
    )
    try:
        messaging.send(message)
        print(f'Notification sent: {title}')
    except Exception as e:
        print(f'Failed to send notification: {e}')