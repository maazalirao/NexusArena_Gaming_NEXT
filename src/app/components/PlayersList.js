'use client';

export default function PlayersList({ players, scores, currentDrawerId, currentUserId }) {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = scores[a.userId] || 0;
    const scoreB = scores[b.userId] || 0;
    return scoreB - scoreA;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">Players</h3>
      
      <div className="space-y-2">
        {sortedPlayers.map((player) => (
          <div 
            key={player.userId}
            className={`flex items-center justify-between p-2 rounded-lg ${
              player.userId === currentUserId ? 'bg-indigo-900' : 'bg-gray-700'
            }`}
          >
            <div className="flex items-center">
              <div className="relative">
                <img 
                  src={player.avatar || '/images/avatars/default.png'} 
                  alt={`${player.username}'s avatar`} 
                  className="w-8 h-8 rounded-full"
                />
                {player.userId === currentDrawerId && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-[8px]" title="Currently drawing">✏️</span>
                  </div>
                )}
              </div>
              
              <div className="ml-2">
                <p className={`text-sm font-medium ${
                  player.userId === currentUserId ? 'text-indigo-300' : 'text-white'
                }`}>
                  {player.username} {player.userId === currentUserId && '(You)'}
                </p>
              </div>
            </div>
            
            <div className="text-sm font-semibold text-yellow-400">
              {scores[player.userId] || 0} pts
            </div>
          </div>
        ))}
        
        {players.length === 0 && (
          <div className="text-center text-gray-400 py-4">
            No players yet
          </div>
        )}
      </div>
    </div>
  );
} 