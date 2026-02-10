require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.WEBSITE_URL,
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game constants
const GRID_SIZE = 13;
const BOMB_TIMER = 3000;
const EXPLOSION_TIMER = 500;
const INITIAL_EXPLOSION_RANGE = 1;
const INITIAL_MAX_BOMBS = 1;
const PLAYER_COLORS = ['🔴', '🔵', '🟢', '🟡'];
const SPAWN_POSITIONS = [
  { x: 1, y: 1 },
  { x: 11, y: 11 },
  { x: 1, y: 11 },
  { x: 11, y: 1 }
];

// Game rooms storage
const rooms = new Map();

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Initialize game grid
function initializeGrid() {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));
  const destructibleWalls = [];

  // Create border walls
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[0][i] = 'wall';
    grid[GRID_SIZE - 1][i] = 'wall';
    grid[i][0] = 'wall';
    grid[i][GRID_SIZE - 1] = 'wall';
  }

  // Create internal walls
  for (let y = 2; y < GRID_SIZE - 1; y += 2) {
    for (let x = 2; x < GRID_SIZE - 1; x += 2) {
      grid[y][x] = 'wall';
    }
  }

  // Add destructible walls (avoid spawn areas)
  const spawnAreas = new Set([
    '1,1', '2,1', '1,2',  // Top-left spawn
    '11,11', '10,11', '11,10',  // Bottom-right spawn
    '1,11', '2,11', '1,10',  // Bottom-left spawn
    '11,1', '10,1', '11,2'   // Top-right spawn
  ]);

  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      if (grid[y][x] === 'empty' && !spawnAreas.has(`${x},${y}`)) {
        if (Math.random() < 0.3) {
          grid[y][x] = 'destructible';
          destructibleWalls.push(`${x},${y}`);
        }
      }
    }
  }

  return { grid, destructibleWalls };
}

// Helper function to build gameState payload (ensures consistency)
function buildGameStatePayload(room) {
  return {
    players: room.gameState.players,
    bombs: room.gameState.bombs,
    explosions: room.gameState.explosions,
    powerUps: room.gameState.powerUps,
    destructibleWalls: room.gameState.destructibleWalls,
    grid: room.gameState.grid,
    gameStarted: room.gameState.gameStarted,
    gameOver: room.gameState.gameOver,
    winner: room.gameState.winner
  };
}

// Create explosion
function createExplosion(room, bombX, bombY, bombPlayerId, explosionRange) {
  const explosions = [];
  const directions = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  
  directions.forEach(([dx, dy]) => {
    for (let i = 0; i <= explosionRange; i++) {
      const x = bombX + dx * i;
      const y = bombY + dy * i;
      
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) break;
      if (room.gameState.grid[y][x] === 'wall') break;
      
      explosions.push({
        id: `exp_${Date.now()}_${Math.random()}`,
        x,
        y,
        timer: EXPLOSION_TIMER
      });
      
      // Destroy destructible walls and potentially drop power-ups
      if (room.gameState.grid[y][x] === 'destructible') {
        room.gameState.grid[y][x] = 'empty';
        const wallIndex = room.gameState.destructibleWalls.indexOf(`${x},${y}`);
        if (wallIndex > -1) {
          room.gameState.destructibleWalls.splice(wallIndex, 1);
        }
        
        // 30% chance to drop a power-up
        if (Math.random() < 0.3) {
          // 50/50 chance between explosion_range and max_bombs
          const powerUpType = Math.random() < 0.5 ? 'explosion_range' : 'max_bombs';
          const powerUp = {
            id: `powerup_${Date.now()}_${Math.random()}`,
            x,
            y,
            type: powerUpType
          };
          room.gameState.powerUps.push(powerUp);
        }
        
        break;
      }
    }
  });
  
  room.gameState.explosions.push(...explosions);
  
  // Decrease bomb count for the player who placed the bomb
  if (bombPlayerId && room.gameState.players[bombPlayerId]) {
    room.gameState.players[bombPlayerId].bombCount = Math.max(0, room.gameState.players[bombPlayerId].bombCount - 1);
  }
  
  // Check for player hits
  explosions.forEach(explosion => {
    Object.values(room.gameState.players).forEach(player => {
      if (player.alive && player.x === explosion.x && player.y === explosion.y) {
        player.alive = false;
        console.log(`Player ${player.name} was eliminated!`);
      }
    });
  });
  
  // Check for game over
  const alivePlayers = Object.values(room.gameState.players).filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    room.gameState.gameOver = true;
    if (alivePlayers.length === 1) {
      room.gameState.winner = alivePlayers[0].id;
    }
  }
}

