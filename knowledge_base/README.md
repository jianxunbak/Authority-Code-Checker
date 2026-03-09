# Knowledge Base Directory

This is the local directory where you should place your Singapore Authority Code documents.

## Supported Formats
- .txt (Text files)
- .pdf (PDF Documents)
- .md (Markdown)
- .csv (Structured Data)

## Workflow for RAG (Retrieval-Augmented Generation)

1. **Place Files**: Drop your URA, BCA, SCDF, etc. documents into this folder.
2. **Upload/Index**: Use the provided script (`scripts/upload_files.js`) to upload these files to Google's Gemini File API.
3. **Query**: The React application will send the user's query along with the references to these uploaded files (or a Vector Store ID) to the Gemini Model.

## Example File Structure
knowledge_base/
├── URA_Master_Plan_2019.pdf
├── SCDF_Fire_Code_2018.pdf
└── BCA_Accessibility_Code.txt
