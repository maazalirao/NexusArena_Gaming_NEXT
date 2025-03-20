'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Howl } from 'howler';
import DrawingCanvas from '@/app/components/DrawingCanvas';
import ChatBox from '@/app/components/ChatBox';
import PlayersList from '@/app/components/PlayersList';
import GameInfo from '@/app/components/GameInfo';

// Sound effects
const sounds = {
  correctGuess: new Howl({ src: ['/sounds/correct-guess.mp3'], volume: 0.5 }),
  roundStart: new Howl({ src: ['/sounds/round-start.mp3'], volume: 0.5 }),
  roundEnd: new Howl({ src: ['/sounds/round-end.mp3'], volume: 0.5 }),
  gameEnd: new Howl({ src: ['/sounds/game-end.mp3'], volume: 0.5 }),
  message: new Howl({ src: ['/sounds/message.mp3'], volume: 0.2 }),
};

export default function GameRoom({ params }) {
  const { roomId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({
    status: 'waiting',
    round: 0,
    totalRounds: 3,
    drawerId: null,
    word: null,
    timeLeft: 0,
    scores: {},
  });
  const [isDrawer, setIsDrawer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      setLoading(false);
      initializeSocketEvents();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, router]);

  // Initialize socket events
  const initializeSocketEvents = () => {
    try {
      const socket = getSocket();
      socketRef.current = socket;

      // Join the room
      socket.emit('room:join', { roomId });

      // Room events
      socket.on('room:joined', (roomData) => {
        setRoom(roomData);
        setPlayers(roomData.players);
        setGameState(prev => ({
          ...prev,
          status: roomData.status,
          round: roomData.currentRound,
          totalRounds: roomData.totalRounds,
          drawerId: roomData.currentDrawer,
          timeLeft: roomData.timePerRound,
        }));
      });

      socket.on('room:playerJoined', (userData) => {
        // Add user to players list
        setPlayers(prev => [...prev, userData]);
        
        // Add system message
        addSystemMessage(`${userData.username} joined the room`);
      });

      socket.on('room:playerLeft', (userData) => {
        // Remove user from players list
        setPlayers(prev => prev.filter(player => player.userId !== userData.userId));
        
        // Add system message
        addSystemMessage(`${userData.username} left the room`);
      });

      // Game events
      socket.on('game:starting', () => {
        addSystemMessage('Game is starting...');
        setGameState(prev => ({ ...prev, status: 'playing' }));
      });

      socket.on('game:roundStart', (data) => {
        sounds.roundStart.play();
        
        setGameState(prev => ({
          ...prev,
          status: 'playing',
          round: data.round,
          drawerId: data.drawerId,
          timeLeft: data.timePerRound,
          wordLength: data.wordLength,
        }));

        // Check if current user is the drawer
        if (session?.user?.id === data.drawerId) {
          setIsDrawer(true);
        } else {
          setIsDrawer(false);
        }
        
        addSystemMessage(`Round ${data.round} of ${data.totalRounds} started!`);
        addSystemMessage(isDrawer ? 
          `It's your turn to draw!` : 
          `${getPlayerName(data.drawerId)} is drawing (${data.wordLength} letters)`);

        // Start the timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setGameState(prev => ({
            ...prev,
            timeLeft: Math.max(0, prev.timeLeft - 1)
          }));
        }, 1000);
      });

      socket.on('game:yourTurn', (data) => {
        setGameState(prev => ({
          ...prev,
          word: data.word,
        }));
        
        addSystemMessage(`Your word to draw is: ${data.word}`);
      });

      socket.on('game:correctGuess', (data) => {
        sounds.correctGuess.play();
        
        // Update scores in game state
        setGameState(prev => ({
          ...prev,
          scores: {
            ...prev.scores,
            [data.userId]: (prev.scores[data.userId] || 0) + data.pointsEarned
          }
        }));
        
        addSystemMessage(`${data.username} guessed the word correctly (+${data.pointsEarned} points)!`);
      });

      socket.on('game:roundEnd', (data) => {
        sounds.roundEnd.play();
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Update scores
        setGameState(prev => ({
          ...prev,
          scores: data.scores,
        }));
        
        addSystemMessage(`Round ended! The word was: ${data.word}`);
        setIsDrawer(false);
      });

      socket.on('game:end', (data) => {
        sounds.gameEnd.play();
        
        const winner = getPlayerName(data.winner);
        
        setGameState(prev => ({
          ...prev,
          status: 'ended',
          scores: data.scores,
        }));
        
        addSystemMessage(`Game ended! ${winner} is the winner!`);
      });

      socket.on('game:reset', () => {
        setGameState({
          status: 'waiting',
          round: 0,
          totalRounds: 3,
          drawerId: null,
          word: null,
          timeLeft: 0,
          scores: {},
        });
        
        addSystemMessage('Game has been reset. Ready for a new game!');
      });

      socket.on('game:drawerLeft', () => {
        addSystemMessage('The drawer left the game. Starting next round...');
      });

      // Drawing events
      socket.on('draw:start', (data) => {
        // These events will be handled by the DrawingCanvas component
      });

      socket.on('draw:move', (data) => {
        // These events will be handled by the DrawingCanvas component
      });

      socket.on('draw:end', (data) => {
        // These events will be handled by the DrawingCanvas component
      });

      socket.on('draw:clear', () => {
        // These events will be handled by the DrawingCanvas component
      });

      // Chat events
      socket.on('chat:message', (messageData) => {
        sounds.message.play();
        setMessages(prev => [...prev, messageData]);
      });

      // Error handling
      socket.on('error', (error) => {
        setError(error.message);
      });

      return () => {
        // Clean up event listeners
        socket.off('room:joined');
        socket.off('room:playerJoined');
        socket.off('room:playerLeft');
        socket.off('game:starting');
        socket.off('game:roundStart');
        socket.off('game:yourTurn');
        socket.off('game:correctGuess');
        socket.off('game:roundEnd');
        socket.off('game:end');
        socket.off('game:reset');
        socket.off('game:drawerLeft');
        socket.off('draw:start');
        socket.off('draw:move');
        socket.off('draw:end');
        socket.off('draw:clear');
        socket.off('chat:message');
        socket.off('error');
      };
    } catch (error) {
      console.error('Socket error:', error);
      setError('Failed to connect to game server. Please return to lobby.');
    }
  };

  // Add a system message
  const addSystemMessage = (message) => {
    setMessages(prev => [...prev, {
      userId: 'system',
      username: 'System',
      message,
      timestamp: Date.now(),
      isSystem: true,
    }]);
  };

  // Get player name from ID
  const getPlayerName = (userId) => {
    const player = players.find(p => p.userId === userId);
    return player ? player.username : 'Unknown Player';
  };

  // Start the game
  const handleStartGame = () => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('game:start', { roomId });
  };

  // Send a chat message (or guess)
  const handleSendMessage = (message) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('chat:message', { roomId, message });
  };

  // Return to lobby
  const handleReturnToLobby = () => {
    router.push('/lobby');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Game Header */}
      <header className="bg-gray-800 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-white">
              {room?.name || 'Game Room'}
            </h1>
            <p className="text-sm text-gray-400">
              Room ID: {roomId}
            </p>
          </div>
          
          <div className="mt-2 sm:mt-0">
            {gameState.status === 'waiting' && room?.createdBy === session?.user?.id && (
              <button 
                onClick={handleStartGame}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Start Game
              </button>
            )}
            
            <button 
              onClick={handleReturnToLobby}
              className="ml-2 px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-600"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </header>
      
      {error && (
        <div className="bg-red-500 text-white p-3 text-center text-sm">
          {error}
        </div>
      )}
      
      <div className="flex-1 flex flex-col lg:flex-row p-4">
        {/* Left Column - Players & Game Info */}
        <div className="w-full lg:w-1/4 mb-4 lg:mb-0 lg:mr-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
            <GameInfo gameState={gameState} />
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-4">
            <PlayersList 
              players={players} 
              scores={gameState.scores} 
              currentDrawerId={gameState.drawerId}
              currentUserId={session?.user?.id}
            />
          </div>
        </div>
        
        {/* Middle Column - Drawing Canvas */}
        <div className="w-full lg:w-2/4 mb-4 lg:mb-0 lg:mr-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col h-full">
            <DrawingCanvas 
              isDrawer={isDrawer} 
              socket={socketRef.current}
              roomId={roomId}
              gameStatus={gameState.status}
            />
            
            {isDrawer && gameState.word && (
              <div className="mt-2 p-3 bg-indigo-900 rounded-md text-center">
                <p className="text-sm text-gray-300">Your word to draw:</p>
                <p className="text-xl font-bold text-white">{gameState.word}</p>
              </div>
            )}
            
            {!isDrawer && gameState.status === 'playing' && (
              <div className="mt-2 p-3 bg-gray-700 rounded-md text-center">
                <p className="text-white">
                  Word: {gameState.wordLength && '_'.repeat(gameState.wordLength)}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Chat */}
        <div className="w-full lg:w-1/4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-4 h-full">
            <ChatBox 
              messages={messages} 
              onSendMessage={handleSendMessage}
              isDisabled={isDrawer && gameState.status === 'playing'}
              currentUserId={session?.user?.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 