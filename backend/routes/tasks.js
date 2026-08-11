const express = require('express');
const router = express.Router();

router.get('/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'First Task' },
    { id: 2, title: 'Second Task' }
  ]);
});

module.exports = router;
