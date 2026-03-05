// =============================================================================
// TikTok Adapter — Entry Point
// =============================================================================

require('dotenv').config();
const express = require('express');
const { connectConsumer } = require('./kafka/kafka.consumer');

const app = express();
app.use(express.json());

app.get('/health', (_, res) => res.json({ 
  status: 'ok', 
  service: 'tiktok-adapter',
  timestamp: new Date().toISOString()
}));

const PORT = process.env.PORT || 3011;

async function start() {
  try {
    // Connect Kafka consumer (background)
    await connectConsumer();
    
    app.listen(PORT, () => {
      console.log(`🎵 TikTok Adapter running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start TikTok Adapter:', err);
    process.exit(1);
  }
}

start();
