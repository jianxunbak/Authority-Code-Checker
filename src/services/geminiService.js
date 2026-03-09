/*
 * Note: This file contains the logic for querying Vertex AI.
 * In a real-world web app, this code MUST run on a backend server (Node.js/Python)
 * because it requires Google Cloud Service Account credentials which cannot be exposed in the browser.
 */

import { VertexAI } from '@google-cloud/vertexai';

// In a real app, these values come from your backend config
const PROJECT_ID = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = 'us-central1'; // or asia-southeast1

let model = null;

// Initialize if we were on a server
try {
  const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
  model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.0-pro',
  });
} catch (e) {
  console.warn("Vertex AI Client could not be initialized (Expected in Browser Environment).");
}

export const queryGeminiAgent = async (userQuery) => {
  // If we are in the browser, valid Vertex AI calls will fail due to CORS/Auth.
  // We will return a mock error or simulated response for now.
  if (typeof window !== 'undefined') {
    console.warn("Cannot call Vertex AI directly from Browser due to security.");
    // Fallback to the mock simulation for the UI demo using the user's query
    // In a full implementation, you would doing: await fetch('/api/query', { body: userQuery })
    return {
      answer: "Vertex AI Integration is ready on the backend. " +
        "To see real results, this function needs to run in a Node.js environment (e.g. Cloud Run). " +
        "For now, here is a simulated answer for: " + userQuery,
      source_department: "System Notification",
      confidence_score: 1.0,
      related_rules: ["Backend Integration Required"]
    };
  }

  // Real Server-Side Logic
  try {
    const prompt = `
        You are an expert Singapore Authority Compliance Agent.
        Your goal is to assist architects with accurate information from Singapore authorities (URA, BCA, SCDF, etc.).
        
        User Query: "${userQuery}"
        
        Please provide a structured response with:
        1. A direct answer citing specific codes if possible.
        2. The likely source department (e.g., URA, BCA).
        3. A confidence score (0-1).
        4. Any specific rules or clauses that are relevant.
        
        Use JSON format:
        {
          "answer": "...",
          "source_department": "...",
          "confidence_score": 0.95,
          "related_rules": ["..."]
        }
      `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates[0].content.parts[0].text;

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Vertex AI Error:", error);
    throw error;
  }
};
