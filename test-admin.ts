import admin from 'firebase-admin';

try {
  admin.initializeApp();
  const db = admin.firestore();
  console.log("Firebase Admin initialized successfully.");
  
  db.collection("settings").doc("google_drive").get().then((doc) => {
    if (doc.exists) {
      console.log("Tokens found in Firestore:", Object.keys(doc.data()?.value || {}));
    } else {
      console.log("No tokens in Firestore.");
    }
    process.exit(0);
  }).catch((err) => {
    console.error("Firestore error:", err.message);
    process.exit(1);
  });
} catch (error: any) {
  console.error("Error standardizing:", error.message);
  process.exit(1);
}
