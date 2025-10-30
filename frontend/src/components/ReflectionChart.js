import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const ReflectionChart = ({ isOpen, onClose }) => {
  const [reflections, setReflections] = useState([]);
  const [currentReflection, setCurrentReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('write'); // 'write' or 'view'
  const [deletingId, setDeletingId] = useState(null); // Track which reflection is being deleted
  const [isSaving, setIsSaving] = useState(false); // Track saving state

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

    setIsSaving(true);
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      if (!firebaseUid) {
        alert('User not found. Please sign in again.');
        setIsSaving(false);
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
        // Switch to view mode to show the new reflection with AI comment
        setViewMode('view');
      } else {
        alert('Failed to save reflection. Please try again.');
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      alert('Failed to save reflection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReflection = async (reflectionId) => {
    if (!reflectionId) {
      alert('Invalid reflection ID');
      return;
    }

    // Show confirmation dialog
    const confirmDelete = window.confirm('Are you sure you want to delete this reflection? This action cannot be undone.');
    
    if (!confirmDelete) {
      return;
    }

    // Set loading state
    setDeletingId(reflectionId);

    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      if (!firebaseUid) {
        alert('User not found. Please sign in again.');
        setDeletingId(null);
        return;
      }

      // Call backend API to delete reflection
      const response = await authService.deleteReflection(firebaseUid, reflectionId);
      
      if (response.success) {
        // Update local state with the updated reflections from backend
        setReflections(response.reflections || []);
        // Remove localStorage fallback as we're now fully backend-driven
        localStorage.removeItem('reflections');
      } else {
        alert('Failed to delete reflection. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting reflection:', error);
      
      // Provide more specific error messages
      if (error.response) {
        if (error.response.status === 404) {
          alert('Reflection not found. It may have already been deleted.');
          // Refresh the list
          try {
            const firebaseUid = localStorage.getItem('firebaseUid');
            const response = await authService.getReflections(firebaseUid);
            if (response.success) {
              setReflections(response.reflections || []);
            }
          } catch (refreshError) {
            console.error('Error refreshing reflections:', refreshError);
          }
        } else if (error.response.status === 401 || error.response.status === 403) {
          alert('Authentication error. Please sign in again.');
        } else {
          alert('Failed to delete reflection. Please try again.');
        }
      } else if (error.request) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Failed to delete reflection. Please try again.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getMoodData = (mood) => {
    return moodOptions.find(m => m.value === mood) || { label: mood, emoji: '💭', color: '#6B7280' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[90vh] p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#1E252B' }}>
            Reflection Chart
          </h2>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('write')}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
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
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
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
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {viewMode === 'write' ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Writing Form */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: '#475569' }}>
                  What are you reflecting on today?
                </label>
                <textarea
                  value={currentReflection}
                  onChange={(e) => setCurrentReflection(e.target.value)}
                  placeholder="Write about something positive, a lesson learned, or a moment of gratitude..."
                  className="w-full p-3 sm:p-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: '#475569' }}>
                    How does this make you feel?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {moodOptions.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood.value)}
                        className={`dashboard-card p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
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
                        <div className="text-base sm:text-lg mb-1">{mood.emoji}</div>
                        <div className="text-xs sm:text-sm">{mood.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: '#475569' }}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                disabled={isSaving}
                className={`w-full px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base text-white font-medium transition-all duration-300 ${
                  isSaving ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                {isSaving ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving & Generating AI Response...</span>
                  </div>
                ) : (
                  'Save Reflection'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* View Mode */}
          {reflections.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="dashboard-card w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#3C91C5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium mb-2" style={{ color: '#1E252B' }}>No reflections yet</h3>
                <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>Start writing to see your reflections here</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="dashboard-card p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: '#3C91C5' }}>
                      {reflections.length}
                    </div>
                    <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>Total Reflections</div>
                  </div>
                  <div className="dashboard-card p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: '#10B981' }}>
                      {new Set(reflections.map(r => r.category)).size}
                    </div>
                    <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>Categories</div>
                  </div>
                  <div className="dashboard-card p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: '#F59E0B' }}>
                      {new Set(reflections.map(r => r.mood)).size}
                    </div>
                    <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>Moods</div>
                  </div>
                </div>

                {/* Reflections List */}
                <div className="space-y-3 sm:space-y-4">
                  {reflections.map((reflection, index) => {
                    const moodData = getMoodData(reflection.mood);
                    const reflectionId = reflection._id || reflection.id;
                    return (
                      <div
                        key={reflectionId || index}
                        className="dashboard-card p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <span className="text-xl sm:text-2xl">{moodData.emoji}</span>
                            <div>
                              <div className="text-sm sm:text-base font-medium" style={{ color: '#1E252B' }}>
                                {moodData.label}
                              </div>
                              <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>
                                {reflection.category} • {new Date(reflection.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteReflection(reflectionId)}
                            disabled={deletingId === reflectionId}
                            className={`transition-colors flex-shrink-0 ${
                              deletingId === reflectionId 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                            title={deletingId === reflectionId ? "Deleting..." : "Delete reflection"}
                          >
                            {deletingId === reflectionId ? (
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm mb-3" style={{ color: '#475569' }}>
                          {reflection.text}
                        </p>
                        
                        {/* Gemini Appreciation Comment */}
                        {reflection.geminiComment && (
                          <div className="dashboard-card mt-3 p-3 rounded-lg border-l-4" style={{ 
                            background: 'linear-gradient(to right, rgba(60, 145, 197, 0.05), rgba(60, 145, 197, 0.02))',
                            borderColor: '#3C91C5'
                          }}>
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#3C91C5' }}>
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" opacity="0.3"/>
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                  <circle cx="12" cy="12" r="2" fill="white"/>
                                  <path d="M12 6.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="#3C91C5"/>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-medium mb-1 flex " style={{ color: '#3C91C5' }}>
                                  <img src='/Google_Gemini_logo.png' className='w-12 h-4 mr-2' alt='Gemini'></img> 
                                  <h1 className='text-sm'>wanna say somethin' to you !! </h1>
                                </div>
                                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#1E252B' }}>
                                  {reflection.geminiComment}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
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
    </div>
  );
};

export default ReflectionChart;
