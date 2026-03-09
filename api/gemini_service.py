
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import os
from datetime import datetime
from dotenv import load_dotenv


load_dotenv()

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT_ID") or os.environ.get("VITE_GOOGLE_CLOUD_PROJECT_ID") or "your-project-id"
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-southeast1")

import tempfile
import json

# Explicitly load service account if it exists locally (Development)
# Or from Environment Variable (Production/Vercel)
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "service-account.json")
env_creds = os.environ.get("GOOGLE_CREDENTIALS_JSON")

if os.path.exists(SERVICE_ACCOUNT_FILE):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = SERVICE_ACCOUNT_FILE
    print(f"🔑 [Gemini] Loaded credentials from {SERVICE_ACCOUNT_FILE}")
elif env_creds:
    # Use existing or create a temporary file (common with auth_middleware)
    # The Vertex AI SDK requires a physical file path in GOOGLE_APPLICATION_CREDENTIALS
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        try:
            temp_cred = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
            temp_cred.write(env_creds.encode('utf-8'))
            temp_cred.close()
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_cred.name
            print(f"🔑 [Gemini] Loaded credentials from Environment Variable")
        except Exception as e:
            print(f"⚠️ [Gemini] Failed to create temp credentials file: {e}")
    else:
        print(f"🔑 [Gemini] Using credentials previously set (e.g., from Auth Middleware)")
else:
    print(f"ℹ️ [Gemini] No local service-account.json or environment credentials found. Using ADC.")

try:
    print(f"🔹 [Gemini] Initializing Vertex AI with Project: '{PROJECT_ID}', Location: '{LOCATION}'")
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    # Using Gemini 2.5 Flash as requested (Validation: Must have 'Vertex AI User' role)
    model = GenerativeModel("gemini-2.5-flash")
    print(f"🔹 [Gemini] Model 'gemini-2.5-flash' initialized.")
except Exception as e:
    print(f"⚠️ [Gemini] Warning: Vertex AI Init failed: {e}")
    model = None

