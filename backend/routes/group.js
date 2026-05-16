const express = require('express');
const router  = express.Router();

// GET /group — returns group document (members, name, etc.)
// groupId comes from the auth middleware via req.groupId / req.group
router.get('/', (req, res) => {
  const { id, name, members, createdAt } = req.group;
  res.json({ id, name, members, createdAt });
});

module.exports = router;
