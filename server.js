require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// API endpoint for image generation
app.post('/api/generate', async (req, res) => {
  try {
    const { model, input } = req.body;
    
    if (!process.env.AIHUBMIX_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await axios.post(
      `https://aihubmix.com/v1/models/${model}/predictions`,
      { input },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIHUBMIX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error generating image:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// API endpoint for checking task status (for async models like Flux)
app.get('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!process.env.AIHUBMIX_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await axios.get(
      `https://api.aihubmix.com/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIHUBMIX_API_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error checking task:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Make sure to set AIHUBMIX_API_KEY in .env file`);
});