def query_codes_logic(question):
    print(f"🧠 [Gemini Service] processing query: {question}")
    
    # Check if Vertex AI is ready
    if not model:
        return _mock_fallback(question, "Vertex AI not configured or failed to init.")

    # Define the Data Store for Grounding
    DATA_STORE_ID = "authority-code_1765727621486"
    DATA_STORE_LOCATION = "global" 
    
    tools = []
    
    try:
        from vertexai.generative_models import Tool
        import vertexai.generative_models as gen_models

        # Create tool using the stable 'grounding' module path
        # This avoids 'preview' import errors
        rag_tool = Tool.from_retrieval(
            retrieval=gen_models.grounding.Retrieval(
                source=gen_models.grounding.VertexAISearch(
                    datastore=DATA_STORE_ID,
                    location=DATA_STORE_LOCATION,
                    max_retrieval_segments=10
                )
            )
        )
        tools = [rag_tool]
        print(f"🔹 [Gemini] RAG Tool configured for Data Store: {DATA_STORE_ID}")
        
    except Exception as tool_error:
        print(f"⚠️ [Gemini] Failed to create RAG Tool: {tool_error}")
        print("    Proceeding without Grounding (Standard knowledge only).")
        tools = []

    # Define the prompt again
    prompt = f"""
    You are an expert Singapore Authority Consultant for Architects and Engineers.
    Your scope covers ALL Singapore government agencies (URA, BCA, SCDF, LTA, NEA, PUB, NParks, etc.).
    
    PRE-ANSWER ANALYSIS (Crucial for holistic retrieval):
    Before answering, analyze the user's question and determine the 1-2 most relevant authorities and the best search terms. For example, if the user asks for "carpark size," your internal thought process must include "LTA" and "parking dimensions." Use this analysis to ensure maximum relevant context is retrieved.

    RULES FOR ACCURACY:
    1. STRICT GROUNDING: You must **ONLY** use the provided retrieved context. Do not use outside knowledge (like general internet code knowledge).
    2. SOURCE ACCURACY: Do NOT invent clause numbers, page numbers, or add general labels. If any detail is missing from the retrieved context, state "Not specified in retrieved text."
    3. HOLISTIC ANSWER: The answer must be a comprehensive summary of ALL retrieved text.
    4. RELEVANCE CHECK: Before generating the final answer, analyze the retrieved text. If the text does not contain the specific answer required (e.g., if a measurement is missing), the final 'answer' should state, "The required information (e.g., specific dimension) was not found in the retrieved code documents."
    5. OUTPUT FORMATTING: The 'answer' field **MUST** use Markdown. Group related information under clear headings (e.g., '## LTA Car Parking Dimensions', '## SCDF Fire Protection Requirements'). Use bullet points and bolding for clarity.
    6. LISTS: If the user asks for a list (e.g., "all clauses for fire lift lobby"), list ONLY what is found in the context. Append a note: "Note: This list is based on the top retrieved results and may not be exhaustive."
    7. CITATIONS: Extract and list the exact clause number if available. If the page number is not clear, leave the "page" field empty string "".

    Question: "{question}"
    
    Format your response exactly as this JSON (do not use markdown):
    {{
       "answer": "Comprehensive answer synthesized from retrieved text, including all relevant authority references...",
       "source_department": "Name of the primary Authority/Agency found in the answer (e.g., LTA, SCDF, URA...)",
       "confidence_score": 0.0 to 1.0,
       "retrieval_status": "Briefly state if grounding was fully successful or limited (e.g., 'Fully grounded with LTA and SCDF documents' or 'Limited to only one retrieved document').",
       "related_rules": [
           {{
               "code": "Clause X.X.X",
               "text": "Exact relevant text snippet...",
               "page": "Page # or empty"
           }}
       ]
    }}
    """

    try:
        # Pass the tool to enable RAG (if configured)
        response = model.generate_content(
            prompt,
            tools=tools,
            generation_config={"temperature": 0.3}
        )
        text_response = response.text
        
        # Basic cleanup to ensure JSON parsing
        import json
        clean_text = text_response.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return data

    except Exception as e:
        print(f"❌ [Gemini] API Error: {e}")
        return _mock_fallback(question, f"Fallback due to error: {str(e)}")


def _mock_fallback(question, reason):
    """
    Returns a strict error response whenever Vertex AI fails or yields no results.
    No more fake/mock answers.
    """
    print(f"❌ [Error] Service failed: {reason}")
    
    # Determine user-friendly error message
    error_msg = "An unexpected error occurred."
    dept = "System"
    
    if "not configured" in reason or "failed to init" in reason:
        error_msg = "Service not configured. Please check server credentials."
    elif "403" in reason or "permission" in reason.lower() or "not authorize" in reason.lower():
        error_msg = "Authorization Failed. You do not have permission to access the Vertex AI service."
        dept = "Auth Error"
    else:
        error_msg = f"I cannot provide an answer at this time. (Reason: {reason})"

    return {
        "answer": error_msg,
        "source_department": dept,
        "confidence_score": 0.0,
        "retrieval_source": "Error",
        "related_rules": []
    }

from google.cloud import discoveryengine

