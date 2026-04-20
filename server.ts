import express from "express";
import path from "path";
import cors from "cors";

console.log("Starting server.ts...");

import Stripe from "stripe";
import dotenv from "dotenv";
import { google } from "googleapis";
import multer from "multer";
import cookieSession from "cookie-session";
import { Readable } from "stream";

dotenv.config();

let globalDriveTokens: any = null;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

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
      let baseUrl = process.env.APP_URL;
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
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      detectedOrigin: `${protocol}://${host}`,
      configAppUrl: process.env.APP_URL,
      configRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      driveTokensLoaded: !!globalDriveTokens
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
    let tokens = req.headers['x-drive-tokens'] ? JSON.parse(req.headers['x-drive-tokens'] as string) : null;
    if (!tokens) {
      tokens = globalDriveTokens || (req as any).session?.tokens;
    }

    if (!tokens) {
      return res.status(401).json({ error: "Google Drive not connected. Admin must connect Drive in Studio Hub." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
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
        fields: "id, webViewLink, webContentLink, thumbnailLink",
      });

      // Make file public if needed, or just return the link
      // For this demo, we'll just return the links
      res.json({
        id: response.data.id,
        url: response.data.webViewLink,
        thumbnailUrl: response.data.thumbnailLink || response.data.webViewLink,
      });
    } catch (error: any) {
      console.error("Error uploading to Drive:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive/list/:folderId", async (req, res) => {
    const { folderId } = req.params;
    console.log(`[Drive] Listing folderContent: ${folderId}`);
    
    let drive;
    if (globalDriveTokens) {
      console.log("[Drive] Using authenticated OAuth tokens for listing");
      oauth2Client.setCredentials(globalDriveTokens);
      drive = google.drive({ version: "v3", auth: oauth2Client });
    } else {
      let apiKey = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
      
      // Remove potential surrounding quotes
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.substring(1, apiKey.length - 1);
      }
      if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
        apiKey = apiKey.substring(1, apiKey.length - 1);
      }

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Google Drive access required. Please link your Google Drive in Studio Hub or set an API Key." 
        });
      }
      console.log(`[Drive] Using API Key for listing: ${apiKey.substring(0, 6)}...`);
      drive = google.drive({ version: "v3", auth: apiKey });
    }

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
        fields: "files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)",
        pageSize: 100,
      });

      console.log(`[Drive] Found ${response.data.files?.length || 0} files`);
      res.json(response.data.files || []);
    } catch (error: any) {
      console.error("[Drive] List error details:", error);
      res.status(error.code || 500).json({ 
        error: error.message || "Failed to fetch from Drive"
      });
    }
  });

  app.get("/api/drive/image/:fileId", async (req, res) => {
    const { fileId } = req.params;
    
    let drive;
    if (globalDriveTokens) {
      oauth2Client.setCredentials(globalDriveTokens);
      drive = google.drive({ version: "v3", auth: oauth2Client });
    } else {
      let apiKey = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || "").trim();
      if (!apiKey) return res.status(401).send("Unauthorized");
      drive = google.drive({ version: "v3", auth: apiKey });
    }

    try {
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );
      
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
        fields: 'id'
      });

      const targetFolderId = folderResponse.data.id;

      // 2. Copy each selected file to the new folder
      const results = [];
      for (const fileId of selectedFileIds) {
        try {
          // Get original filename
          const fileMeta = await drive.files.get({ fileId, fields: 'name' });
          
          const copyResponse = await drive.files.copy({
            fileId: fileId,
            requestBody: {
              name: fileMeta.data.name,
              parents: [targetFolderId!]
            }
          });
          results.push({ id: fileId, status: 'success', newId: copyResponse.data.id });
        } catch (copyErr: any) {
          console.error(`Failed to copy file ${fileId}:`, copyErr);
          results.push({ id: fileId, status: 'error', error: copyErr.message });
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

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { orderId, amount, clientName, clientEmail, type = "order" } = req.body;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: clientEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: type === "booking" ? `Photography Booking #${orderId}` : `Photography Order #${orderId}`,
                description: `Payment for ${clientName}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL}/payment-success?orderId=${orderId}&type=${type}`,
        cancel_url: `${process.env.APP_URL}/payment-cancel?orderId=${orderId}&type=${type}`,
        metadata: {
          orderId,
          type,
        },
      });

      res.json({ id: session.id });
    } catch (error: any) {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.join(process.cwd(), "build");
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
