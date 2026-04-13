import firebase_admin
from firebase_admin import credentials, auth, firestore
from django.conf import settings
import os

_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            # Use default credentials (for development)
            _firebase_app = firebase_admin.initialize_app()
    return _firebase_app

def get_firestore():
    get_firebase_app()
    return firestore.client()

def verify_firebase_token(token):
    try:
        get_firebase_app()
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        return None
