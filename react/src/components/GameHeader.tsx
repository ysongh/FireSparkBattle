import { CircleHelp } from "lucide-react";

interface GameHeaderProps {
  score: number;
  numberOfEnemies: number;
  setIsOpen: Function;
}

function GameHeader({ score, numberOfEnemies, setIsOpen } : GameHeaderProps) {
  return (
    <>
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
        <span className="text-lg">Enemies: {numberOfEnemies}</span>
      </div>
   </>
  )
}

export default GameHeader;
