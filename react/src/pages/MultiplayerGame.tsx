import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  alive: boolean;
  color: string;
  score: number;
}

interface Bomb {
  id: string;
  x: number;
  y: number;
  timer: number;
  playerId: string;
}

interface Explosion {
  id: string;
  x: number;
  y: number;
  timer: number;
}

interface GameState {
  players: Record<string, Player>;
  bombs: Bomb[];
  explosions: Explosion[];
  destructibleWalls: string[];
  grid?: CellType[][];
  gameStarted: boolean;
  gameOver: boolean;
  winner?: string;
}

type CellType = 'empty' | 'wall' | 'destructible';

const GRID_SIZE = 13;

const MultiplayerGame: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    players: {},
    bombs: [],
    explosions: [],
    destructibleWalls: [],
    gameStarted: false,
    gameOver: false
  });
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [gameGrid, setGameGrid] = useState<CellType[][]>([]);
  const [showNameInput, setShowNameInput] = useState<boolean>(true);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      setPlayerId(newSocket.id || '');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
      // FIX: Update gameGrid when grid is included in gameState
      if (state.grid) {
        setGameGrid(state.grid);
      }
    });

    newSocket.on('playerJoined', (data: { playerId: string, players: Record<string, Player> }) => {
      setGameState(prev => ({ ...prev, players: data.players }));
    });

    newSocket.on('playerLeft', (data: { playerId: string, players: Record<string, Player> }) => {
      setGameState(prev => ({ ...prev, players: data.players }));
    });

    newSocket.on('gameGrid', (grid: CellType[][]) => {
      setGameGrid(grid);
    });

    newSocket.on('roomJoined', (data: { roomCode: string, success: boolean, message?: string }) => {
      if (data.success) {
        setRoomCode(data.roomCode);
      } else {
        alert(data.message || 'Failed to join room');
      }
    });

    newSocket.on('roomCreated', (data: { roomCode: string }) => {
      setRoomCode(data.roomCode);
    });

    newSocket.on('error', (message: string) => {
      alert(message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle player movement
  const movePlayer = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!socket || !gameState.gameStarted || gameState.gameOver) return;
    
    const player = gameState.players[playerId];
    if (!player || !player.alive) return;

    socket.emit('movePlayer', { direction });
  }, [socket, gameState, playerId]);

  // Place bomb
  const placeBomb = useCallback(() => {
    if (!socket || !gameState.gameStarted || gameState.gameOver) return;
    
    const player = gameState.players[playerId];
    if (!player || !player.alive) return;

    socket.emit('placeBomb');
  }, [socket, gameState, playerId]);

  // Join room
  const joinRoom = (code?: string) => {
    if (!socket || !playerName.trim()) return;
    
    if (code) {
      socket.emit('joinRoom', { roomCode: code, playerName: playerName.trim() });
    } else {
      socket.emit('createRoom', { playerName: playerName.trim() });
    }
    setShowNameInput(false);
  };

  // Start game
  const startGame = () => {
    if (!socket) return;
    socket.emit('startGame');
  };

  // Reset game
  const resetGame = () => {
    if (!socket) return;
    socket.emit('resetGame');
  };

  // Leave room
  const leaveRoom = () => {
    if (!socket) return;
    socket.emit('leaveRoom');
    setRoomCode('');
    setShowNameInput(true);
    setGameState({
      players: {},
      bombs: [],
      explosions: [],
      destructibleWalls: [],
      gameStarted: false,
      gameOver: false
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showNameInput || !gameState.gameStarted) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          movePlayer('up');
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          movePlayer('down');
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          movePlayer('right');
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          placeBomb();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer, placeBomb, showNameInput, gameState.gameStarted]);

  // Render cell content
  const renderCell = (x: number, y: number) => {
    const playersAtPos = Object.values(gameState.players).filter(p => p.x === x && p.y === y && p.alive);
    const bomb = gameState.bombs.find(b => b.x === x && b.y === y);
    const explosion = gameState.explosions.find(e => e.x === x && e.y === y);
    const cellType = gameGrid[y]?.[x];
    
    let cellClass = "w-8 h-8 flex items-center justify-center text-sm font-bold ";
    let content = "";
    
    if (explosion) {
      cellClass += "bg-orange-400 animate-pulse";
      content = "💥";
    } else if (bomb) {
      cellClass += "bg-yellow-500 animate-bounce";
      content = "🧨";
    } else if (playersAtPos.length > 0) {
      const player = playersAtPos[0];
      cellClass += player.id === playerId ? "bg-blue-400" : "bg-purple-400";
      content = player.color;
    } else {
      switch (cellType) {
        case 'wall':
          cellClass += "bg-gray-800";
          break;
        case 'destructible':
          cellClass += "bg-yellow-600";
          content = "📦";
          break;
        default:
          cellClass += "bg-green-100";
      }
    }
    
    return (
      <div key={`${x}-${y}`} className={cellClass}>
        {content}
      </div>
    );
  };

  // Name input screen
  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400">💣 Multiplayer Fire Spark</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => joinRoom()}
                disabled={!playerName.trim() || !connected}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-medium"
              >
                Create New Room
              </button>
              
              <div className="text-center text-gray-400">or</div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Room Code"
                  maxLength={6}
                />
                <button
                  onClick={() => joinRoom(roomCode)}
                  disabled={!playerName.trim() || !roomCode.trim() || !connected}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
                >
                  Join
                </button>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-400">
              Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-4 text-yellow-400">💣 Multiplayer Fire Spark Battle</h1>
      
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-center">
        <span className="text-lg">Room: {roomCode}</span>
        <button
          onClick={leaveRoom}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          Leave Room
        </button>
        
        {gameState.gameOver && gameState.winner && (
          <span className="text-green-400 font-bold">
            Winner: {gameState.players[gameState.winner]?.name || 'Unknown'}
          </span>
        )}
      </div>
      
      {/* Player List */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        {Object.values(gameState.players).map(player => (
          <div
            key={player.id}
            className={`px-3 py-1 rounded text-sm ${
              player.alive ? 'bg-blue-600' : 'bg-gray-600'
            } ${player.id === playerId ? 'ring-2 ring-yellow-400' : ''}`}
          >
            {player.color} {player.name} ({player.score})
            {!player.alive && ' 💀'}
          </div>
        ))}
      </div>
      
      {/* Game Controls */}
      <div className="mb-4 flex gap-2">
        {!gameState.gameStarted && Object.keys(gameState.players).length >= 2 && (
          <button
            onClick={startGame}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Start Game
          </button>
        )}
        
        {gameState.gameOver && (
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            New Game
          </button>
        )}
      </div>
      
      {/* Game Grid */}
      {gameGrid.length > 0 && (
        <div className="grid grid-cols-13 gap-1 mb-4 border-4 border-gray-600 p-2 bg-gray-800">
          {Array.from({ length: GRID_SIZE }, (_, y) =>
            Array.from({ length: GRID_SIZE }, (_, x) => renderCell(x, y))
          )}
        </div>
      )}
      
      {/* Instructions */}
      <div className="text-center max-w-md">
        <h3 className="text-lg font-bold mb-2">Controls:</h3>
        <div className="text-sm space-y-1">
          <p>Move: Arrow Keys or WASD</p>
          <p>Drop Bomb: Space or Enter</p>
          <p>Destroy boxes (📦) to earn points!</p>
          <p>Eliminate other players to win!</p>
        </div>
        
        {!gameState.gameStarted && Object.keys(gameState.players).length < 2 && (
          <div className="mt-4 p-3 bg-yellow-800 rounded text-yellow-200">
            Waiting for more players... (Need at least 2 players)
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerGame;
