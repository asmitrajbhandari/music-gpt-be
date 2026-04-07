const express = require('express');
const cors = require('cors');
const { io } = require('socket.io-client');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to musicgpt-main socket server
const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
const socket = io(socketServerUrl, {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to musicgpt-main socket server');
});

socket.on('connect_error', (error) => {
  console.error('Failed to connect to musicgpt-main socket server:', error.message);
});

socket.on('song-progress', (data) => {
  console.log('Received song-progress event (should not happen):', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from musicgpt-main socket server');
});

// HTTP endpoint to create songs
app.post('/create-song', async (req, res) => {
  try {
    const { prompt, itemIds } = req.body;
    
    console.log('HTTP REQUEST RECEIVED:', prompt);
    console.log('Item IDs:', itemIds);
    
    if (!prompt || !itemIds || !Array.isArray(itemIds) || itemIds.length !== 2) {
      console.error('Invalid data received');
      return res.status(400).json({ success: false, error: 'Invalid data' });
    }

    const [item1Id, item2Id] = itemIds;
    
    console.log('Starting progress simulation for items:', item1Id, item2Id);
    
    res.json({ success: true, message: 'Song creation started' });
    
    // Simulate progress and send via socket to musicgpt-main
    const simulateItem1 = async () => {
      for (let progress = 1; progress <= 100; progress++) {
        const progressData = {
          id: item1Id,
          prompt: prompt,
          progress,
          status: progress === 100 ? 'completed' : 'generating',
        };
        
        socket.emit('song-progress', progressData);
        console.log('Emitted song-progress for item1:', progressData);
        
        if (progress % 10 === 0) {
          console.log(`Item1 Progress: ${progress}%`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      
      const completionData = {
        id: item1Id,
        prompt: prompt,
        progress: 100,
        status: 'completed',
        result: {
          url: `https://example.com/song-${item1Id}.mp3`,
          duration: 120
        }
      };
      socket.emit('song-progress', completionData);
    };
    
    const simulateItem2 = async () => {
      for (let progress = 1; progress <= 100; progress++) {
        const progressData = {
          id: item2Id,
          prompt: prompt,
          progress,
          status: progress === 100 ? 'completed' : 'generating',
        };
        
        socket.emit('song-progress', progressData);
        console.log('Emitted song-progress for item2:', progressData);
        
        if (progress % 10 === 0) {
          console.log(`Item2 Progress: ${progress}%`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      const completionData = {
        id: item2Id,
        prompt: prompt,
        progress: 100,
        status: 'completed',
        result: {
          url: `https://example.com/song-${item2Id}.mp3`,
          duration: 120
        }
      };
      socket.emit('song-progress', completionData);
    };
    
    Promise.all([simulateItem1(), simulateItem2()]).then(() => {
      console.log('Both items completed');
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server listening on port ${PORT}`);
  console.log(`HTTP endpoint: POST http://localhost:${PORT}/create-song`);
  console.log('Will send song-progress events to musicgpt-main via WebSocket');
});
