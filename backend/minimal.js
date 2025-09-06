const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

console.log('Starting minimal server...');

app.get('/', (req, res) => {
  res.json({ message: 'Minimal server working' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

app.listen(5000, () => {
  console.log('Minimal server running on port 5000');
});