// Game update loop for each room  
function startGameLoop(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.gameLoop) return;
  
  room.gameLoop = setInterval(() => {
    if (!room.gameState.gameStarted || room.gameState.gameOver) {
      clearInterval(room.gameLoop);
      room.gameLoop = null;
      return;
    }
    
    // Update bomb timers
    room.gameState.bombs = room.gameState.bombs.filter(bomb => {
      bomb.timer -= 100;
      if (bomb.timer <= 0) {
        createExplosion(room, bomb.x, bomb.y, bomb.playerId, bomb.explosionRange);
        return false;
      }
      return true;
    });
    
    // Update explosion timers
    room.gameState.explosions = room.gameState.explosions.filter(explosion => {
      explosion.timer -= 100;
      return explosion.timer > 0;
    });
    
    // Broadcast updated game state
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
  }, 100);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('createRoom', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const { grid, destructibleWalls } = initializeGrid();
    
    const room = {
      code: roomCode,
      players: new Map(),
      gameState: {
        players: {},
        bombs: [],
        explosions: [],
        powerUps: [],
        grid,
        destructibleWalls,
        gameStarted: false,
        gameOver: false,
        winner: null
      },
      gameLoop: null
    };
    
    rooms.set(roomCode, room);
    
    // Add player to room
    const player = {
      id: socket.id,
      name: playerName,
      x: SPAWN_POSITIONS[0].x,
      y: SPAWN_POSITIONS[0].y,
      alive: true,
      color: PLAYER_COLORS[0],
      score: 0,
      bombCount: 0,
      explosionRange: INITIAL_EXPLOSION_RANGE,
      maxBombs: INITIAL_MAX_BOMBS
    };
    
    room.players.set(socket.id, player);
    room.gameState.players[socket.id] = player;
    
    socket.join(roomCode);
    socket.roomCode = roomCode;
    
    socket.emit('roomCreated', { roomCode });
    socket.emit('gameGrid', grid);
    socket.emit('gameState', buildGameStatePayload(room));
  });
  
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('roomJoined', { roomCode, success: false, message: 'Room not found' });
      return;
    }
    
    if (room.players.size >= 4) {
      socket.emit('roomJoined', { roomCode, success: false, message: 'Room is full' });
      return;
    }
    
    if (room.gameState.gameStarted) {
      socket.emit('roomJoined', { roomCode, success: false, message: 'Game already started' });
      return;
    }
    
    // Add player to room
    const playerIndex = room.players.size;
    const player = {
      id: socket.id,
      name: playerName,
      x: SPAWN_POSITIONS[playerIndex].x,
      y: SPAWN_POSITIONS[playerIndex].y,
      alive: true,
      color: PLAYER_COLORS[playerIndex],
      score: 0,
      bombCount: 0,
      explosionRange: INITIAL_EXPLOSION_RANGE,
      maxBombs: INITIAL_MAX_BOMBS
    };
    
    room.players.set(socket.id, player);
    room.gameState.players[socket.id] = player;
    
    socket.join(roomCode);
    socket.roomCode = roomCode;
    
    socket.emit('roomJoined', { roomCode, success: true });
    socket.emit('gameGrid', room.gameState.grid);
    
    // Notify all players in room
    io.to(roomCode).emit('playerJoined', { 
      playerId: socket.id, 
      players: room.gameState.players 
    });
    
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
  });
  
  socket.on('startGame', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || room.players.size < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }
    
    room.gameState.gameStarted = true;
    room.gameState.gameOver = false;
    room.gameState.winner = null;
    
    // Reset all players
    room.players.forEach((player, playerId) => {
      player.alive = true;
      player.score = 0;
      player.bombCount = 0;
      player.explosionRange = INITIAL_EXPLOSION_RANGE;
      player.maxBombs = INITIAL_MAX_BOMBS;
    });
    
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
    
    startGameLoop(roomCode);
  });
  
  socket.on('movePlayer', ({ direction }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState.gameStarted || room.gameState.gameOver) return;
    
    const player = room.gameState.players[socket.id];
    if (!player || !player.alive) return;
    
    let dx = 0, dy = 0;
    switch (direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // Check boundaries and collisions
    if (newX < 1 || newX >= GRID_SIZE - 1 || newY < 1 || newY >= GRID_SIZE - 1) return;
    if (room.gameState.grid[newY][newX] === 'wall' || room.gameState.grid[newY][newX] === 'destructible') return;
    
    // Check for bomb collision
    const bombAtPos = room.gameState.bombs.find(bomb => bomb.x === newX && bomb.y === newY);
    if (bombAtPos) return;
    
    // Check for other players
    const otherPlayerAtPos = Object.values(room.gameState.players).find(
      p => p.id !== socket.id && p.x === newX && p.y === newY && p.alive
    );
    if (otherPlayerAtPos) return;
    
    // Check for power-up collection
    const powerUpAtPos = room.gameState.powerUps.find(p => p.x === newX && p.y === newY);
    if (powerUpAtPos) {
      if (powerUpAtPos.type === 'explosion_range') {
        player.explosionRange += 1;
      } else if (powerUpAtPos.type === 'max_bombs') {
        player.maxBombs += 1;
      }
      // Remove collected power-up
      room.gameState.powerUps = room.gameState.powerUps.filter(p => p.id !== powerUpAtPos.id);
    }
    
    player.x = newX;
    player.y = newY;
    
    // Broadcast position update
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
  });
  
  socket.on('placeBomb', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState.gameStarted || room.gameState.gameOver) return;
    
    const player = room.gameState.players[socket.id];
    if (!player || !player.alive) return;
    
    // Check if player has reached their max bomb limit
    if (player.bombCount >= player.maxBombs) {
      return;
    }
    
    // Check if bomb already exists at position
    const existingBomb = room.gameState.bombs.find(bomb => bomb.x === player.x && bomb.y === player.y);
    if (existingBomb) return;
    
    const bomb = {
      id: `bomb_${socket.id}_${Date.now()}`,
      x: player.x,
      y: player.y,
      timer: BOMB_TIMER,
      playerId: socket.id,
      explosionRange: player.explosionRange
    };
    
    room.gameState.bombs.push(bomb);
    player.bombCount++;
    
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
  });
  
  socket.on('resetGame', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) return;
    
    // Reset game state
    const { grid, destructibleWalls } = initializeGrid();
    room.gameState = {
      players: {},
      bombs: [],
      explosions: [],
      powerUps: [],
      grid,
      destructibleWalls,
      gameStarted: false,
      gameOver: false,
      winner: null
    };
    
    // Reset players
    let playerIndex = 0;
    room.players.forEach((player, playerId) => {
      player.x = SPAWN_POSITIONS[playerIndex].x;
      player.y = SPAWN_POSITIONS[playerIndex].y;
      player.alive = true;
      player.score = 0;
      player.bombCount = 0;
      player.explosionRange = INITIAL_EXPLOSION_RANGE;
      player.maxBombs = INITIAL_MAX_BOMBS;
      room.gameState.players[playerId] = player;
      playerIndex++;
    });
    
    if (room.gameLoop) {
      clearInterval(room.gameLoop);
      room.gameLoop = null;
    }
    
    io.to(roomCode).emit('gameGrid', grid);
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
  });
  
  socket.on('leaveRoom', () => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      handlePlayerLeave(socket, roomCode);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomCode = socket.roomCode;
    if (roomCode) {
      handlePlayerLeave(socket, roomCode);
    }
  });
  
  function handlePlayerLeave(socket, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    // Remove player from room
    room.players.delete(socket.id);
    delete room.gameState.players[socket.id];
    
    socket.leave(roomCode);
    delete socket.roomCode;
    
    // If room is empty, delete it
    if (room.players.size === 0) {
      if (room.gameLoop) {
        clearInterval(room.gameLoop);
      }
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted`);
      return;
    }
    
    // Notify remaining players
    io.to(roomCode).emit('playerLeft', { 
      playerId: socket.id, 
      players: room.gameState.players 
    });
    
    // Check if game should end
    if (room.gameState.gameStarted) {
      const alivePlayers = Object.values(room.gameState.players).filter(p => p.alive);
      if (alivePlayers.length <= 1) {
        room.gameState.gameOver = true;
        if (alivePlayers.length === 1) {
          room.gameState.winner = alivePlayers[0].id;
        }
      }
    }
    
    io.to(roomCode).emit('gameState', buildGameStatePayload(room));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
