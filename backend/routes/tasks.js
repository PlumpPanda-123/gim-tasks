const express  = require('express');
const router   = express.Router();
const fs       = require('../services/firestore');

const VALID_SKILLS = [
  'ATTACK','STRENGTH','DEFENCE','RANGED','PRAYER','MAGIC','RUNECRAFTING',
  'HITPOINTS','CRAFTING','MINING','SMITHING','FISHING','COOKING','FIREMAKING',
  'WOODCUTTING','AGILITY','HERBLORE','THIEVING','FLETCHING','SLAYER',
  'FARMING','CONSTRUCTION','HUNTER','OTHER',
];

const VALID_STATUSES  = ['UNASSIGNED', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED'];
const VALID_PRIORITIES = ['NORMAL', 'URGENT'];

function isMember(group, username) {
  return group.members.map(m => m.toLowerCase()).includes(username?.toLowerCase());
}

// GET /tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await fs.getTasks(req.groupId);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /tasks
router.post('/', async (req, res) => {
  try {
    const { name, skill, quantity, assignee, createdBy, priority } = req.body;

    if (!name || !skill || !quantity || !createdBy) {
      return res.status(400).json({ error: 'name, skill, quantity, and createdBy are required' });
    }
    if (!VALID_SKILLS.includes(skill)) {
      return res.status(400).json({ error: `Invalid skill. Must be one of: ${VALID_SKILLS.join(', ')}` });
    }
    if (!isMember(req.group, createdBy)) {
      return res.status(403).json({ error: 'createdBy must be a group member' });
    }
    if (assignee && !isMember(req.group, assignee)) {
      return res.status(403).json({ error: 'assignee must be a group member' });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'priority must be NORMAL or URGENT' });
    }

    const task = await fs.createTask(req.groupId, {
      name,
      skill,
      quantity:          Number(quantity),
      quantityCompleted: 0,
      assignee:          assignee || null,
      createdBy,
      status:            assignee ? 'CLAIMED' : 'UNASSIGNED',
      priority:          priority || 'NORMAL',
    });

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /tasks/:id/assign
router.patch('/:id/assign', async (req, res) => {
  try {
    const { assignee } = req.body;

    if (!assignee) {
      return res.status(400).json({ error: 'assignee is required' });
    }
    if (!isMember(req.group, assignee)) {
      return res.status(403).json({ error: 'assignee must be a group member' });
    }

    const updated = await fs.updateTask(req.groupId, req.params.id, {
      assignee,
      status: 'CLAIMED',
    });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

// PATCH /tasks/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updated = await fs.updateTask(req.groupId, req.params.id, { status });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH /tasks/:id/progress
router.patch('/:id/progress', async (req, res) => {
  try {
    const { quantityCompleted } = req.body;

    if (quantityCompleted === undefined || quantityCompleted === null) {
      return res.status(400).json({ error: 'quantityCompleted is required' });
    }
    const qty = Number(quantityCompleted);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: 'quantityCompleted must be a non-negative number' });
    }

    const updated = await fs.updateTask(req.groupId, req.params.id, { quantityCompleted: qty });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// DELETE /tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await fs.deleteTask(req.groupId, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
