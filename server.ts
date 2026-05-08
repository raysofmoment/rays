import express from "express";
import path from "path";
import cors from "cors";
import crypto from "crypto";

console.log("Starting server.ts...");

import dotenv from "dotenv";
import { google } from "googleapis";
import multer from "multer";
import cookieSession from "cookie-session";
import { Readable } from "stream";
import nodemailer from "nodemailer";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Initialize Admin SDK with values from config
let adminDb: any;
try {
  if (getApps().length === 0) {
    initializeApp({
      projectId: "gen-lang-client-0181287072"
    });
  }
  adminDb = getFirestore("ai-studio-f0783e53-3cf8-4d36-b766-31c39e6bf608");
} catch (err) {
  console.error("Failed to initialize Firebase Admin SDK:", err);
}

let globalDriveTokens: any = null;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "" // Will be set dynamically per request
);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      // Do not log static vite module fetches which confuse users by making them think a fetched ErrorBoundary component is an actual error
      if (req.url && (req.url.startsWith('/src/') || req.url.startsWith('/@') || req.url.startsWith('/node_modules/'))) {
        return;
      }
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  app.use(
    cookieSession({
      name: "session",
      keys: ["secret-key"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  const getValidRedirectUri = (req: express.Request) => {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const currentOrigin = `${protocol}://${host}`;
    
    let redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    // Check if process.env.GOOGLE_REDIRECT_URI is a valid URL starting with http
    if (redirectUri && !redirectUri.startsWith('http')) {
      console.warn(`[OAuth] Ignoring invalid GOOGLE_REDIRECT_URI: ${redirectUri}`);
      redirectUri = undefined;
    }

    if (!redirectUri) {
      let baseUrl = process.env.APP_URL || "https://www.raysofmoment.com";
      // Check if process.env.APP_URL is a valid URL starting with http
      if (baseUrl && !baseUrl.startsWith('http')) {
        console.warn(`[OAuth] Ignoring invalid APP_URL: ${baseUrl}`);
        baseUrl = undefined;
      }
      
      const sessionOrigin = baseUrl || currentOrigin;
      const cleanBaseUrl = sessionOrigin.endsWith('/') ? sessionOrigin.slice(0, -1) : sessionOrigin;
      redirectUri = `${cleanBaseUrl}/auth/google/callback`;
    }
    
    return redirectUri;
  };

  // API routes
  app.get("/api/health", async (req, res) => {
    console.log("[Health] Checking system status...");
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    
    res.json({ 
      status: "ok", 
      message: "Server is running",
      env: process.env.NODE_ENV,
      detectedOrigin: `${protocol}://${host}`,
      configAppUrl: process.env.APP_URL,
      configRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      driveTokensLoaded: !!globalDriveTokens,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/debug-error", (req, res) => {
    console.error("================ CLIENT ERROR CAUGHT ================");
    console.error("Message:", req.body.message);
    console.error("Stack:", req.body.stack);
    console.error("Component Stack:", req.body.componentStack);
    console.error("=====================================================");
    res.json({ status: "logged" });
  });

  // Google OAuth routes
  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri = getValidRedirectUri(req);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error("OAuth error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
      return res.status(500).json({ error: "Google OAuth credentials (Client ID/Secret) are not set in Settings." });
    }

    // Update client with latest config in case it changed
    oauth2Client.setCredentials({}); // Clear any old creds
    (oauth2Client as any)._clientId = clientId;
    (oauth2Client as any)._clientSecret = clientSecret;
    (oauth2Client as any).redirectUri = redirectUri;

    try {
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.file"],
        prompt: "consent",
        include_granted_scopes: true
      });
      
      console.log(`[OAuth] Generated Auth URL. Redirect URI: ${redirectUri}`);
      res.json({ url, redirectUri });
    } catch (err: any) {
      console.error("[OAuth] generateAuthUrl error:", err);
      res.status(500).json({ error: "Failed to generate auth URL: " + err.message });
    }
  });

  app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      console.error("[OAuth] Callback error from Google:", error);
      return res.status(400).send(`Authentication error: ${error}`);
    }

    if (!code) {
      return res.status(400).send("No authorization code received.");
    }

    // Ensure the client uses the SAME redirect URI for token exchange
    const redirectUri = getValidRedirectUri(req);
    (oauth2Client as any).redirectUri = redirectUri;

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req as any).session.tokens = tokens;
      globalDriveTokens = tokens;

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f9fafb;">
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827;">Authentication Successful!</h2>
              <p style="color: #4b5563;">You can close this window now.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  setTimeout(() => window.location.href = '/', 2000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("[OAuth] Error exchanging code for tokens:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; padding: 2rem;">
            <h1>Authentication Failed</h1>
            <p>Error details: ${error.message}</p>
            <p>Ensure your <strong>Client Secret</strong> matches what is in Google Cloud Console.</p>
            <button onclick="window.close()">Close Window</button>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/auth/google/sync", (req, res) => {
    if (req.body.tokens) {
      globalDriveTokens = req.body.tokens;
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "No tokens provided" });
    }
  });

  app.get("/api/auth/google/status", async (req, res) => {
    let connected = !!globalDriveTokens || !!(req as any).session?.tokens;
    res.json({ connected });
  });

  app.post("/api/upload-to-drive", upload.single("file"), async (req: any, res) => {
    try {
      let tokens = null;
      try {
        tokens = req.headers['x-drive-tokens'] ? JSON.parse(req.headers['x-drive-tokens'] as string) : null;
      } catch (parseErr) {
        console.error("[Drive Upload] Error parsing x-drive-tokens header:", parseErr);
      }

      if (!tokens) {
        tokens = globalDriveTokens || (req as any).session?.tokens;
      }

      if (!tokens) {
        console.warn("[Drive Upload] Unauthorized - No tokens found in session, headers, or global state");
        return res.status(401).json({ error: "Google Drive not connected. Admin must connect Drive in Studio Hub." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`[Drive Upload] Starting upload for ${req.file.originalname} (${req.file.size} bytes)`);

      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const { folderId } = req.body;

      const fileMetadata: any = {
        name: req.file.originalname,
      };
      
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink, thumbnailLink",
      });

      console.log(`[Drive Upload] Successfully uploaded file ID: ${response.data.id} (${response.data.name})`);

      res.json({
        id: response.data.id,
        name: response.data.name,
        url: response.data.webViewLink,
        thumbnailUrl: response.data.thumbnailLink || response.data.webViewLink,
      });
    } catch (error: any) {
      console.error("[Drive Upload] Error:", error);
      res.status(500).json({ error: error.message || "Internal server error during upload" });
    }
  });

  // Helper for API Key
  const getApiKey = () => {
    let apiKey = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) apiKey = apiKey.substring(1, apiKey.length - 1);
    if (apiKey.startsWith("'") && apiKey.endsWith("'")) apiKey = apiKey.substring(1, apiKey.length - 1);
    return apiKey;
  };

  app.get("/api/drive/list/:folderId", async (req, res) => {
    const { folderId } = req.params;
    console.log(`[Drive] API Request Received - Listing folder: ${folderId}`);
    
    try {
      let oauthTokens = globalDriveTokens || (req as any).session?.tokens;
      let apiKey = getApiKey();
      
      let drive: any;
      let authMethod = "None";

      if (oauthTokens) {
        console.log("[Drive] Using OAuth tokens for listing");
        oauth2Client.setCredentials(oauthTokens);
        drive = google.drive({ version: "v3", auth: oauth2Client });
        authMethod = "OAuth";
      } else if (apiKey) {
        console.log(`[Drive] Using API Key for listing`);
        drive = google.drive({ version: "v3", auth: apiKey });
        authMethod = "API Key";
      } else {
        return res.status(401).json({ error: "Google Drive not connected. Please set up API Key or OAuth." });
      }

      // Fetch files
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, createdTime)",
        pageSize: 100, // Reduced from 1000 for faster response
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const files = response.data.files || [];
      
      // Filter for images and videos
      let mediaFiles = files.filter((f: any) => 
        f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/')
      );

      console.log(`[Drive] Folder ${folderId} contains ${mediaFiles.length} media files (Method: ${authMethod})`);
      res.json(mediaFiles);

    } catch (error: any) {
      if (error.code === 404 || error.code === '404' || error.message?.includes('File not found')) {
        console.warn(`[Drive] Folder not found or not shared publicly: ${folderId}`);
        // Return 200 OK with empty array so frontend doesn't crash or show errors, just empty content
        return res.json([]);
      }
      console.error("[Drive] List API Critical Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/drive/image/:fileId", async (req, res) => {
    const { fileId } = req.params;
    
    let drive: any = null;
    let apiKey = getApiKey();

    const tryGetImage = async (dClient: any) => {
       const response = await dClient.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
       );
       return response;
    };

    try {
      let response: any;
      
      if (globalDriveTokens) {
        oauth2Client.setCredentials(globalDriveTokens);
        drive = google.drive({ version: "v3", auth: oauth2Client });
        try {
          response = await tryGetImage(drive);
        } catch (err: any) {
          // Silent fallback
          drive = null; // Reset to try API key
        }
      }

      if (!drive) {
        if (!apiKey) return res.status(401).send("Unauthorized");
        drive = google.drive({ version: "v3", auth: apiKey });
        response = await tryGetImage(drive);
      }
      
      // Try to get metadata for mimeType and name
      try {
        const metadata = await drive.files.get({ fileId, fields: "mimeType, name" });
        if (metadata.data.mimeType) {
          res.setHeader("Content-Type", metadata.data.mimeType);
        }
        if (metadata.data.name) {
          res.setHeader("Content-Disposition", `inline; filename="${metadata.data.name}"`);
        }
      } catch (metaErr) {
        // Ignore metadata errors
      }

      response.data.pipe(res);
    } catch (error: any) {
      console.error("[Drive] Image stream error:", error);
      res.status(500).send("Failed to stream image");
    }
  });

  app.delete("/api/drive/file/:fileId", async (req: any, res) => {
    const { fileId } = req.params;
    
    let tokens = req.headers['x-drive-tokens'] ? JSON.parse(req.headers['x-drive-tokens'] as string) : null;
    if (!tokens) {
      tokens = globalDriveTokens || (req as any).session?.tokens;
    }

    if (!tokens) {
      return res.status(401).json({ error: "Google Drive not connected. Admin must connect Drive in Studio Hub." });
    }

    try {
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      
      await drive.files.delete({
        fileId: fileId,
      });
      
      console.log(`[Drive] Deleted file ${fileId}`);
      res.json({ success: true });
    } catch (error: any) {
      if (error.response?.status === 404 || (error.message && error.message.includes("File not found"))) {
        console.log(`[Drive] File ${fileId} already deleted or not found, treating as success.`);
        res.json({ success: true, message: "File already deleted" });
        return;
      }
      console.error("[Drive] Delete file error:", error.message || "Unknown error");
      res.status(500).json({ error: error.message || "Failed to delete file from Drive" });
    }
  });

  app.post("/api/drive/export-selection", async (req, res) => {
    const { folderId, selectedFileIds, selectionName } = req.body;
    
    if (!globalDriveTokens) {
      return res.status(401).json({ error: "Google Drive not connected" });
    }

    if (!folderId || !selectedFileIds || !Array.isArray(selectedFileIds)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      oauth2Client.setCredentials(globalDriveTokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      // 1. Create a subfolder for selected photos
      const folderMetadata = {
        name: selectionName || `Selected Photos ${new Date().toLocaleDateString()}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId]
      };

      const folderResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
        supportsAllDrives: true
      });

      const targetFolderId = folderResponse.data.id;

      // 2. Copy each selected file to the new folder
      const results = [];

      // Create an anonymous drive client for reading if the OAuth user doesn't have read access to the specific file
      const getApiKey = () => {
        let key = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
        if (key.startsWith('"') && key.endsWith('"')) key = key.substring(1, key.length - 1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.substring(1, key.length - 1);
        return key;
      };
      const apiKey = getApiKey();
      const anonymousDrive = apiKey ? google.drive({ version: "v3", auth: apiKey }) : null;

      for (const fileId of selectedFileIds) {
        try {
          // Get original filename
          let fileName = "Selected Photo";
          try {
             const fileMeta = await drive.files.get({ fileId, fields: 'name', supportsAllDrives: true });
             fileName = fileMeta.data.name || fileName;
          } catch (metaErr: any) {
             if (anonymousDrive) {
               const anonMeta = await anonymousDrive.files.get({ fileId, fields: 'name', supportsAllDrives: true });
               fileName = anonMeta.data.name || fileName;
             } else {
               throw metaErr; // If no API key, we have to abort
             }
          }
          
          try {
            const copyResponse = await drive.files.copy({
              fileId: fileId,
              supportsAllDrives: true,
              requestBody: {
                name: fileName,
                parents: [targetFolderId!]
              }
            });
            results.push({ id: fileId, status: 'success', newId: copyResponse.data.id });
          } catch (copyErr: any) {
             if (copyErr.code === 404 || copyErr.message?.includes('File not found')) {
                if (!anonymousDrive) throw copyErr;
                
                // Manually download with API key and upload with OAuth
                const res = await anonymousDrive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
                const mimeType = res.headers['content-type'] || 'image/jpeg';
                
                const uploadResponse = await drive.files.create({
                  requestBody: {
                    name: fileName,
                    parents: [targetFolderId!]
                  },
                  media: {
                    mimeType: mimeType,
                    body: res.data
                  },
                  fields: 'id',
                  supportsAllDrives: true
                });
                results.push({ id: fileId, status: 'success', newId: uploadResponse.data.id });
             } else {
                throw copyErr;
             }
          }
        } catch (err: any) {
          console.error(`Failed to process file ${fileId}:`, err.message);
          results.push({ id: fileId, status: 'error', error: err.message });
        }
      }

      res.json({
        success: true,
        targetFolderId,
        results
      });
    } catch (error: any) {
      console.error("[Drive] Export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PhonePe Integration
  app.post("/api/phonepe/initiate", async (req, res) => {
    try {
      const { orderId, amount, clientName, clientEmail, type = "booking" } = req.body;
      
      const merchantId = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT";
      const saltKey = process.env.PHONEPE_SALT_KEY || "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
      const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
      const clientId = process.env.PHONEPE_CLIENT_ID;
      const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
      let hostUrl = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
      if (!hostUrl.startsWith("http://") && !hostUrl.startsWith("https://")) {
        hostUrl = `https://${hostUrl}`;
      }
      
      // Auto-correct invalid production/UAT host URLs that users might mistakenly use
      if (hostUrl.includes("checkout/v2")) {
        hostUrl = hostUrl.includes("preprod") || hostUrl.includes("sandbox") 
          ? "https://api-preprod.phonepe.com/apis/pg-sandbox" 
          : "https://api.phonepe.com/apis/hermes";
      }

      if (!hostUrl.includes("phonepe.com")) {
        return res.status(400).json({ error: "Configuration Error: PHONEPE_HOST_URL must be a valid PhonePe API domain (e.g., api-preprod.phonepe.com or api.phonepe.com). Please check your Environment Variables." });
      }

      const transactionId = `MT${Date.now()}`;
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const host = req.headers.host;
      const currentOrigin = `${protocol}://${host}`;
      const appUrl = process.env.APP_URL || currentOrigin;
      
      const payload = {
        merchantId,
        merchantTransactionId: transactionId,
        merchantUserId: (clientEmail || `MUID${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 30),
        amount: Math.round(amount * 100), // convert to paise
        redirectUrl: `${appUrl}/payment-success?orderId=${orderId}&type=${type}&transactionId=${transactionId}`,
        redirectMode: "REDIRECT",
        callbackUrl: `${appUrl}/api/phonepe/callback`,
        mobileNumber: "9999999999", // Can be passed from client
        paymentInstrument: {
          type: "PAY_PAGE"
        }
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      
      let endpoint = hostUrl;
      // If the provided hostUrl does not already contain the pay endpoint path, append the standard one
      if (!endpoint.includes("/pay")) {
        endpoint = endpoint.replace(/\/$/, "") + "/pg/v1/pay";
      }

      // PhonePe explicitly requires the string "/pg/v1/pay" for the checksum of this API
      const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
      const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
      const xVerify = sha256 + "###" + saltIndex;

      console.log(`[PhonePe] Initiating payment for ${orderId}, amount: ${amount}, endpoint: ${endpoint}`);

      const headers: any = {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "accept": "application/json"
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ request: base64Payload })
      });

      let data;
      try {
        const textResponse = await response.text();
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("[PhonePe] Failed to parse PhonePe response. Is the Host URL correct?", parseError);
        return res.status(400).json({ error: "PhonePe returned an invalid response. Ensure PHONEPE_HOST_URL is correct." });
      }
      
      if (data.success && data.data && data.data.instrumentResponse) {
        res.json({ url: data.data.instrumentResponse.redirectInfo.url });
      } else {
        console.error("[PhonePe] Initiation failed:", data);
        if (data.code === '404' || data.code === 'KEY_NOT_CONFIGURED') {
          res.status(400).json({ error: "PhonePe Error: Invalid Merchant ID or Salt Key. Check if you are using UAT credentials on a Production URL." });
        } else if (data.message && data.message.includes("Api Mapping Not Found")) {
          res.status(400).json({ error: "PhonePe Error: Invalid Host URL. Use 'https://api.phonepe.com/apis/hermes' for Production." });
        } else {
          res.status(400).json({ error: data.message || "Failed to initiate PhonePe payment" });
        }
      }
    } catch (error: any) {
      console.error("[PhonePe] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/phonepe/callback", async (req, res) => {
    try {
      // Logic for verifying callback from PhonePe
      console.log("[PhonePe] Callback received:", req.body);
      // In production, verify the X-VERIFY header here as well
      res.json({ success: true });
    } catch (error: any) {
      console.error("[PhonePe] Callback Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).send(error.message);
    }
  });

  // Log environment status (without secrets)
  console.log("--- Environment Status ---");
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`APP_URL: ${process.env.APP_URL}`);
  console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? "SET" : "MISSING"}`);
  console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING"}`);
  console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"}`);
  console.log(`GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || "DEFAULT"}`);
  console.log("--------------------------");

  // Common email configuration check
  const smtpPort = parseInt(process.env.SMTP_PORT || "465");
  const hostRaw = process.env.SMTP_HOST || "smtp.titan.email";
  const smtpHost = hostRaw.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports like 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER || "raysofmoment@raysofmoment.com",
      pass: process.env.SMTP_PASS || "", 
    },
    connectionTimeout: 15000,
  });

  // Generic Email Sending API
  app.get("/api/check-email-status", async (req, res) => {
    try {
      if (!process.env.SMTP_PASS) {
        return res.json({ 
          connected: false, 
          message: "SMTP password (SMTP_PASS) is missing in environment variables.",
          host: process.env.SMTP_HOST || "smtp.titan.email",
          user: process.env.SMTP_USER || "Enter your email",
        });
      }

      await transporter.verify();
      const options = transporter.options as any;
      res.json({ 
        connected: true, 
        message: "Email server connected successfully!",
        host: options.host,
        user: options.auth?.user
      });
    } catch (error: any) {
      console.error("Email Verification Error:", error);
      const options = transporter.options as any;
      let hint = "";
      if (error.message && error.message.includes("timeout")) {
        hint = " (Hint: This might be due to a blocked port or incorrect SMTP host. Port numbers 465 or 587 are usually used. Double-check your SMTP_HOST and SMTP_PORT)";
      }
      res.status(500).json({ 
        connected: false, 
        message: "Failed to connect to email server." + hint, 
        error: error.message,
        host: options.host,
        port: options.port
      });
    }
  });

  app.post("/api/send-email", express.json(), async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: "Missing required fields (to, subject, text/html)" });
      }

      if (!process.env.SMTP_PASS) {
        console.warn("SMTP_PASS is not set. Simulating email send:");
        console.log(`To: ${to}\nSubject: ${subject}\nText: ${text}`);
        return res.json({ success: true, message: "Email simulated (SMTP_PASS not set)" });
      }

      const info = await transporter.sendMail({
        from: `"Rays of Moment" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log("Message sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });

  // Specific 404 for API routes to prevent falling through to Vite SPA
  app.all("/api/*", (req, res) => {
    console.warn(`[404] API Route Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: `API route not found: ${req.method} ${req.url}`,
      suggestion: "Check if the API path is correct and registered in server.ts"
    });
  });

  // Global error handler for ALL routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("!!! GLOBAL SERVER ERROR !!!");
    console.error(`Path: ${req.url}`);
    console.error(err);
    
    if (req.url.startsWith('/api/')) {
      return res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
        path: req.url
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.join(process.cwd(), "dist");
    app.use(express.static(buildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
}

startServer();
