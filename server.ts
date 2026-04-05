import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import { google } from "googleapis";
import multer from "multer";
import cookieSession from "cookie-session";
import { Readable } from "stream";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/google/callback`
);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(
    cookieSession({
      name: "session",
      keys: ["secret-key"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Google OAuth routes
  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent",
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req as any).session.tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error getting tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/google/status", (req, res) => {
    res.json({ connected: !!(req as any).session?.tokens });
  });

  app.post("/api/upload-to-drive", upload.single("file"), async (req: any, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: "Not connected to Google Drive" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const fileMetadata = {
        name: req.file.originalname,
      };
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
}

startServer();
