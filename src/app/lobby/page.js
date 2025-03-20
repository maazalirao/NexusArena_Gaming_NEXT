'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

export default function Lobby() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      setLoading(false);
      initializeSocketEvents();
    }
  }, [status, router]);

  // Initialize socket events
  const initializeSocketEvents = () => {
    try {
      const socket = getSocket();

      // Join as a user
      socket.emit('user:join', {
        userId: session.user.id,
        username: session.user.name,
        avatar: session.user.image,
      });

      // Get room updates
      socket.on('rooms:update', (updatedRooms) => {
        setRooms(updatedRooms);
      });

      // Initial request for rooms
      socket.emit('rooms:list');

      return () => {
        socket.off('rooms:update');
      };
    } catch (error) {
      console.error('Socket error:', error);
      setError('Failed to connect to game server. Please refresh the page.');
    }
  };

  // Create a new room
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    if (isPrivate && !password.trim()) {
      setError('Please enter a password for private room');
      return;
    }

    try {
      const socket = getSocket();
      const roomId = uuidv4();

      socket.emit('room:create', {
        roomId,
        roomName: newRoomName,
        createdBy: session.user.id,
        maxPlayers,
        isPrivate,
        password: isPrivate ? password : null,
      });

      // Join the created room
      router.push(`/game/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    }
  };

  // Join an existing room
  const handleJoinRoom = (roomId, isPrivate) => {
    let roomPassword = null;

    if (isPrivate) {
      roomPassword = prompt('Enter room password:');
      if (!roomPassword) return;
    }

    try {
      const socket = getSocket();
      
      socket.emit('room:join', {
        roomId,
        password: roomPassword,
      });

      router.push(`/game/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Game Lobby</h1>
            <p className="text-gray-400 mt-1">Create a new room or join an existing one</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <div className="flex items-center gap-3">
              <img 
                src={session?.user?.image || '/images/avatars/default.png'} 
                alt="User avatar" 
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-white font-medium">{session?.user?.name}</p>
                <div className="flex gap-3 text-sm">
                  <Link href="/profile" className="text-indigo-400 hover:underline">Profile</Link>
                  <Link href="/api/auth/signout" className="text-red-400 hover:underline">Sign Out</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded text-center text-sm mb-6">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Room Panel */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Room</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="roomName" className="block text-sm font-medium text-gray-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Awesome Room"
                />
              </div>
              
              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-300 mb-1">
                  Max Players
                </label>
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num} players</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-300">
                  Private Room (Password Protected)
                </label>
              </div>
              
              {isPrivate && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    Room Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter password"
                  />
                </div>
              )}
              
              <button
                onClick={handleCreateRoom}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Room
              </button>
            </div>
          </div>
          
          {/* Available Rooms */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Available Rooms</h2>
            
            {rooms.length === 0 ? (
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                <p className="text-gray-400">No rooms available. Create a new one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-white font-medium">{room.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        room.status === 'waiting' ? 'bg-green-800 text-green-200' : 
                        room.status === 'playing' ? 'bg-indigo-800 text-indigo-200' : 
                        'bg-red-800 text-red-200'
                      }`}>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-3">
                      <div className="flex justify-between">
                        <span>Players:</span>
                        <span>{room.players} / {room.maxPlayers}</span>
                      </div>
                      {room.isPrivate && (
                        <div className="flex items-center mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Password Protected</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleJoinRoom(room.id, room.isPrivate)}
                      disabled={room.players >= room.maxPlayers || room.status === 'playing'}
                      className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        ${room.players >= room.maxPlayers || room.status === 'playing' ? 
                        'bg-gray-600 cursor-not-allowed' : 
                        'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
                    >
                      {room.players >= room.maxPlayers ? 'Room Full' : 
                       room.status === 'playing' ? 'Game in Progress' : 
                       'Join Room'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 