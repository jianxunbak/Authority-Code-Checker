
from functools import wraps
from flask import request, jsonify
import firebase_admin
from firebase_admin import auth, credentials
import os
from dotenv import load_dotenv

load_dotenv() # Load env vars from .env if present

import tempfile
import json

# Initialize Firebase Admin
if not firebase_admin._apps:
    # 1. Try local file first
    SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "service-account.json")
    
    # 2. Try Environment Variable (For Vercel/Production)
    env_creds = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    
    if os.path.exists(SERVICE_ACCOUNT_FILE):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = SERVICE_ACCOUNT_FILE
        print(f"🔑 [Auth] Loaded credentials from {SERVICE_ACCOUNT_FILE}")
    elif env_creds:
        # Create a temporary file to store the credentials
        try:
            temp_cred = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
            temp_cred.write(env_creds.encode('utf-8'))
            temp_cred.close()
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_cred.name
            print(f"🔑 [Auth] Loaded credentials from Environment Variable")
        except Exception as e:
            print(f"❌ [Auth] Failed to create temp credentials file: {e}")

    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT_ID") or os.environ.get("VITE_GOOGLE_CLOUD_PROJECT_ID")
    if project_id:
        # If using a service account file (via GOOGLE_APPLICATION_CREDENTIALS), 
        # initialize_app() without arguments will pick it up automatically.
        firebase_admin.initialize_app(options={'projectId': project_id})
        print(f"🔹 [Auth] Firebase App initialized with Project ID: {project_id}")
    else:
        firebase_admin.initialize_app()

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized: Missing or invalid token"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Verify the ID token
            decoded_token = auth.verify_id_token(token)
            
            # Attach user info to request for downstream use
            request.user = decoded_token
            print(f"✅ [Auth] User verified: {decoded_token.get('email')}")
            
        except Exception as e:
            print(f"❌ [Auth] Verification failed: {e}")
            return jsonify({"error": "Unauthorized: Invalid token"}), 401
            
        return f(*args, **kwargs)
    return decorated_function
