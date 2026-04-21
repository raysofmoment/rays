import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config();

async function test() {
  const apiKey = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
  console.log("API Key exists:", !!apiKey);
  const drive = google.drive({ version: "v3", auth: apiKey });

  // Use a public Google Drive folder ID for testing, e.g., some known ID
  const folderId = "1s4b4x-_H6d6h478hS21aM8b3_F1wF51f"; // generic ID, or we can just try grabbing an ID from DB.
  
  // Actually, let's connect to Firebase to get the first booking's folderId
  console.log("fetching from DB not implemented here, so just doing a basic logic test.")
}
test();
