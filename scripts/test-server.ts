import express from 'express';

const app = express();
app.use(express.json());

// Mock agent endpoint
app.post('/agent/input', (req, res) => {
  console.log('Received request:', req.body);
  
  // Mock response
  const response = `Test response to: ${req.body.input.text}`;
  res.json(response);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});
