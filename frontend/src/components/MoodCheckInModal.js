import React, { useState } from 'react';
import authService from '../services/authService';

const MoodCheckInModal = ({ isOpen, onClose, onMoodSubmitted }) => {
  const [selectedMood, setSelectedMood] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moodOptions = [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😐', label: 'Neutral', value: 'neutral' },
    { emoji: '😔', label: 'Sad', value: 'sad' },
    { emoji: '😰', label: 'Anxious', value: 'anxious' },
    { emoji: '😴', label: 'Tired', value: 'tired' },
    { emoji: '😌', label: 'Calm', value: 'calm' },
    { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
    { emoji: '🤗', label: 'Hopeful', value: 'hopeful' }
  ];

  const handleSubmit = async () => {
    if (!selectedMood) return;

    setIsSubmitting(true);
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      if (!firebaseUid) {
        console.error('No user ID available');
        return;
      }

      // Submit mood to backend
      await authService.submitMood(firebaseUid, {
        mood: selectedMood,
        note: moodNote || '',
        date: new Date()
      });

      // Call the callback to update parent state
      onMoodSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting mood:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="dashboard-card bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-white/20">
          {/* Modal Header */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2" style={{ color: '#1E252B' }}>Good Morning! 🌅</h2>
            <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>How are you feeling today?</p>
          </div>

          {/* Mood Selection */}
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(selectedMood === mood.value ? '' : mood.value)}
                  className={`dashboard-card p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 hover:opacity-80 transition-all duration-300 transform hover:scale-105 ${
                    selectedMood === mood.value
                      ? 'text-white shadow-lg scale-105'
                      : 'hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: selectedMood === mood.value ? '#3C91C5' : 'rgba(107, 114, 128, 0.3)',
                    background: selectedMood === mood.value ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' : 'transparent'
                  }}
                >
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{mood.emoji}</div>
                  <div className="text-xs font-medium" style={{ color: selectedMood === mood.value ? 'white' : '#475569' }}>
                    {mood.label}
                  </div>
                </button>
              ))}
            </div>

            {/* Optional Note */}
            {selectedMood && (
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-medium" style={{ color: '#1E252B' }}>
                  Want to add a note? (Optional)
                </label>
                <textarea
                  value={moodNote}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 50) {
                      setMoodNote(value);
                    }
                  }}
                  placeholder="How are you feeling? What's on your mind? (max 50 characters)"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                  style={{ borderColor: 'rgba(107, 114, 128, 0.3)' }}
                  rows="3"
                  maxLength={50}
                />
                <div className="text-xs text-right mt-1" style={{ color: '#9CA3AF' }}>
                  {moodNote.length}/50 characters
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-6 sm:mt-8">
            <button
              onClick={handleSubmit}
              disabled={!selectedMood || isSubmitting}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 text-white text-sm sm:text-base rounded-lg sm:rounded-xl font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Mood'
              )}
            </button>
          </div>

          {/* Encouraging Message */}
          <div className="dashboard-card mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl text-center" style={{ background: 'rgba(60, 145, 197, 0.05)' }}>
            <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>
              💙 Taking a moment to check in with yourself is a beautiful act of self-care
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodCheckInModal;
