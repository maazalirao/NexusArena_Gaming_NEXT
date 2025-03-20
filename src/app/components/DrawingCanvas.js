'use client';

import { useRef, useEffect, useState } from 'react';

export default function DrawingCanvas({ isDrawer, socket, roomId, gameStatus }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  // Available colors
  const colors = [
    '#000000', // Black
    '#ffffff', // White
    '#ff0000', // Red
    '#00ff00', // Green
    '#0000ff', // Blue
    '#ffff00', // Yellow
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ff9900', // Orange
    '#9900ff', // Purple
    '#006600', // Dark Green
    '#663300', // Brown
  ];

  // Line thicknesses
  const thicknesses = [2, 5, 10, 15, 20];

  // Setup canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    // Configure context
    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = thickness;
    contextRef.current = context;

    // Clear the canvas
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Handle window resize
    const handleResize = () => {
      const prevLineWidth = context.lineWidth;
      const prevStrokeStyle = context.strokeStyle;
      const prevFillStyle = context.fillStyle;
      
      // Save current drawing
      const imgData = context.getImageData(0, 0, canvas.width / 2, canvas.height / 2);
      
      // Resize canvas
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;
      
      // Restore context properties
      context.scale(2, 2);
      context.lineCap = 'round';
      context.lineWidth = prevLineWidth;
      context.strokeStyle = prevStrokeStyle;
      context.fillStyle = prevFillStyle;
      
      // Restore drawing
      context.putImageData(imgData, 0, 0);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket || !contextRef.current) return;

    // Handle drawing from other users
    const handleDrawStart = (data) => {
      const context = contextRef.current;
      if (!context) return;

      context.strokeStyle = data.color;
      context.lineWidth = data.thickness;
      
      context.beginPath();
      context.moveTo(data.x, data.y);
    };

    const handleDrawMove = (data) => {
      const context = contextRef.current;
      if (!context) return;

      context.lineTo(data.x, data.y);
      context.stroke();
    };

    const handleDrawEnd = () => {
      const context = contextRef.current;
      if (!context) return;

      context.closePath();
    };

    const handleDrawClear = () => {
      clearCanvas();
    };

    // Subscribe to socket events
    socket.on('draw:start', handleDrawStart);
    socket.on('draw:move', handleDrawMove);
    socket.on('draw:end', handleDrawEnd);
    socket.on('draw:clear', handleDrawClear);

    return () => {
      // Unsubscribe
      socket.off('draw:start', handleDrawStart);
      socket.off('draw:move', handleDrawMove);
      socket.off('draw:end', handleDrawEnd);
      socket.off('draw:clear', handleDrawClear);
    };
  }, [socket]);

  // Update context when color or thickness changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = thickness;
    }
  }, [color, thickness]);

  // Mouse events for drawing
  const startDrawing = (e) => {
    if (!isDrawer || gameStatus !== 'playing') return;
    
    const { offsetX, offsetY } = getCoordinates(e);
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setLastPosition({ x: offsetX, y: offsetY });
    
    // Emit draw start event
    socket?.emit('draw:start', {
      roomId,
      x: offsetX,
      y: offsetY,
      color,
      thickness,
    });
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer || gameStatus !== 'playing') return;

    const { offsetX, offsetY } = getCoordinates(e);
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    setLastPosition({ x: offsetX, y: offsetY });
    
    // Emit draw move event
    socket?.emit('draw:move', {
      roomId,
      x: offsetX,
      y: offsetY,
    });
  };

  const endDrawing = () => {
    if (!isDrawer || gameStatus !== 'playing') return;
    
    contextRef.current.closePath();
    setIsDrawing(false);
    
    // Emit draw end event
    socket?.emit('draw:end', { roomId });
  };

  // Touch events for mobile drawing
  const handleTouchStart = (e) => {
    if (!isDrawer || gameStatus !== 'playing') return;
    e.preventDefault();
    
    const { offsetX, offsetY } = getTouchCoordinates(e);
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setLastPosition({ x: offsetX, y: offsetY });
    
    // Emit draw start event
    socket?.emit('draw:start', {
      roomId,
      x: offsetX,
      y: offsetY,
      color,
      thickness,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || !isDrawer || gameStatus !== 'playing') return;
    e.preventDefault();
    
    const { offsetX, offsetY } = getTouchCoordinates(e);
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    setLastPosition({ x: offsetX, y: offsetY });
    
    // Emit draw move event
    socket?.emit('draw:move', {
      roomId,
      x: offsetX,
      y: offsetY,
    });
  };

  const handleTouchEnd = (e) => {
    if (!isDrawer || gameStatus !== 'playing') return;
    e.preventDefault();
    
    contextRef.current.closePath();
    setIsDrawing(false);
    
    // Emit draw end event
    socket?.emit('draw:end', { roomId });
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) return;
    
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    
    // Emit clear event if drawer
    if (isDrawer && gameStatus === 'playing') {
      socket?.emit('draw:clear', { roomId });
    }
  };

  // Helpers for coordinates
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    return { offsetX, offsetY };
  };

  const getTouchCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    return { offsetX, offsetY };
  };

  return (
    <div className="flex flex-col h-full w-full">
      {isDrawer && gameStatus === 'playing' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {colors.map((c) => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full ${
                  color === c ? 'ring-2 ring-white' : ''
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-1 ml-auto">
            {thicknesses.map((t) => (
              <button
                key={t}
                className={`flex items-center justify-center w-8 h-8 rounded-md ${
                  thickness === t ? 'bg-gray-700' : 'bg-gray-900'
                }`}
                onClick={() => setThickness(t)}
                aria-label={`Thickness ${t}px`}
              >
                <div 
                  className="rounded-full bg-current" 
                  style={{ 
                    width: `${t}px`, 
                    height: `${t}px`,
                    backgroundColor: color
                  }} 
                />
              </button>
            ))}
            
            <button
              className="ml-2 px-2 py-1 bg-red-600 text-white text-sm rounded"
              onClick={clearCanvas}
              aria-label="Clear canvas"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      <div className="relative flex-1 flex items-center justify-center bg-white rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        
        {!isDrawer && gameStatus !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <p className="text-black font-medium">
              {gameStatus === 'waiting' ? 'Waiting for the game to start...' : 'Game ended'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 