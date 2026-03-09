
from functools import wraps
from flask import request, jsonify
import firebase_admin
from firebase_admin import auth, credentials
import os
from dotenv import load_dotenv

load_dotenv() # Load env vars from .env if present

# Initialize Firebase Admin
# Note: In Google Cloud Run, specific credentials are usually not needed (ADC).
# For local dev, you might need GOOGLE_APPLICATION_CREDENTIALS set or just run 'gcloud auth application-default login'
if not firebase_admin._apps:
    # Explicitly load service account if it exists locally
    SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "service-account.json")
    if os.path.exists(SERVICE_ACCOUNT_FILE):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = SERVICE_ACCOUNT_FILE
        print(f"🔑 [Auth] Loaded credentials from {SERVICE_ACCOUNT_FILE}")

    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT_ID") or os.environ.get("VITE_GOOGLE_CLOUD_PROJECT_ID")
    if project_id:
        firebase_admin.initialize_app(options={'projectId': project_id})
        print(f"🔹 [Auth] Firebase App initialized with Project ID: {project_id}")
    else:
        # Fallback to default strategy if env var missing
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
