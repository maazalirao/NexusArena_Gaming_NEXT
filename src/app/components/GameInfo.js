'use client';

export default function GameInfo({ gameState }) {
  const { status, round, totalRounds, timeLeft } = gameState;
  
  // Format time left as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage for timer
  const timerProgress = status === 'playing' && gameState.timePerRound 
    ? (timeLeft / gameState.timePerRound) * 100 
    : 0;
  
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">Game Info</h3>
      
      <div className="space-y-4">
        {/* Game Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Status:</span>
          <span className={`px-2 py-1 text-xs rounded ${
            status === 'waiting' ? 'bg-green-800 text-green-200' :
            status === 'playing' ? 'bg-indigo-800 text-indigo-200' :
            'bg-red-800 text-red-200'
          }`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        
        {/* Round Info */}
        {status !== 'waiting' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Round:</span>
            <span className="text-white font-medium">
              {round} / {totalRounds}
            </span>
          </div>
        )}
        
        {/* Timer (only show during gameplay) */}
        {status === 'playing' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300">Time left:</span>
              <span className="text-white font-mono">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${timerProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Instructions */}
        {status === 'waiting' && (
          <div className="text-gray-400 text-sm">
            <p>Waiting for the game to start...</p>
            <p className="mt-1">Once started, players will take turns drawing a word while others try to guess it!</p>
          </div>
        )}
        
        {status === 'playing' && (
          <div className="text-gray-400 text-sm">
            <p>The faster you guess correctly, the more points you earn!</p>
          </div>
        )}
        
        {status === 'ended' && (
          <div className="text-gray-400 text-sm">
            <p>Game has ended. The room owner can start a new game.</p>
          </div>
        )}
      </div>
    </div>
  );
} 