/*
 * script: upload_files.js
 * description: Utility to upload documents from 'knowledge_base' (recursive) to Gemini File API.
 * usage: node scripts/upload_files.js
 * prerequisites: npm install @google/generative-ai dotenv
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'knowledge_base');
const MANIFEST_PATH = path.join(process.cwd(), 'src/services/knowledge_manifest.json');

if (!API_KEY || API_KEY.includes('YOUR_API_KEY')) {
    console.error("❌ Error: Valid VITE_GEMINI_API_KEY is missing in .env file");
    process.exit(1);
}

const fileManager = new GoogleAIFileManager(API_KEY);

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

    if (files.length === 0) {
        console.log("No relevant files found to upload.");
        return;
    }

    console.log(`✨ Found ${files.length} files. Starting upload...`);

    const uploadedFiles = [];

    for (const filePath of files) {
        const fileName = path.basename(filePath);
        // Determine authority based on folder name immediately under knowledge_base
        const relativePath = path.relative(KNOWLEDGE_BASE_DIR, filePath);
        const authorityFolder = relativePath.split(path.sep)[0];

        // Simple mime check
        let mimeType = 'text/plain';
        if (fileName.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
        if (fileName.toLowerCase().endsWith('.csv')) mimeType = 'text/csv';

        try {
            console.log(`⬆️  Uploading ${fileName} (${authorityFolder})...`);

            const uploadResponse = await fileManager.uploadFile(filePath, {
                mimeType: mimeType,
                displayName: `${authorityFolder} - ${fileName}`,
            });

            console.log(`✅ Uploaded: ${uploadResponse.file.displayName}`);

            uploadedFiles.push({
                fileName: fileName,
                uri: uploadResponse.file.uri,
                mimeType: uploadResponse.file.mimeType,
                authority: authorityFolder,
                uploadTime: new Date().toISOString()
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
