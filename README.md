# Nexus Arena - Multiplayer Drawing Game

A real-time multiplayer drawing and guessing game similar to Pictionary, built with Next.js, Socket.io, and React.

## Technologies Used

- **Next.js 15** - React framework for server-rendered applications
- **Socket.io** - Real-time bidirectional event-based communication
- **React** - Frontend UI library
- **TailwindCSS** - Utility-first CSS framework
- **NextAuth.js** - Authentication for Next.js
- **Howler.js** - Audio library for in-game sounds
- **UUID** - For generating unique room IDs

## Features

- User authentication system with demo accounts
- Real-time multiplayer gameplay
- Lobby system for creating/joining game rooms
- Drawing canvas with color and thickness options
- Chat system for guessing words
- Score tracking and game rounds
- Mobile-responsive design

## Game Flow

1. Players sign in or create an account
2. Enter the lobby to create or join a game room
3. Room creator can start the game when at least 2 players join
4. Players take turns drawing a randomly assigned word
5. Other players try to guess the word in the chat
6. Points are awarded based on how quickly players guess correctly
7. After all rounds complete, a winner is determined

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/nexus-arena.git
cd nexus-arena
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Demo Accounts

For testing purposes, you can use the following demo accounts:

- Admin: admin@example.com / password123
- User: user@example.com / password123

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by games like Pictionary and Skribbl.io
- Built as a learning project for real-time multiplayer web applications
