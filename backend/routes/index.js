const express = require('express');
const router = express.Router();

// "/" GET
router.get('/', (req, res) => {
  res.send('This is Raptr Automation_UI API server');
});

module.exports = router;
