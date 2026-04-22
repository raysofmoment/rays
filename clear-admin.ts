import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function clearCollection(name) {
  console.log(`Clearing collection: ${name}`);
  const snap = await db.collection(name).get();
  let count = 0;
  for (const item of snap.docs) {
    await item.ref.delete();
    count++;
  }
  console.log(`Deleted ${count} documents from ${name}`);
}

async function run() {
  await clearCollection('orders');
  await clearCollection('employees');
  await clearCollection('serviceInquiries');
  console.log('All requested collections cleared!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
