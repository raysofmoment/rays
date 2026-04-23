import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    const drive = google.drive({ version: "v3", auth: process.env.GOOGLE_DRIVE_API_KEY });
    // Let's use a known public file ID from the logs if possible, 
    // or just try to instantiate it.
    console.log("Successfully created API Key Drive client.");
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
