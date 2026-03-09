import os
import sys

# Ensure the 'api' directory is in the path for Vercel
sys.path.append(os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS
try:
    from auth_middleware import require_auth
except ImportError:
    from api.auth_middleware import require_auth

try:
    import gemini_service
except ImportError:
    from api import gemini_service

app = Flask(__name__)
# Enable CORS for the React frontend
CORS(app)

@app.route('/api/query', methods=['POST'])
@require_auth
def query_codes():
    data = request.json
    question = data.get('query')
    
    if not question:
        return jsonify({"error": "Query required"}), 400
        
    result = gemini_service.query_codes_logic(question)
    return jsonify(result)

@app.route('/api/upload', methods=['POST'])
@require_auth
def upload_code():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    authority = request.form.get('authority')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not authority:
        return jsonify({"error": "Missing authority"}), 400
        
    # Pass the actual file object to the service
    success = gemini_service.upload_new_code_logic(file, file.filename, authority)
    
    if success:
        return jsonify({"status": "success", "message": f"File {file.filename} uploaded and ingestion triggered."})
    else:
        return jsonify({"error": "Upload/Indexing failed"}), 500

@app.route('/api/inventory', methods=['GET'])
@require_auth
def get_inventory():
    data = gemini_service.get_inventory_logic()
    return jsonify(data)

@app.route('/api/refresh', methods=['POST'])
@require_auth
def refresh_knowledge():
    # Trigger a re-sync
    return jsonify({"status": "refreshed", "message": "Knowledge Base re-indexed."})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
