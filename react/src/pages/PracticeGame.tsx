import React, { useState, useEffect, useCallback, useRef } from 'react';

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

type CellType = 'empty' | 'wall' | 'destructible' | 'player' | 'bomb' | 'explosion';

const GRID_SIZE = 13;
const BOMB_TIMER = 3000; // 3 seconds
const EXPLOSION_TIMER = 500; // 0.5 seconds
const EXPLOSION_RANGE = 2;

const PracticeGame: React.FC = () => {
  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [destructibleWalls, setDestructibleWalls] = useState<Set<string>>(new Set());
  const [gameGrid, setGameGrid] = useState<CellType[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const bombIdRef = useRef(0);
  const explosionIdRef = useRef(0);

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
  }, []);

  // Handle player movement
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameOver) return;
    
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
      
      return { x: newX, y: newY };
    });
  }, [gameGrid, bombs, gameOver]);

  // Place bomb
  const placeBomb = useCallback(() => {
    if (gameOver) return;
    
    const existingBomb = bombs.find(bomb => bomb.x === playerPos.x && bomb.y === playerPos.y);
    if (existingBomb) return;
    
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
  }, [gameGrid]);

  // Check if player is hit by explosion
  const checkPlayerHit = useCallback(() => {
    const playerHit = explosions.some(explosion => 
      explosion.x === playerPos.x && explosion.y === playerPos.y
    );
    
    if (playerHit) {
      setGameOver(true);
    }
  }, [explosions, playerPos]);

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

  // Game loop for timers
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
    }, 100);
    
    return () => clearInterval(interval);
  }, [createExplosion]);

  // Check for player collision with explosions
  useEffect(() => {
    checkPlayerHit();
  }, [checkPlayerHit]);

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

  // Reset game
  const resetGame = () => {
    setPlayerPos({ x: 1, y: 1 });
    setBombs([]);
    setExplosions([]);
    setScore(0);
    setGameOver(false);
    initializeGrid();
  };

  // Render cell content
  const renderCell = (x: number, y: number) => {
    const isPlayer = playerPos.x === x && playerPos.y === y;
    const bomb = bombs.find(b => b.x === x && b.y === y);
    const explosion = explosions.find(e => e.x === x && e.y === y);
    const cellType = gameGrid[y]?.[x];
    
    let cellClass = "w-8 h-8 flex items-center justify-center text-sm font-bold ";
    let content = "";
    
    if (explosion) {
      cellClass += "bg-orange-400 animate-pulse";
      content = "💥";
    } else if (bomb) {
      cellClass += "bg-red-500 animate-bounce";
      content = "💣";
    } else if (isPlayer) {
      cellClass += "bg-blue-400";
      content = "🤖";
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
      <h1 className="text-3xl font-bold mb-4 text-yellow-400">Fire Spark Battle</h1>
      
      <div className="mb-4 flex gap-4 items-center">
        <span className="text-lg">Score: {score}</span>
        {gameOver && (
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-bold">Game Over!</span>
            <button 
              onClick={resetGame}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Restart
            </button>
          </div>
        )}
      </div>
      
      <div 
        className="gap-1 mb-4 border-4 border-gray-600 p-2 bg-gray-800 inline-block"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
        }}
      >
        {Array.from({ length: GRID_SIZE }, (_, y) =>
          Array.from({ length: GRID_SIZE }, (_, x) => renderCell(x, y))
        )}
      </div>
      
      <div className="text-center max-w-md">
        <h3 className="text-lg font-bold mb-2">Controls:</h3>
        <div className="text-sm space-y-1">
          <p>Move: Arrow Keys or WASD</p>
          <p>Drop Bomb: Space or Enter</p>
          <p>Destroy boxes (📦) to earn points!</p>
          <p>Avoid explosions (💥) or you'll lose!</p>
        </div>
      </div>
    </div>
  );
};

export default PracticeGame;
