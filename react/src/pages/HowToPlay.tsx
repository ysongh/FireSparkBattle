import { useNavigate } from "react-router-dom";

function HowToPlay() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">How to Play</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Controls Section */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center">
              🎮 Controls
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="bg-gray-600 px-2 py-1 rounded text-sm">↑↓←→</span>
                <span>or</span>
                <span className="bg-gray-600 px-2 py-1 rounded text-sm">WASD</span>
                <span>Move Player</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-gray-600 px-2 py-1 rounded text-sm">Firework Button</span>
                <span>or</span>
                <span className="bg-gray-600 px-2 py-1 rounded text-sm">Space</span>
                <span>or</span>
                <span className="bg-gray-600 px-2 py-1 rounded text-sm">Enter</span>
                <span>Drop Fireworks</span>
              </div>
            </div>
          </div>

          {/* Game Elements */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-green-400 mb-3">🎯 Game Elements</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">🤖</span>
                <span>You (Player) - Stay alive!</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">👾</span>
                <span>Enemies - Avoid or eliminate them</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">🧨</span>
                <span>Fireworks - Explodes after 3 seconds</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">💥</span>
                <span>Explosion - Deadly to all!</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📦</span>
                <span>Destructible boxes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-gray-800 w-4 h-4 inline-block rounded"></span>
                <span>Indestructible walls</span>
              </div>
            </div>
          </div>

          {/* Objective */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-purple-400 mb-3">🏆 Objective</h3>
            <div className="space-y-2 text-sm">
              <p>• <strong>Primary Goal:</strong> Eliminate all enemies to win!</p>
              <p>• Use bombs strategically to trap and destroy enemies</p>
              <p>• Clear destructible boxes for points and better positioning</p>
              <p>• Survive until all enemies are defeated</p>
            </div>
          </div>

          {/* Scoring & Tips */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-yellow-400 mb-3">💰 Scoring & Tips</h3>
            <div className="space-y-2 text-sm">
              <p>• <strong>Destroy boxes:</strong> +10 points</p>
              <p>• <strong>Eliminate enemies:</strong> +50 points each</p>
              <p>• <strong>Strategy:</strong> Use boxes as cover and create escape routes</p>
              <p>• <strong>Timing:</strong> Bombs explode after 3 seconds - plan your escape!</p>
              <p>• <strong>Range:</strong> Explosions spread 2 tiles in all directions</p>
            </div>
          </div>
        </div>

        {/* Danger Warnings */}
        <div className="mt-6 bg-red-900 border border-red-600 rounded-lg p-4">
          <h3 className="text-xl font-bold text-red-400 mb-3">⚠️ Danger Zones</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Instant Game Over:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Getting caught in an explosion</li>
                <li>Touching an enemy directly</li>
              </ul>
            </div>
            <div>
              <p><strong>Enemy Behavior:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Enemies move every 0.8 seconds</li>
                <li>They avoid bombs and walls</li>
                <li>Movement is somewhat unpredictable</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button 
            onClick={() => navigate("/practice")}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg transition-colors"
          >
            🚀 Start Game
          </button>
          <button 
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default HowToPlay