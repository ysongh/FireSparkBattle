import { useNavigate } from "react-router-dom";

function Lobby() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 text-yellow-400 drop-shadow-lg animate-pulse">
          💣 Fire Spark Battle
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Choose your game mode and start Sparking!
        </p>
      </div>
      
      <div className="space-y-6 w-80">
        {/* Single Player Button */}
        <button
          onClick={() => navigate("/practice")}
          className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                      rounded-xl text-xl font-bold transform hover:scale-105 transition-all duration-200 
                      shadow-lg hover:shadow-xl border-2 border-green-400/50 hover:border-green-300"
        >
          🎮 Single Player
        </button>
        
        {/* Multiplayer Button */}
        <button
          onClick={() => navigate("/multiplayer")}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 
                      rounded-xl text-xl font-bold transform hover:scale-105 transition-all duration-200 
                      shadow-lg hover:shadow-xl border-2 border-blue-400/50 hover:border-blue-300"
        >
          👥 Multiplayer
        </button>
        
        {/* Settings Button */}
        <button
          onClick={() => navigate("/")}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 
                      rounded-xl text-xl font-bold transform hover:scale-105 transition-all duration-200 
                      shadow-lg hover:shadow-xl border-2 border-purple-400/50 hover:border-purple-300"
        >
          ⚙️ Settings
        </button>
      </div>
      
      <div className="mt-12 text-center text-gray-400">
        <p className="text-sm">Use arrow keys or WASD to move • Space/Enter to drop fireworks</p>
      </div>
    </div>
  )
}

export default Lobby;
