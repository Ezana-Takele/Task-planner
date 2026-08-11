const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Task Planner API running');
});

const tasks = require('./routes/tasks');  // <-- must match filename
app.use('/api', tasks);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
