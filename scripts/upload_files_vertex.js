/*
 * script: upload_files_vertex.js
 * description: Utility to upload documents to Google Cloud Storage (GCS) for use with Vertex AI.
 * usage: node scripts/upload_files_vertex.js
 * prerequisites: npm install @google-cloud/storage @google-cloud/vertexai dotenv
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.VITE_GOOGLE_CLOUD_PROJECT_ID;
// Default bucket name if not explicitly set
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || process.env.VITE_GOOGLE_CLOUD_BUCKET_NAME || `authority-knowledge-base-${PROJECT_ID}`;
const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'knowledge_base');
const MANIFEST_PATH = path.join(process.cwd(), 'src/services/knowledge_manifest.json');

if (!PROJECT_ID || !BUCKET_NAME) {
    console.error("❌ Error: GOOGLE_CLOUD_PROJECT_ID or GOOGLE_CLOUD_BUCKET_NAME is missing in .env file");
    process.exit(1);
}

// Check for service account
const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), 'backend/service-account.json');
const storageOptions = { projectId: PROJECT_ID };

if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.log(`🔑 Using service account from: ${SERVICE_ACCOUNT_PATH}`);
    storageOptions.keyFilename = SERVICE_ACCOUNT_PATH;
} else {
    console.log("⚠️ No service account file found in backend/service-account.json, using default credentials.");
}

// Initialize GCS
const storage = new Storage(storageOptions);
const bucket = storage.bucket(BUCKET_NAME);

// Helper to recursively find files
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file !== 'README.md' && !file.startsWith('.')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

async function uploadFiles() {
    console.log(`📂 Scanning directory: ${KNOWLEDGE_BASE_DIR}...`);

    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
        console.error("Directory not found!");
        return;
    }

    // Recursive get all files
    const files = getAllFiles(KNOWLEDGE_BASE_DIR, []);

    // Check and create bucket if needed
    try {
        const [exists] = await bucket.exists();
        if (!exists) {
            console.log(`✨ Bucket ${BUCKET_NAME} does not exist. Creating in asia-southeast1...`);
            await bucket.create({ location: 'asia-southeast1' });
            console.log(`✅ Bucket ${BUCKET_NAME} created successfully.`);
        } else {
            console.log(`✅ Bucket ${BUCKET_NAME} found.`);
        }
    } catch (err) {
        console.error(`❌ Error checking/creating bucket: ${err.message}`);
        // If 403, it means we don't have permissions, likely
        return;
    }

    if (files.length === 0) {
        console.log("No relevant files found to upload.");
        return;
    }

    console.log(`✨ Found ${files.length} files. Starting upload to GCS Bucket: ${BUCKET_NAME}...`);

    const uploadedFiles = [];

    for (const filePath of files) {
        const fileName = path.basename(filePath);
        // Determine authority based on folder name immediately under knowledge_base
        const relativePath = path.relative(KNOWLEDGE_BASE_DIR, filePath);
        const authorityFolder = relativePath.split(path.sep)[0];
        const destination = `knowledge_base/${authorityFolder}/${fileName}`;

        try {
            console.log(`⬆️  Uploading ${fileName} to gs://${BUCKET_NAME}/${destination}...`);

            await bucket.upload(filePath, {
                destination: destination,
                metadata: {
                    contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
                },
            });

            console.log(`✅ Uploaded: ${fileName}`);

            uploadedFiles.push({
                fileName: fileName,
                uri: `gs://${BUCKET_NAME}/${destination}`, // Vertex AI uses gs:// URIs
                mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
                authority: authorityFolder,
                lastUpdated: new Date().toISOString()
            });

        } catch (err) {
            console.error(`❌ Failed to upload ${fileName}:`, err.message);
        }
    }

    // Save manifest
    if (uploadedFiles.length > 0) {
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(uploadedFiles, null, 2));
        console.log(`\n💾 Schema manifest saved to: ${MANIFEST_PATH}`);
    }
}

// execute if run directly
uploadFiles();