def upload_new_code_logic(file_obj, filename, authority):
    """
    Uploads file to GCS and triggers Vertex AI Search ingestion.
    """
    try:
        # 1. Upload to GCS
        bucket_name = os.environ.get("GOOGLE_CLOUD_BUCKET_NAME") or "authority-knowledge-base-" + PROJECT_ID
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Path: knowledge_base/AUTHORITY/filename.pdf
        blob_path = f"knowledge_base/{authority}/{filename}"
        blob = bucket.blob(blob_path)
        
        # Reset file pointer if needed
        file_obj.seek(0)
        blob.upload_from_file(file_obj, content_type='application/pdf')
        print(f"✅ [GCS] Uploaded {filename} to gs://{bucket_name}/{blob_path}")

        # 2. Trigger Vertex AI Indexing (Import)
        # We need the Data Store ID
        DATA_STORE_ID = "authority-code_1765727621486"
        
        client = discoveryengine.DocumentServiceClient()
        parent = f"projects/{PROJECT_ID}/locations/global/collections/default_collection/dataStores/{DATA_STORE_ID}/branches/default_branch"
        
        # Define GCS Source
        gcs_source = discoveryengine.GcsSource(
            input_uris=[f"gs://{bucket_name}/{blob_path}"]
        )
        
        # Import Request
        request = discoveryengine.ImportDocumentsRequest(
            parent=parent,
            gcs_source=gcs_source,
            reconciliation_mode=discoveryengine.ImportDocumentsRequest.ReconciliationMode.INCREMENTAL
        )
        
        operation = client.import_documents(request=request)
        print(f"🚀 [Vertex] Import started: {operation.operation.name}")
        
        # We won't block for completion (can take minutes), but we initiated it.
        return True

    except Exception as e:
        print(f"❌ [Upload Error] {e}")
        return False

from google.cloud import storage
from datetime import timedelta

def _generate_signed_url(bucket_name, blob_name):
    """Generates a v4 signed URL for downloading a blob. Valid for 1 hour."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    url = blob.generate_signed_url(
        version="v4",
        # This URL is valid for 1 hour
        expiration=timedelta(hours=1),
        method="GET",
    )
    return url

def get_inventory_logic():
    """Lists PDF files from the GCS bucket and generates signed URLs."""
    try:
        # Determine bucket name (same logic as upload script)
        bucket_name = os.environ.get("GOOGLE_CLOUD_BUCKET_NAME") or os.environ.get("VITE_GOOGLE_CLOUD_BUCKET_NAME") or f"authority-knowledge-base-{PROJECT_ID}"
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # List all blobs in knowledge_base/
        blobs = bucket.list_blobs(prefix="knowledge_base/")
        
        inventory = []
        for blob in blobs:
            if blob.name.endswith(".pdf"):
                # Structure: knowledge_base/AUTHORITY/filename.pdf
                parts = blob.name.split("/")
                if len(parts) >= 3:
                    authority = parts[1]
                    filename = parts[-1]
                    
                    try:
                       signed_url = _generate_signed_url(bucket_name, blob.name)
                    except Exception as e:
                       print(f"⚠️ Failed to sign URL for {blob.name}: {e}")
                       signed_url = None

                    inventory.append({
                        "authority": authority,
                        "fileName": filename,
                        "lastUpdated": blob.updated.isoformat() if blob.updated else datetime.now().isoformat(),
                        "fileUrl": signed_url
                    })
        
        return inventory
        
    except Exception as e:
        print(f"❌ Error getting inventory from GCS: {e}")
        # Fallback to mock if GCS fails
        return [
            {
                "authority": "URA (Mock)", 
                "fileName": "URA_Staircases.pdf", 
                "lastUpdated": "2024-12-14T08:00:00.000Z",
                "fileUrl": "https://www.ura.gov.sg/-/media/Corporate/Guidelines/Development-Control/Residential/Flats-Condominiums/Sec_Residential_Handbook.pdf"
            },
            {
                "authority": "BCA (Mock)", 
                "fileName": "BCA_Accessibility_Code.pdf", 
                "lastUpdated": "2024-12-10T14:30:00.000Z",
                "fileUrl": "https://www1.bca.gov.sg/docs/default-source/bca-regulatory/code-on-accessibility-in-the-built-environment-2019.pdf"
            },
            {
                "authority": "SCDF (Mock)", 
                "fileName": "Fire_Code_2018.pdf", 
                "lastUpdated": "2024-11-20T09:15:00.000Z",
                "fileUrl": "https://www.scdf.gov.sg/docs/default-source/fire-safety-department-documents/fire-code/fire-code-2018-(batch-2-amendments).pdf"
            }
        ]
