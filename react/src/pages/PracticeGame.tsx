import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { CircleHelp } from "lucide-react";
import { sdk } from "@farcaster/frame-sdk";

import { HowToPlayPopup } from '../components/HowToPlayPopup';

interface Position {
  x: number;
  y: number;
}

interface Bomb {
  id: number;
  x: number;
  y: number;
  timer: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  timer: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  direction: number; // 0: up, 1: right, 2: down, 3: left
  lastMoveTime: number;
}

type CellType = 'empty' | 'wall' | 'destructible' | 'player' | 'bomb' | 'explosion' | 'enemy';

const GRID_SIZE = 13;
const BOMB_TIMER = 3000; // 3 seconds
const EXPLOSION_TIMER = 500; // 0.5 seconds
const EXPLOSION_RANGE = 2;
const ENEMY_MOVE_INTERVAL = 800; // Enemy moves every 800ms
const INITIAL_ENEMY_COUNT = 10;

const PracticeGame: React.FC = () => {
  const navigate = useNavigate();

  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [destructibleWalls, setDestructibleWalls] = useState<Set<string>>(new Set());
  const [gameGrid, setGameGrid] = useState<CellType[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(true);
  const [gameWon, setGameWon] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  
  const bombIdRef = useRef(0);
  const explosionIdRef = useRef(0);
  const enemyIdRef = useRef(0);

  // Initialize game grid
  const initializeGrid = useCallback(() => {
    const grid: CellType[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));
    const destructible = new Set<string>();

    // Create border walls
    for (let i = 0; i < GRID_SIZE; i++) {
      grid[0][i] = 'wall';
      grid[GRID_SIZE - 1][i] = 'wall';
      grid[i][0] = 'wall';
      grid[i][GRID_SIZE - 1] = 'wall';
    }

    // Create internal walls (every other cell starting from 2,2)
    for (let y = 2; y < GRID_SIZE - 1; y += 2) {
      for (let x = 2; x < GRID_SIZE - 1; x += 2) {
        grid[y][x] = 'wall';
      }
    }

    // Add some destructible walls randomly (but not near player start)
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (grid[y][x] === 'empty' && !(x === 1 && y === 1) && !(x === 2 && y === 1) && !(x === 1 && y === 2)) {
          if (Math.random() < 0.3) {
            grid[y][x] = 'destructible';
            destructible.add(`${x},${y}`);
          }
        }
      }
    }

    setGameGrid(grid);
    setDestructibleWalls(destructible);
    
    // Initialize enemies in random positions
    const initialEnemies: Enemy[] = [];
    const enemyPositions = new Set<string>();
    
    for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
      let x: number, y: number;
      let attempts = 0;
      
      do {
        x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
        y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
        attempts++;
        
        // Avoid infinite loops
        if (attempts > 100) break;
      } while (
        grid[y][x] !== 'empty' || 
        enemyPositions.has(`${x},${y}`) ||
        // Keep enemies away from player start area
        (x <= 3 && y <= 3)
      );
      
      if (attempts <= 100) {
        initialEnemies.push({
          id: enemyIdRef.current++,
          x,
          y,
          direction: Math.floor(Math.random() * 4),
          lastMoveTime: Date.now()
        });
        enemyPositions.add(`${x},${y}`);
      }
    }
    
    setEnemies(initialEnemies);
  }, []);

  // Handle player movement
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameOver || gameWon) return;
    
    setPlayerPos(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      
      // Check boundaries and collisions
      if (newX < 1 || newX >= GRID_SIZE - 1 || newY < 1 || newY >= GRID_SIZE - 1) {
        return prev;
      }
      
      if (gameGrid[newY][newX] === 'wall' || gameGrid[newY][newX] === 'destructible') {
        return prev;
      }
      
      // Check if moving into a bomb
      const bombAtPos = bombs.find(bomb => bomb.x === newX && bomb.y === newY);
      if (bombAtPos) {
        return prev;
      }
      
      // Check if moving into an enemy
      const enemyAtPos = enemies.find(enemy => enemy.x === newX && enemy.y === newY);
      if (enemyAtPos) {
        setGameOver(true);
        return prev;
      }
      
      return { x: newX, y: newY };
    });
  }, [gameGrid, bombs, enemies, gameOver, gameWon]);

  // Place bomb
  const placeBomb = useCallback(() => {
    if (gameOver) return;
    
    // Limit to only one bomb at a time
    if (bombs.length > 0) return;
    
    const newBomb: Bomb = {
      id: bombIdRef.current++,
      x: playerPos.x,
      y: playerPos.y,
      timer: BOMB_TIMER
    };
    
    setBombs(prev => [...prev, newBomb]);
  }, [playerPos, bombs, gameOver]);

  // Create explosion
  const createExplosion = useCallback((bombX: number, bombY: number) => {
    const newExplosions: Explosion[] = [];
    const directions = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    
    directions.forEach(([dx, dy]) => {
      for (let i = 0; i <= EXPLOSION_RANGE; i++) {
        const x = bombX + dx * i;
        const y = bombY + dy * i;
        
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) break;
        if (gameGrid[y][x] === 'wall') break;
        
        newExplosions.push({
          id: explosionIdRef.current++,
          x,
          y,
          timer: EXPLOSION_TIMER
        });
        
        // Destroy destructible walls
        if (gameGrid[y][x] === 'destructible') {
          setDestructibleWalls(prev => {
            const newSet = new Set(prev);
            newSet.delete(`${x},${y}`);
            return newSet;
          });
          setScore(prev => prev + 10);
          break;
        }
      }
    });
    
    setExplosions(prev => [...prev, ...newExplosions]);
    
    // Check if enemies are hit by explosion
    setEnemies(prev => prev.filter(enemy => {
      const enemyHit = newExplosions.some(explosion => 
        explosion.x === enemy.x && explosion.y === enemy.y
      );
      if (enemyHit) {
        setScore(prevScore => prevScore + 50);
        return false;
      }
      return true;
    }));
  }, [gameGrid]);

  // Move enemies with simple AI
  const moveEnemies = useCallback(() => {
    if (gameOver || gameWon) return;
    
    const currentTime = Date.now();
    
    setEnemies(prev => prev.map(enemy => {
      if (currentTime - enemy.lastMoveTime < ENEMY_MOVE_INTERVAL) {
        return enemy;
      }
      
      const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }  // left
      ];
      
      // Try to move in current direction first
      let newX = enemy.x + directions[enemy.direction].dx;
      let newY = enemy.y + directions[enemy.direction].dy;
      let newDirection = enemy.direction;
      
      // Check if current direction is blocked
      const canMoveInCurrentDirection = 
        newX >= 1 && newX < GRID_SIZE - 1 &&
        newY >= 1 && newY < GRID_SIZE - 1 &&
        gameGrid[newY][newX] === 'empty' &&
        !bombs.some(bomb => bomb.x === newX && bomb.y === newY) &&
        !prev.some(otherEnemy => otherEnemy.id !== enemy.id && otherEnemy.x === newX && otherEnemy.y === newY);
      
      // If blocked, try other directions
      if (!canMoveInCurrentDirection) {
        const availableDirections = directions
          .map((dir, index) => ({
            index,
            x: enemy.x + dir.dx,
            y: enemy.y + dir.dy
          }))
          .filter(pos => 
            pos.x >= 1 && pos.x < GRID_SIZE - 1 &&
            pos.y >= 1 && pos.y < GRID_SIZE - 1 &&
            gameGrid[pos.y][pos.x] === 'empty' &&
            !bombs.some(bomb => bomb.x === pos.x && bomb.y === pos.y) &&
            !prev.some(otherEnemy => otherEnemy.id !== enemy.id && otherEnemy.x === pos.x && otherEnemy.y === pos.y)
          );
        
        if (availableDirections.length > 0) {
          const randomDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
          newX = randomDirection.x;
          newY = randomDirection.y;
          newDirection = randomDirection.index;
        } else {
          // No valid moves, stay in place but change direction
          newX = enemy.x;
          newY = enemy.y;
          newDirection = Math.floor(Math.random() * 4);
        }
      }
      
      return {
        ...enemy,
        x: newX,
        y: newY,
        direction: newDirection,
        lastMoveTime: currentTime
      };
    }));
  }, [gameGrid, bombs, gameOver, gameWon]);
  // Check if player is hit by explosion or touches enemy
  const checkPlayerHit = useCallback(() => {
    // Check explosion collision
    const playerHitByExplosion = explosions.some(explosion => 
      explosion.x === playerPos.x && explosion.y === playerPos.y
    );
    
    // Check enemy collision
    const playerHitByEnemy = enemies.some(enemy =>
      enemy.x === playerPos.x && enemy.y === playerPos.y
    );
    
    if (playerHitByExplosion || playerHitByEnemy) {
      setGameOver(true);
    }
  }, [explosions, enemies, playerPos]);

  // Check win condition
  const checkWinCondition = useCallback(() => {
    if (enemies.length === 0 && !gameOver) {
      setGameWon(true);
    }
  }, [enemies, gameOver]);
  // Update game grid with current state
  useEffect(() => {
    if (gameGrid.length === 0) return;
    
    const newGrid = gameGrid.map(row => row.slice());
    
    // Reset destructible walls
    destructibleWalls.forEach(wall => {
      const [x, y] = wall.split(',').map(Number);
      newGrid[y][x] = 'destructible';
    });
    
    // Remove destroyed destructible walls
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (newGrid[y][x] === 'destructible' && !destructibleWalls.has(`${x},${y}`)) {
          newGrid[y][x] = 'empty';
        }
      }
    }
    
    setGameGrid(newGrid);
  }, [destructibleWalls]);

  // Game loop for timers and enemy movement
  useEffect(() => {
    const interval = setInterval(() => {
      // Update bomb timers
      setBombs(prev => {
        const updatedBombs = prev.map(bomb => ({ ...bomb, timer: bomb.timer - 100 }));
        const explodingBombs = updatedBombs.filter(bomb => bomb.timer <= 0);
        
        explodingBombs.forEach(bomb => {
          createExplosion(bomb.x, bomb.y);
        });
        
        return updatedBombs.filter(bomb => bomb.timer > 0);
      });
      
      // Update explosion timers
      setExplosions(prev => 
        prev.map(explosion => ({ ...explosion, timer: explosion.timer - 100 }))
            .filter(explosion => explosion.timer > 0)
      );
      
      // Move enemies
      moveEnemies();
    }, 100);
    
    return () => clearInterval(interval);
  }, [createExplosion, moveEnemies]);

  // Check for player collision with explosions and enemies
  useEffect(() => {
    checkPlayerHit();
  }, [checkPlayerHit]);
  
  // Check win condition
  useEffect(() => {
    checkWinCondition();
  }, [checkWinCondition]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          movePlayer(1, 0);
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
  }, [movePlayer, placeBomb]);

  // Initialize game on mount
  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const handleButtonPress = async (x: number, y: number) => {
    // @ts-ignore
    await sdk.haptics.impactOccurred('light');
    movePlayer(x, y);
  }

  const handleFireworkPress = async () => {
    // @ts-ignore
    await sdk.haptics.impactOccurred('heavy');
    placeBomb();
  }

  // Reset game
  const resetGame = () => {
    setPlayerPos({ x: 1, y: 1 });
    setBombs([]);
    setExplosions([]);
    setEnemies([]);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    bombIdRef.current = 0;
    explosionIdRef.current = 0;
    enemyIdRef.current = 0;
    initializeGrid();
  };

  const handleComposeCast = async () => {
    try {
      const result = await sdk.actions.composeCast({
        text: 'Let play FireSpark Battle 🎉',
        embeds: ["https://firesparkbattle.netlify.app/"],
        // Optional: parent cast reference
        // parent: { type: 'cast', hash: '0xabc123...' },
        // Optional: close the app after composing
        // close: true,
      });
  
      if (result) {
        console.log('Cast composed:', result.cast);
      } else {
        console.log('Cast composition was closed or canceled.');
      }
    } catch (error) {
      console.error('Error composing cast:', error);
    }
  };

  // Render cell content
  const renderCell = (x: number, y: number) => {
    const isPlayer = playerPos.x === x && playerPos.y === y;
    const bomb = bombs.find(b => b.x === x && b.y === y);
    const explosion = explosions.find(e => e.x === x && e.y === y);
    const enemy = enemies.find(e => e.x === x && e.y === y);
    const cellType = gameGrid[y]?.[x];
    
    let cellClass = "w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-sm font-bold ";
    let content = "";
    
    if (explosion) {
      cellClass += "bg-orange-400 animate-pulse";
      content = "💥";
    } else if (bomb) {
      cellClass += "bg-yellow-500 animate-bounce";
      content = "🧨";
    } else if (isPlayer) {
      cellClass += "bg-blue-400";
      content = gameOver && isStarted ?  "💀" : "🤖";
    } else if (enemy) {
      cellClass += "bg-purple-400 animate-pulse";
      content = "👾";
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

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <div className="flex mb-2">
        <h1 className="text-3xl font-bold text-yellow-400 mr-3">Fire Spark Battle</h1>
        <button 
          onClick={() => setIsOpen(true)}
          className="px-1 bg-yellow-600 hover:bg-yellow-700 rounded"
        >
          <CircleHelp className="h-7 w-7" />
        </button>
      </div>
     
      <div className="mb-2 flex gap-4 items-center">
        <span className="text-lg">Score: {score}</span>
        <span className="text-lg">Enemies: {enemies.length}</span>
      </div>

      {gameOver && !gameWon && (
        <button
          onClick={handleComposeCast}
          className="py-2 px-4 mb-2 bg-green-600 text-white font-medium rounded hover:bg-green-700"
        >
          Share on Farcaster 🚀
        </button>
      )}
      
      <div className="grid grid-cols-13 gap-1 mb-4 border-4 border-gray-600 bg-gray-800">
        {Array.from({ length: GRID_SIZE }, (_, y) =>
          Array.from({ length: GRID_SIZE }, (_, x) => renderCell(x, y))
        )}
      </div>

      {/* Mobile/Touch Controls */}
      {!gameOver && !gameWon && <div className="flex">
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div></div>
            <button 
              onClick={() => handleButtonPress(0, -1)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg flex items-center justify-center text-xl font-bold touch-manipulation select-none"
              disabled={gameOver}
            >
              ↑
            </button>
            <div></div>
            
            <button 
              onClick={() => handleButtonPress(-1, 0)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg flex items-center justify-center text-xl font-bold touch-manipulation select-none"
              disabled={gameOver}
            >
              ←
            </button>
            <div></div>
            <button 
              onClick={() => handleButtonPress(1, 0)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg flex items-center justify-center text-xl font-bold touch-manipulation select-none"
              disabled={gameOver}
            >
              →
            </button>
            
            <div></div>
            <button 
              onClick={() => handleButtonPress(0, 1)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg flex items-center justify-center text-xl font-bold touch-manipulation select-none"
              disabled={gameOver}
            >
              ↓
            </button>
            <div></div>
          </div>
        </div>

        <div className="mt-[45px] ml-[50px]">
          <button 
            onClick={handleFireworkPress}
            className="w-20 h-20 bg-yellow-400 hover:bg-yellow-700 active:bg-yellow-600 rounded-lg flex items-center justify-center text-xl touch-manipulation select-none"
            disabled={gameOver}
          >
            🧨
          </button>
        </div>
      </div>}

      {gameWon && (
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">You Win! 🎉</span>
          <button 
            onClick={resetGame}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Play Again
          </button>
        </div>
      )}
      {!isStarted ? (
        <button 
          onClick={() => {
            setIsStarted(true);
            resetGame();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Start
        </button>
      ) : gameOver && !gameWon && (
        <div className="flex items-center gap-2">
          <span className="text-red-400 font-bold">Game Over!</span>
          <button 
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Restart
          </button>
          <button 
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
          >
            Go Back
          </button>
        </div>
      )}
      
      <HowToPlayPopup isOpen={isOpen} onClose={() => setIsOpen(false)} title="How to Play:">
        <div className="text-sm space-y-1">
          <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center">
            🎮 Controls
          </h3>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-3">
              <span className="bg-gray-200 px-2 py-1 rounded text-sm">↑↓←→</span>
              <span>or</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-sm">WASD</span>
              <span>Move Player</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-gray-200 px-2 py-1 rounded text-sm">Firework Button</span>
              <span>or</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-sm">Space</span>
              <span>or</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-sm">Enter</span>
              <span>Drop Fireworks</span>
            </div>
          </div>
          <p>Drop Firework: Space or Enter</p>
          <p>Destroy boxes (📦) to earn points!</p>
          <p>Avoid explosions (💥) or you'll lose!</p>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-red-400 hover:bg-red-600 rounded"
          >
            Close
          </button>
        </div>
      </HowToPlayPopup>
    </div>
  );
};

export default PracticeGame;