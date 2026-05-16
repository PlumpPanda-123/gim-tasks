/**
 * One-time Firestore initialisation script.
 * Usage: node initFirestore.js
 * Requires a serviceAccountKey.json in this directory OR environment variables set.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// ── Firebase init ────────────────────────────────────────────────────────────
let serviceAccount;
const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(keyPath)) {
  serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  // Fall back to env vars (useful in CI / Railway)
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ── Seed data ────────────────────────────────────────────────────────────────
const GROUP_ID   = uuidv4();
const API_KEY    = uuidv4();
const GROUP_NAME = 'FyreStarterz';
const MEMBERS    = ['Chimchar11', 'Torchic36', 'Cyndaquil32', 'Charmander0g'];

async function main() {
  console.log('Initialising Firestore…\n');

  // 1. Create group document
  const groupRef = db.collection('groups').doc(GROUP_ID);
  await groupRef.set({
    name:      GROUP_NAME,
    members:   MEMBERS,
    apiKey:    API_KEY,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✓ Group document created: groups/${GROUP_ID}`);

  // 2. Seed an example task
  const tasksRef = groupRef.collection('tasks');
  const taskRef  = await tasksRef.add({
    name:              'Mine 500 Iron Ore',
    skill:             'MINING',
    quantity:          500,
    quantityCompleted: 0,
    assignee:          'Player1',
    createdBy:         'Player1',
    status:            'CLAIMED',
    priority:          'NORMAL',
    createdAt:         admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:         admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✓ Seed task created: groups/${GROUP_ID}/tasks/${taskRef.id}`);

  // 3. Print summary
  console.log('\n────────────────────────────────────────');
  console.log('Setup complete. Copy these values into your .env and plugin config:\n');
  console.log(`GROUP_ID  = ${GROUP_ID}`);
  console.log(`API_KEY   = ${API_KEY}`);
  console.log('────────────────────────────────────────\n');
  console.log('Members allowlist:', MEMBERS.join(', '));
  console.log('Replace Player1–Player4 with real RuneScape usernames, then re-run if needed.\n');
}

main().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
