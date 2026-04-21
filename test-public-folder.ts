import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function testPublicFolder() {
  let apiKey = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
  
  if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
    apiKey = apiKey.substring(1, apiKey.length - 1);
  }
  const drive = google.drive({ version: "v3", auth: apiKey });

  // This is a known public ID or we just test again.
  try {
     const folderId = '1_JLgMB5vrgFu8NPXTHfcB70uahrZ3vVq';
     console.log("Testing with Drive API key on folder:", folderId);
     const result = await drive.files.get({ fileId: folderId, fields: 'id, name' });
     console.log("SUCCESS get:", result.data);

     // Now test list
     const listResult = await drive.files.list({
       q: `'${folderId}' in parents and trashed = false`,
       fields: 'files(id, name)'
     });
     console.log("SUCCESS list:", listResult.data.files?.length, "files");
  } catch (e: any) {
     console.error("FAIL:", e.message);
  }
}
testPublicFolder();
