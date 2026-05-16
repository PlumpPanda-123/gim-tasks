const admin = require('../config/firebase');

const db = admin.firestore();

function groupRef(groupId) {
  return db.collection('groups').doc(groupId);
}

function tasksRef(groupId) {
  return groupRef(groupId).collection('tasks');
}

// ── Group ─────────────────────────────────────────────────────────────────────

async function getGroup(groupId) {
  const snap = await groupRef(groupId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

async function getTasks(groupId) {
  const snap = await tasksRef(groupId).orderBy('createdAt', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function createTask(groupId, data) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await tasksRef(groupId).add({ ...data, createdAt: now, updatedAt: now });
  const created = await ref.get();
  return { id: created.id, ...created.data() };
}

async function updateTask(groupId, taskId, updates) {
  const ref = tasksRef(groupId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

async function deleteTask(groupId, taskId) {
  const ref = tasksRef(groupId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

module.exports = { getGroup, getTasks, createTask, updateTask, deleteTask };
