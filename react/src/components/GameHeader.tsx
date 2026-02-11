import { sdk } from "@farcaster/frame-sdk";
import { CircleHelp } from "lucide-react";

interface GameHeaderProps {
  score: number;
  numberOfEnemies: number;
  setIsOpen: Function;
  gameOver: boolean;
  gameWon: boolean;
}

function GameHeader({ score, numberOfEnemies, setIsOpen, gameOver, gameWon } : GameHeaderProps) {
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

      {gameOver && !gameWon && (
        <button
          onClick={handleComposeCast}
          className="py-2 px-4 mb-2 bg-green-600 text-white font-medium rounded hover:bg-green-700"
        >
          Share on Farcaster 🚀
        </button>
      )}
     
      <div className="mb-2 flex gap-4 items-center">
        <span className="text-lg">Score: {score}</span>
        <span className="text-lg">Enemies: {numberOfEnemies}</span>
      </div>
   </>
  )
}

export default GameHeader;
