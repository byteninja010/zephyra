import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const ReflectionChart = ({ isOpen, onClose }) => {
  const [reflections, setReflections] = useState([]);
  const [currentReflection, setCurrentReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('write'); // 'write' or 'view'

  const moodOptions = [
    { value: 'grateful', label: 'Grateful', emoji: '🙏', color: '#10B981' },
    { value: 'proud', label: 'Proud', emoji: '💪', color: '#3B82F6' },
    { value: 'hopeful', label: 'Hopeful', emoji: '🌟', color: '#F59E0B' },
    { value: 'peaceful', label: 'Peaceful', emoji: '☮️', color: '#8B5CF6' },
    { value: 'inspired', label: 'Inspired', emoji: '✨', color: '#EC4899' },
    { value: 'content', label: 'Content', emoji: '😌', color: '#06B6D4' }
  ];

  const categories = [
    'Personal Growth',
    'Relationships',
    'Work/Career',
    'Health & Wellness',
    'Hobbies & Interests',
    'Challenges Overcome',
    'Future Goals',
    'Daily Wins'
  ];

  useEffect(() => {
    // Load reflections from backend
    const loadReflections = async () => {
      try {
        const firebaseUid = localStorage.getItem('firebaseUid');
        if (firebaseUid) {
          const response = await authService.getReflections(firebaseUid);
          if (response.success) {
            setReflections(response.reflections || []);
          }
        }
      } catch (error) {
        console.error('Error loading reflections:', error);
        // Fallback to localStorage if backend fails
        const savedReflections = localStorage.getItem('reflections');
        if (savedReflections) {
          setReflections(JSON.parse(savedReflections));
        }
      }
    };

    if (isOpen) {
      loadReflections();
    }
  }, [isOpen]);

  const saveReflection = async () => {
    if (!currentReflection.trim() || !selectedMood || !selectedCategory) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      if (!firebaseUid) {
        alert('User not found. Please sign in again.');
        return;
      }

      const reflectionData = {
        text: currentReflection,
        mood: selectedMood,
        category: selectedCategory
      };

      const response = await authService.submitReflection(firebaseUid, reflectionData);
      
      if (response.success) {
        setReflections(response.reflections || []);
        // Reset form
        setCurrentReflection('');
        setSelectedMood('');
        setSelectedCategory('');
      } else {
        alert('Failed to save reflection. Please try again.');
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      alert('Failed to save reflection. Please try again.');
    }
  };

  const deleteReflection = (id) => {
    const updatedReflections = reflections.filter(ref => ref.id !== id);
    setReflections(updatedReflections);
    localStorage.setItem('reflections', JSON.stringify(updatedReflections));
  };

  const getMoodData = (mood) => {
    return moodOptions.find(m => m.value === mood) || { label: mood, emoji: '💭', color: '#6B7280' };
  };

  const getReflectionsByCategory = () => {
    const grouped = {};
    reflections.forEach(reflection => {
      if (!grouped[reflection.category]) {
        grouped[reflection.category] = [];
      }
      grouped[reflection.category].push(reflection);
    });
    return grouped;
  };

  const getReflectionsByMood = () => {
    const grouped = {};
    reflections.forEach(reflection => {
      if (!grouped[reflection.mood]) {
        grouped[reflection.mood] = [];
      }
      grouped[reflection.mood].push(reflection);
    });
    return grouped;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#1E252B' }}>
            Reflection Chart
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('write')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'write'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  background: viewMode === 'write'
                    ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    : 'transparent'
                }}
              >
                Write
              </button>
              <button
                onClick={() => setViewMode('view')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'view'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  background: viewMode === 'view'
                    ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    : 'transparent'
                }}
              >
                View
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {viewMode === 'write' ? (
          <div className="space-y-6">
            {/* Writing Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#475569' }}>
                  What are you reflecting on today?
                </label>
                <textarea
                  value={currentReflection}
                  onChange={(e) => setCurrentReflection(e.target.value)}
                  placeholder="Write about something positive, a lesson learned, or a moment of gratitude..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#475569' }}>
                    How does this make you feel?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {moodOptions.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood.value)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all ${
                          selectedMood === mood.value
                            ? 'text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        style={{
                          background: selectedMood === mood.value
                            ? mood.color
                            : 'rgba(229, 231, 235, 0.5)'
                        }}
                      >
                        <div className="text-lg mb-1">{mood.emoji}</div>
                        <div>{mood.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#475569' }}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={saveReflection}
                className="w-full px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                Save Reflection
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* View Mode */}
            {reflections.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
                  <svg className="w-8 h-8" fill="none" stroke="#3C91C5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: '#1E252B' }}>No reflections yet</h3>
                <p className="text-sm" style={{ color: '#475569' }}>Start writing to see your reflections here</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#3C91C5' }}>
                      {reflections.length}
                    </div>
                    <div className="text-sm" style={{ color: '#475569' }}>Total Reflections</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#10B981' }}>
                      {new Set(reflections.map(r => r.category)).size}
                    </div>
                    <div className="text-sm" style={{ color: '#475569' }}>Categories</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                      {new Set(reflections.map(r => r.mood)).size}
                    </div>
                    <div className="text-sm" style={{ color: '#475569' }}>Moods</div>
                  </div>
                </div>

                {/* Reflections List */}
                <div className="space-y-4">
                  {reflections.map((reflection) => {
                    const moodData = getMoodData(reflection.mood);
                    return (
                      <div
                        key={reflection.id}
                        className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{moodData.emoji}</span>
                            <div>
                              <div className="font-medium" style={{ color: '#1E252B' }}>
                                {moodData.label}
                              </div>
                              <div className="text-sm" style={{ color: '#475569' }}>
                                {reflection.category} • {reflection.timestamp}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteReflection(reflection.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm" style={{ color: '#475569' }}>
                          {reflection.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReflectionChart;
