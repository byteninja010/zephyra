import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../config/api';

const MindCanvas = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#4F46E5');
  const [brushSize, setBrushSize] = useState(8);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isEraser, setIsEraser] = useState(false);

  // Color palette - emotionally expressive colors
  const colorPalette = [
    { name: 'Indigo', color: '#4F46E5' },
    { name: 'Purple', color: '#9333EA' },
    { name: 'Pink', color: '#EC4899' },
    { name: 'Red', color: '#EF4444' },
    { name: 'Orange', color: '#F97316' },
    { name: 'Yellow', color: '#EAB308' },
    { name: 'Green', color: '#22C55E' },
    { name: 'Teal', color: '#14B8A6' },
    { name: 'Blue', color: '#3B82F6' },
    { name: 'Sky', color: '#0EA5E9' },
    { name: 'Gray', color: '#6B7280' },
    { name: 'Black', color: '#1F2937' }
  ];

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match the container
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = rect.height || 600;
        
        // Set white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }, 100);
    }
  }, [isOpen]);

  const getCoordinates = (e, rect) => {
    // Handle both mouse and touch events
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const coords = getCoordinates(e, rect);
    
    setIsDrawing(true);
    
    // Set drawing style - use white for eraser, selected color for drawing
    const currentColor = isEraser ? '#FFFFFF' : brushColor;
    const currentSize = isEraser ? brushSize * 2 : brushSize; // Make eraser bigger
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Start new path
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const coords = getCoordinates(e, rect);
    
    // Ensure drawing style is set - use white for eraser, selected color for drawing
    const currentColor = isEraser ? '#FFFFFF' : brushColor;
    const currentSize = isEraser ? brushSize * 2 : brushSize; // Make eraser bigger
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw line to current position
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    // Start new path from current position for continuous drawing
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      e?.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.closePath();
      }
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setAnalysis(null);
    setShowResult(false);
  };


  const analyzeDrawing = async () => {
    if (!user?.firebaseUid) {
      alert('Please sign in to analyze your drawing');
      return;
    }

    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/canvas/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firebaseUid: user.firebaseUid,
          imageData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
        setShowResult(true);
      } else {
        alert('Failed to analyze drawing: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error analyzing drawing:', error);
      alert('Failed to analyze drawing. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMoodEmoji = (mood) => {
    const moodMap = {
      calm: '🌊',
      anxious: '😰',
      joyful: '😊',
      reflective: '🤔',
      tense: '😤',
      peaceful: '☮️',
      energized: '⚡',
      contemplative: '💭',
      restless: '😣',
      serene: '🕊️',
      sad: '😢',
      happy: '😄',
      stressed: '😫',
      relaxed: '😌',
      hopeful: '🌟'
    };
    return moodMap[mood.toLowerCase()] || '💙';
  };

  const getMoodColor = (mood) => {
    const colorMap = {
      calm: 'from-blue-400 to-cyan-300',
      anxious: 'from-orange-400 to-red-400',
      joyful: 'from-yellow-400 to-pink-400',
      reflective: 'from-purple-400 to-indigo-400',
      tense: 'from-red-500 to-orange-500',
      peaceful: 'from-green-300 to-blue-300',
      energized: 'from-yellow-400 to-orange-400',
      contemplative: 'from-indigo-400 to-purple-400',
      restless: 'from-orange-500 to-red-500',
      serene: 'from-blue-200 to-green-200',
      sad: 'from-blue-500 to-gray-500',
      happy: 'from-yellow-300 to-pink-300',
      stressed: 'from-red-400 to-purple-400',
      relaxed: 'from-green-400 to-blue-400',
      hopeful: 'from-pink-400 to-yellow-300'
    };
    return colorMap[mood.toLowerCase()] || 'from-indigo-400 to-purple-400';
  };

  const createNewDrawing = () => {
    clearCanvas();
    setShowResult(false);
    setAnalysis(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Mind Canvas
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              No words. Just colors — and AI feels what you draw.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
            {/* Drawing Area */}
            <div className="flex flex-col space-y-4 h-full">
              {/* Instructions Banner */}
              <div className={`border rounded-lg p-3 text-sm ${
                isEraser 
                  ? 'bg-pink-50 border-pink-200 text-pink-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <strong>💡 Quick Start:</strong> {isEraser 
                  ? 'Click and drag on your drawing to erase parts of it!'
                  : 'Choose a color below and click & drag on the canvas to draw!'
                }
              </div>
              
              <div className="flex-1 min-h-[400px] relative bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-blue-200">
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${isEraser ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ touchAction: 'none', display: 'block' }}
                />
                {/* Canvas overlay to show it's ready */}
                {!isDrawing && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                    <p className="text-6xl">🎨</p>
                  </div>
                )}
              </div>

              {/* Drawing Controls */}
              <div className="space-y-4">
                {/* Drawing Mode Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEraser(false)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
                      !isEraser
                        ? 'text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={!isEraser ? {
                      background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    } : {}}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Draw
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
                      isEraser
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Erase
                  </button>
                </div>

                {/* Color Palette - Only show when not erasing */}
                {!isEraser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose Your Colors
                    </label>
                    <div className="grid grid-cols-6 gap-2.5">
                      {colorPalette.map((colorObj) => (
                        <button
                          key={colorObj.color}
                          onClick={() => setBrushColor(colorObj.color)}
                          className={`w-full aspect-square rounded-md transition-all ${
                            brushColor === colorObj.color
                              ? 'ring-2 ring-blue-500'
                              : 'hover:ring-2 hover:ring-gray-300'
                          }`}
                          style={{ backgroundColor: colorObj.color }}
                          title={colorObj.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Eraser Info - Only show when erasing */}
                {isEraser && (
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-pink-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium">
                        Eraser mode active - Click and drag to erase. Eraser is 2x the brush size.
                      </p>
                    </div>
                  </div>
                )}

                {/* Brush Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isEraser ? 'Eraser' : 'Brush'} Size: {isEraser ? brushSize * 2 : brushSize}px
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="2"
                      max="40"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                        isEraser ? 'accent-pink-600' : 'accent-blue-600'
                      }`}
                    />
                    <div 
                      className="rounded-full border-2"
                      style={{ 
                        width: `${Math.max(isEraser ? brushSize * 2 : brushSize, 20)}px`, 
                        height: `${Math.max(isEraser ? brushSize * 2 : brushSize, 20)}px`,
                        backgroundColor: isEraser ? '#FFFFFF' : brushColor,
                        borderColor: isEraser ? '#EC4899' : '#D1D5DB',
                        minWidth: '20px',
                        minHeight: '20px',
                        boxShadow: isEraser ? '0 0 0 1px #EC4899' : 'none'
                      }}
                      title={isEraser ? 'Eraser preview' : 'Brush preview'}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={clearCanvas}
                    className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all transform hover:scale-105"
                  >
                    Clear Canvas
                  </button>
                  <button
                    onClick={analyzeDrawing}
                    disabled={isAnalyzing}
                    className="w-full px-6 py-3 text-white rounded-xl font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    }}
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing...
                      </div>
                    ) : (
                      '✨ Reveal My Mood'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="flex flex-col">
              {showResult && analysis ? (
                <div className="flex-1 space-y-6 animate-fade-in">
                  {/* Mood Display */}
                  <div className={`bg-gradient-to-br ${getMoodColor(analysis.mood)} rounded-2xl p-8 text-white shadow-xl`}>
                    <div className="flex items-center justify-center mb-4">
                      <span className="text-7xl">{getMoodEmoji(analysis.mood)}</span>
                    </div>
                    <h3 className="text-3xl font-bold text-center capitalize mb-2">
                      {analysis.mood}
                    </h3>
                    <p className="text-lg text-center opacity-90 italic">
                      "{analysis.moodDescription}"
                    </p>
                  </div>

                  {/* Analysis Details */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <span className="mr-2">🎨</span> Color Story
                      </h4>
                      <p className="text-gray-700">{analysis.colorAnalysis}</p>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-6 border border-cyan-100">
                      <h4 className="font-semibold text-cyan-900 mb-2 flex items-center">
                        <span className="mr-2">✏️</span> Stroke Energy
                      </h4>
                      <p className="text-gray-700">{analysis.strokeAnalysis}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-100">
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                        <span className="mr-2">💡</span> Activity Suggestion
                      </h4>
                      <p className="text-gray-700 font-medium">{analysis.activitySuggestion}</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
                      <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                        <span className="mr-2">💙</span> A Message For You
                      </h4>
                      <p className="text-gray-700 italic">{analysis.encouragement}</p>
                    </div>
                  </div>

                  {/* New Drawing Button */}
                  <button
                    onClick={createNewDrawing}
                    className="w-full px-6 py-4 text-white rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    }}
                  >
                    Create Another Drawing
                  </button>
                </div>
              ) : (
                <div className="flex-1 pt-32 pl-10">
                  <div className="text-center max-w-md space-y-6 animate-gentle-pulse">
                    <div className="text-6xl mb-4">🎨</div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      Express Yourself
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Let your emotions flow through colors and strokes. 
                      There's no right or wrong way to draw. 
                      When you're ready, AI will interpret the feelings behind your creation.
                    </p>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                      <p className="text-sm text-gray-700">
                        <strong>Tip:</strong> Don't overthink it. Just draw what feels right in this moment. 
                        Abstract shapes, colors, lines — it all tells a story.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindCanvas;

