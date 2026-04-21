import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  let key = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
  if (key.startsWith('"') && key.endsWith('"')) key = key.substring(1, key.length - 1);
  if (key.startsWith("'") && key.endsWith("'")) key = key.substring(1, key.length - 1);
  
  const d = google.drive({ version: 'v3', auth: key });
  try {
     const res = await d.files.get({ fileId: '1llhIBvpP_ahOmmFHrqnkJq8FkQX0hkZd', alt: 'media', supportsAllDrives: true }, { responseType: 'stream' as const });
     console.log("Success! Stream obtained.");
  } catch (e: any) {
     console.error("GaxiosError?", e.message);
  }
}
run();
