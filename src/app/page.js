'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user is logged in, redirect to lobby
    if (status === 'authenticated') {
      router.push('/lobby');
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, router]);

  if (loading && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Welcome to <span className="text-indigo-400">Nexus Arena</span>
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
          A real-time multiplayer drawing and guessing game where you can challenge friends,
          create masterpieces, and test your artistic skills!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/auth/signin"
            className="rounded-md bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Sign In
          </Link>
          <Link 
            href="/auth/signup"
            className="rounded-md bg-gray-700 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Create Account
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-400 mb-3">Draw & Guess</h3>
            <p className="text-gray-300">Take turns drawing while others try to guess what you're creating. Earn points for quick guesses!</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-400 mb-3">Multiplayer Rooms</h3>
            <p className="text-gray-300">Create private rooms for friends or join public games and compete with players worldwide.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-400 mb-3">Leaderboards</h3>
            <p className="text-gray-300">Climb the ranks, unlock achievements, and become a drawing legend in our competitive leaderboards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
