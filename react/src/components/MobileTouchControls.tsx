interface MobileTouchControlsProps {
  gameOver: boolean;
  handleFireworkPress: any;
  handleButtonPress: Function;
}

function MobileTouchControls({ gameOver, handleFireworkPress, handleButtonPress }: MobileTouchControlsProps) {
  return (
    <div className="flex">
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
    </div>
  )
}

export default MobileTouchControls