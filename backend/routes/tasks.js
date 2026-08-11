const express = require('express');
const router = express.Router();

// Temporary in-memory tasks
let tasks = [
  { id: 1, title: 'First Task' },
  { id: 2, title: 'Second Task' }
];

// GET all tasks
router.get('/tasks', (req, res) => {
  res.json(tasks);
});

// POST new task
router.post('/tasks', (req, res) => {
  const newTask = {
    id: tasks.length + 1,
    title: req.body.title
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// DELETE task by id
router.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  tasks = tasks.filter(task => task.id !== id);
  res.json({ message: `Task ${id} deleted` });
});

module.exports = router;
