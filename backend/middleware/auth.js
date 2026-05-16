const { getGroup } = require('../services/firestore');

async function auth(req, res, next) {
  const apiKey  = req.headers['x-api-key'];
  const groupId = req.headers['x-group-id'];

  if (!apiKey || !groupId) {
    return res.status(401).json({ error: 'Missing x-api-key or x-group-id header' });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Validate group exists and attach it to the request for downstream use
  const group = await getGroup(groupId);
  if (!group) {
    return res.status(401).json({ error: 'Unknown group ID' });
  }

  req.groupId = groupId;
  req.group   = group;
  next();
}

module.exports = auth;
