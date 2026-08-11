const express = require('express');
const app = express();

app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Task Planner API running');
});

// Start server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
