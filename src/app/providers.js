'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { initializeSocket } from '@/lib/socket';

export function Providers({ children }) {
  // Initialize socket connection when on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializeSocket();
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
} 