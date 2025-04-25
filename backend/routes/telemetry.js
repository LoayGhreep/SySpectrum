// backend/routes/telemetry.js
const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ message: 'Telemetry module alive 🚀' });
});

module.exports = router;
