const express = require('express');
const cors = require('cors');
const { io } = require('socket.io-client');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to musicgpt-main socket server
const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
const socket = io(socketServerUrl, {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  // Connected to musicgpt-main socket server
});

socket.on('connect_error', (error) => {
  // Failed to connect to musicgpt-main socket server
});

socket.on('song-progress', (data) => {
  // Received song-progress event (should not happen)
});

socket.on('disconnect', () => {
  // Disconnected from musicgpt-main socket server
});

// HTTP endpoint to create songs
app.post('/create-song', async (req, res) => {
  try {
    const { prompt, itemIds } = req.body;
    
    if (!prompt || !itemIds || !Array.isArray(itemIds) || itemIds.length !== 2) {
      return res.status(400).json({ success: false, error: 'Invalid data received' });
    }

    const [item1Id, item2Id] = itemIds;
    
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
        
        if (progress % 10 === 0) {
          // Item1 progress milestone
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
        
        if (progress % 10 === 0) {
          // Item2 progress milestone
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
      // Both items completed
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Backend server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    socketConnected: socket.connected
  });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// User profile endpoint
app.get('/user/profile', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }


    // Fetch user profile from Firebase
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();
    
    const userProfile = {
      uid: userId,
      displayName: userData.displayName || null,
      email: userData.email || null,
      photoURL: userData.photoURL || null,
      createdAt: userData.createdAt || null,
      updatedAt: userData.updatedAt || null
    };

    res.json({ success: true, user: userProfile });
  } catch (error) {
    console.error('Error fetching user profile from Firebase:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// Update user profile endpoint
app.put('/user/profile', async (req, res) => {
  try {
    const { userId, displayName, photoURL } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    
    // Update user profile in Firebase
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      displayName: displayName || null,
      photoURL: photoURL || null,
      updatedAt: serverTimestamp()
    });

    // Fetch updated profile
    const updatedDoc = await getDoc(userDocRef);
    const updatedData = updatedDoc.data();

    const updatedUserProfile = {
      uid: userId,
      displayName: updatedData.displayName || null,
      email: updatedData.email || null,
      photoURL: updatedData.photoURL || null,
      updatedAt: updatedData.updatedAt || null
    };

    res.status(201).json({ success: true, message: 'Profile updated successfully', user: updatedUserProfile });
  } catch (error) {
    console.error('Error updating user profile in Firebase:', error);
    res.status(500).json({ success: false, error: 'Failed to update user profile' });
  }
});

// Profile picture upload endpoint
app.post('/user/profile-picture', upload.single('profilePicture'), async (req, res) => {
  
  try {
    const { userId } = req.body;
    
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }


    // For now, return a mock URL since we don't have Firebase Storage setup in Express
    // In a real implementation, you would upload to Firebase Storage or another storage service
    const mockPhotoURL = `https://picsum.photos/seed/${userId}-${Date.now()}/200/200.jpg`;

    // Update user profile with new photo URL
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      photoURL: mockPhotoURL,
      updatedAt: serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: 'Profile picture uploaded successfully',
      photoURL: mockPhotoURL
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
  }
});

// Test GET endpoint for profile picture route
app.get('/user/profile-picture', (req, res) => {
  res.json({ message: 'Profile picture GET endpoint working', method: 'GET' });
});

app.listen(PORT, '0.0.0.0', () => {
  // Backend server listening on port ${PORT}
});
