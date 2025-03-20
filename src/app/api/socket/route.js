import { Server } from 'socket.io';

// In-memory game state management
const gameRooms = new Map();
const activeUsers = new Map();

/**
 * Socket.io Server Handler
 */
export async function GET(req) {
  const res = new Response();
  
  // Check if socket.io server already exists
  if (res.socket?.server?.io) {
    res.end();
    return new Response('Socket is already running', { status: 200 });
  }
  
  // Set up the Socket.io server
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
  // Store the Socket.io server 
  res.socket.server.io = io;
  
  // Game-specific namespace
  const drawingGame = io.of('/drawing-game');
  
  // Handle connections to the drawing game namespace
  drawingGame.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // User joins with profile
    socket.on('user:join', ({ userId, username, avatar }) => {
      activeUsers.set(socket.id, { userId, username, avatar, score: 0 });
      socket.broadcast.emit('user:joined', { userId, username, avatar });
      
      // Send active users list to the new user
      const users = Array.from(activeUsers.values());
      socket.emit('users:list', users);
    });
    
    // Room management
    socket.on('room:create', ({ roomId, roomName, createdBy, maxPlayers, isPrivate, password }) => {
      const roomData = {
        id: roomId,
        name: roomName,
        createdBy,
        players: [{ userId: createdBy, socketId: socket.id }],
        maxPlayers: maxPlayers || 8,
        isPrivate: isPrivate || false,
        password: password || null,
        status: 'waiting', // waiting, playing, ended
        currentRound: 0,
        totalRounds: 3,
        currentDrawer: null,
        currentWord: null,
        startTime: null,
        timePerRound: 60, // seconds
        scores: {},
      };
      
      gameRooms.set(roomId, roomData);
      socket.join(roomId);
      
      // Notify all users about the new room
      drawingGame.emit('rooms:update', Array.from(gameRooms.values())
        .map(room => ({
          id: room.id,
          name: room.name,
          players: room.players.length,
          maxPlayers: room.maxPlayers,
          status: room.status,
          isPrivate: room.isPrivate,
        })));
      
      // Send full room details to the creator
      socket.emit('room:joined', roomData);
    });
    
    socket.on('room:join', ({ roomId, password }) => {
      const room = gameRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      if (room.isPrivate && room.password !== password) {
        socket.emit('error', { message: 'Invalid password' });
        return;
      }
      
      const user = activeUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found. Please reconnect.' });
        return;
      }
      
      // Add player to room
      room.players.push({ userId: user.userId, socketId: socket.id });
      socket.join(roomId);
      
      // Notify room members
      drawingGame.to(roomId).emit('room:playerJoined', {
        userId: user.userId,
        username: user.username,
        avatar: user.avatar,
      });
      
      // Send full room details to the joining player
      socket.emit('room:joined', room);
    });
    
    // Drawing events
    socket.on('draw:start', ({ roomId, x, y, color, thickness }) => {
      socket.to(roomId).emit('draw:start', { x, y, color, thickness, userId: socket.id });
    });
    
    socket.on('draw:move', ({ roomId, x, y }) => {
      socket.to(roomId).emit('draw:move', { x, y, userId: socket.id });
    });
    
    socket.on('draw:end', ({ roomId }) => {
      socket.to(roomId).emit('draw:end', { userId: socket.id });
    });
    
    socket.on('draw:clear', ({ roomId }) => {
      socket.to(roomId).emit('draw:clear');
    });
    
    // Chat and guessing
    socket.on('chat:message', ({ roomId, message }) => {
      const room = gameRooms.get(roomId);
      const user = activeUsers.get(socket.id);
      
      if (!room || !user) return;
      
      // Check if message is a correct guess
      if (room.status === 'playing' && 
          room.currentWord && 
          message.toLowerCase() === room.currentWord.toLowerCase() &&
          socket.id !== room.currentDrawer) {
        
        // Player guessed correctly
        const timeLeft = room.timePerRound - Math.floor((Date.now() - room.startTime) / 1000);
        const pointsEarned = Math.max(10, Math.floor(timeLeft * 5));
        
        // Update score
        room.scores[user.userId] = (room.scores[user.userId] || 0) + pointsEarned;
        
        // Notify all players
        drawingGame.to(roomId).emit('game:correctGuess', {
          userId: user.userId, 
          username: user.username,
          pointsEarned,
          word: room.currentWord,
        });
        
        // Check if all players have guessed
        const drawerCount = 1;
        const playersWhoGuessedCount = Object.keys(room.scores).length;
        if (playersWhoGuessedCount >= room.players.length - drawerCount) {
          // End the round early
          drawingGame.to(roomId).emit('game:roundEnd', {
            scores: room.scores,
            word: room.currentWord,
          });
          
          // Move to next round after a short delay
          setTimeout(() => {
            startNextRound(room, drawingGame);
          }, 5000);
        }
        
        return;
      }
      
      // Regular chat message
      drawingGame.to(roomId).emit('chat:message', {
        userId: user.userId,
        username: user.username,
        message,
        timestamp: Date.now(),
      });
    });
    
    // Game flow
    socket.on('game:start', ({ roomId }) => {
      const room = gameRooms.get(roomId);
      if (!room) return;
      
      // Only the room creator can start the game
      const user = activeUsers.get(socket.id);
      if (!user || room.createdBy !== user.userId) return;
      
      // Need at least 2 players
      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }
      
      // Start the game
      room.status = 'playing';
      room.currentRound = 1;
      room.scores = {};
      
      // Notify all players
      drawingGame.to(roomId).emit('game:starting');
      
      // Start the first round after a short delay
      setTimeout(() => {
        startRound(room, drawingGame);
      }, 3000);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove from active users
      const user = activeUsers.get(socket.id);
      activeUsers.delete(socket.id);
      
      // Clean up rooms
      for (const [roomId, room] of gameRooms) {
        // Remove player from room
        room.players = room.players.filter(player => player.socketId !== socket.id);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          gameRooms.delete(roomId);
          continue;
        }
        
        // Notify room about player leaving
        if (user) {
          drawingGame.to(roomId).emit('room:playerLeft', {
            userId: user.userId,
            username: user.username,
          });
        }
        
        // If current drawer left during playing, start next round
        if (room.status === 'playing' && room.currentDrawer === socket.id) {
          drawingGame.to(roomId).emit('game:drawerLeft');
          
          // Start next round after a delay
          setTimeout(() => {
            startNextRound(room, drawingGame);
          }, 3000);
        }
      }
      
      // Update room list for all users
      drawingGame.emit('rooms:update', Array.from(gameRooms.values())
        .map(room => ({
          id: room.id,
          name: room.name,
          players: room.players.length,
          maxPlayers: room.maxPlayers,
          status: room.status,
          isPrivate: room.isPrivate,
        })));
    });
  });
  
  return new Response('Socket is running', { status: 200 });
}

