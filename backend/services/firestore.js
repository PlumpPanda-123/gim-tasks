const admin = require('../config/firebase');

const db = admin.firestore();

// ── In-memory cache ───────────────────────────────────────────────────────────
// Prevents blowing through Firestore's free-tier read quota when 4 players poll.
// Group data changes rarely → 5 min TTL. Tasks are invalidated on every write.

const _cache = new Map();

function _cacheSet(key, value, ttlMs) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return undefined; }
  return entry.value;
}

function _cacheInvalidate(groupId) {
  _cache.delete(`tasks:${groupId}`);
}

// ── Refs ──────────────────────────────────────────────────────────────────────

function groupRef(groupId) {
  return db.collection('groups').doc(groupId);
}

function tasksRef(groupId) {
  return groupRef(groupId).collection('tasks');
}

// ── Group ─────────────────────────────────────────────────────────────────────

async function getGroup(groupId) {
  const cached = _cacheGet(`group:${groupId}`);
  if (cached) return cached;
  const snap = await groupRef(groupId).get();
  if (!snap.exists) return null;
  const group = { id: snap.id, ...snap.data() };
  _cacheSet(`group:${groupId}`, group, 5 * 60 * 1000);
  return group;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

async function getTasks(groupId) {
  const cached = _cacheGet(`tasks:${groupId}`);
  if (cached) return cached;
  const snap = await tasksRef(groupId).orderBy('createdAt', 'asc').get();
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  _cacheSet(`tasks:${groupId}`, tasks, 60 * 1000);
  return tasks;
}

async function createTask(groupId, data) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await tasksRef(groupId).add({ ...data, createdAt: now, updatedAt: now });
  const created = await ref.get();
  _cacheInvalidate(groupId);
  return { id: created.id, ...created.data() };
}

async function updateTask(groupId, taskId, updates) {
  const ref = tasksRef(groupId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  const updated = await ref.get();
  _cacheInvalidate(groupId);
  return { id: updated.id, ...updated.data() };
}

async function deleteTask(groupId, taskId) {
  const ref = tasksRef(groupId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  _cacheInvalidate(groupId);
  return true;
}

module.exports = { getGroup, getTasks, createTask, updateTask, deleteTask };