// Helper function to start a round
function startRound(room, io) {
  if (!room || room.players.length < 2) return;
  
  // Pick a drawer (round robin)
  const drawerIndex = room.currentRound % room.players.length;
  const drawer = room.players[drawerIndex];
  room.currentDrawer = drawer.socketId;
  
  // Pick a random word
  const words = ['apple', 'banana', 'car', 'dog', 'elephant', 'flowers', 'guitar', 'house', 'island', 'jellyfish', 
                'kite', 'lemon', 'mountain', 'notebook', 'ocean', 'pizza', 'queen', 'robot', 'snake', 'table'];
  room.currentWord = words[Math.floor(Math.random() * words.length)];
  
  // Set round start time
  room.startTime = Date.now();
  
  // Send word to drawer only
  io.to(drawer.socketId).emit('game:yourTurn', {
    word: room.currentWord,
    timePerRound: room.timePerRound,
  });
  
  // Send round start to all players
  io.to(room.id).emit('game:roundStart', {
    round: room.currentRound,
    totalRounds: room.totalRounds,
    drawerId: drawer.userId,
    timePerRound: room.timePerRound,
    wordLength: room.currentWord.length,
  });
  
  // Set timer for round end
  setTimeout(() => {
    if (gameRooms.has(room.id) && room.currentRound === room.currentRound) {
      io.to(room.id).emit('game:roundEnd', {
        scores: room.scores,
        word: room.currentWord,
      });
      
      // Start next round after delay
      setTimeout(() => {
        startNextRound(room, io);
      }, 5000);
    }
  }, room.timePerRound * 1000);
}

// Helper function to start the next round or end the game
function startNextRound(room, io) {
  if (!room) return;
  
  room.currentRound++;
  
  // Check if game should end
  if (room.currentRound > room.totalRounds) {
    room.status = 'ended';
    
    // Determine winner
    let winner = null;
    let highestScore = -1;
    
    for (const [userId, score] of Object.entries(room.scores)) {
      if (score > highestScore) {
        highestScore = score;
        winner = userId;
      }
    }
    
    // Send game end event
    io.to(room.id).emit('game:end', {
      scores: room.scores,
      winner,
    });
    
    // Reset game after delay
    setTimeout(() => {
      if (gameRooms.has(room.id)) {
        room.status = 'waiting';
        room.currentRound = 0;
        room.currentWord = null;
        room.currentDrawer = null;
        io.to(room.id).emit('game:reset');
      }
    }, 10000);
    
    return;
  }
  
  // Start next round
  startRound(room, io);
}

// All other HTTP methods will return error
export async function POST() {
  return new Response('Method not allowed', { status: 405 });
}

export async function PUT() {
  return new Response('Method not allowed', { status: 405 });
}

export async function DELETE() {
  return new Response('Method not allowed', { status: 405 });
}

export const dynamic = 'force-dynamic'; 