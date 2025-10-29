import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const StreakTracker = ({ isOpen, onClose }) => {
  const [streaks, setStreaks] = useState({
    moodCheckIns: 0,
    therapyVisits: 0,
    breathingExercises: 0,
    reflections: 0
  });
  const [history, setHistory] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    // Load activity history from backend
    const loadActivityHistory = async () => {
      try {
        const firebaseUid = localStorage.getItem('firebaseUid');
        if (firebaseUid) {
          const response = await authService.getActivityHistory(firebaseUid);
          if (response.success) {
            setHistory(response.activityHistory || []);
            calculateStreaksFromHistory(response.activityHistory || []);
          }
        }
      } catch (error) {
        console.error('Error loading activity history:', error);
        // Fallback to localStorage if backend fails
        const savedHistory = localStorage.getItem('streakHistory');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
          calculateStreaks();
        }
      }
    };

    if (isOpen) {
      loadActivityHistory();
    }
  }, [isOpen]);

  const calculateStreaksFromHistory = (activityHistory) => {
    const today = new Date().toDateString();
    
    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Calculate current streak (consecutive days)
    for (let i = activityHistory.length - 1; i >= 0; i--) {
      const entry = activityHistory[i];
      const entryDate = new Date(entry.date).toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (entryDate === today || entryDate === yesterdayStr) {
        current++;
        tempStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    tempStreak = 0;
    for (let i = 0; i < activityHistory.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(activityHistory[i - 1].date);
        const currentDate = new Date(activityHistory[i].date);
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longest = Math.max(longest, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longest = Math.max(longest, tempStreak);

    setCurrentStreak(current);
    setLongestStreak(longest);
  };

  const calculateStreaks = () => {
    const today = new Date().toDateString();
    const streakHistory = JSON.parse(localStorage.getItem('streakHistory') || '[]');
    calculateStreaksFromHistory(streakHistory);
  };

  const addActivity = async (activityType) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      if (!firebaseUid) {
        alert('User not found. Please sign in again.');
        return;
      }

      const response = await authService.logActivity(firebaseUid, activityType);
      
      if (response.success) {
        setHistory(response.activityHistory || []);
        calculateStreaksFromHistory(response.activityHistory || []);
        
        // Update local streaks count
        const newStreaks = { ...streaks };
        newStreaks[activityType] = (newStreaks[activityType] || 0) + 1;
        setStreaks(newStreaks);
      } else {
        alert('Failed to log activity. Please try again.');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      alert('Failed to log activity. Please try again.');
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      moodCheckIns: '😊',
      therapyVisits: '💬',
      breathingExercises: '🫁',
      reflections: '📝'
    };
    return icons[type] || '⭐';
  };

  const getActivityName = (type) => {
    const names = {
      moodCheckIns: 'Mood Check-ins',
      therapyVisits: 'Therapy Visits',
      breathingExercises: 'Breathing Exercises',
      reflections: 'Reflections'
    };
    return names[type] || type;
  };

  const getActivityColor = (type) => {
    const colors = {
      moodCheckIns: '#3B82F6',
      therapyVisits: '#8B5CF6',
      breathingExercises: '#10B981',
      reflections: '#F59E0B'
    };
    return colors[type] || '#6B7280';
  };

  const getRecentActivity = () => {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    return history.filter(entry => 
      entry.dateStr === today || entry.dateStr === yesterdayStr
    ).slice(0, 5);
  };

  const getWeeklyStats = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekHistory = history.filter(entry => 
      new Date(entry.date) >= weekAgo
    );

    const stats = {
      moodCheckIns: 0,
      therapyVisits: 0,
      breathingExercises: 0,
      reflections: 0
    };

    weekHistory.forEach(entry => {
      stats[entry.type] = (stats[entry.type] || 0) + 1;
    });

    return stats;
  };

  if (!isOpen) return null;

  const weeklyStats = getWeeklyStats();
  const recentActivity = getRecentActivity();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#1E252B' }}>
            Streak Tracker
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Streak Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 rounded-lg sm:rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)', color: 'white' }}>
            <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{currentStreak}</div>
            <div className="text-xs sm:text-sm opacity-90">Current Streak</div>
            <div className="text-xs opacity-75 mt-1">Days in a row</div>
          </div>
          <div className="p-4 sm:p-6 rounded-lg sm:rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#10B981' }}>{longestStreak}</div>
            <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>Longest Streak</div>
            <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Personal best</div>
          </div>
          <div className="p-4 sm:p-6 rounded-lg sm:rounded-xl text-center" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#F59E0B' }}>{history.length}</div>
            <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>Total Activities</div>
            <div className="text-xs mt-1" style={{ color: '#6B7280' }}>All time</div>
          </div>
        </div>

        {/* Activity Buttons */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#1E252B' }}>
            Log Activity
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {Object.keys(streaks).map((activity) => (
              <button
                key={activity}
                onClick={() => addActivity(activity)}
                className="p-3 sm:p-4 rounded-lg sm:rounded-xl text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                style={{
                  background: `linear-gradient(135deg, ${getActivityColor(activity)}20, ${getActivityColor(activity)}10)`,
                  border: `2px solid ${getActivityColor(activity)}30`
                }}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{getActivityIcon(activity)}</div>
                <div className="text-xs sm:text-sm font-medium" style={{ color: '#1E252B' }}>
                  {getActivityName(activity)}
                </div>
                <div className="text-xs mt-1" style={{ color: '#475569' }}>
                  {streaks[activity]} total
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#1E252B' }}>
            This Week
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {Object.keys(weeklyStats).map((activity) => (
              <div
                key={activity}
                className="p-3 sm:p-4 rounded-lg text-center"
                style={{ background: 'rgba(229, 231, 235, 0.5)' }}
              >
                <div className="text-xl sm:text-2xl mb-1">{getActivityIcon(activity)}</div>
                <div className="text-base sm:text-lg font-bold" style={{ color: getActivityColor(activity) }}>
                  {weeklyStats[activity]}
                </div>
                <div className="text-xs" style={{ color: '#475569' }}>
                  {getActivityName(activity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#1E252B' }}>
            Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#3C91C5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm px-4" style={{ color: '#475569' }}>No recent activity. Start logging your wellness activities!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg"
                  style={{ background: 'rgba(229, 231, 235, 0.3)' }}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className="text-base sm:text-xl">{getActivityIcon(entry.type)}</span>
                    <div>
                      <div className="text-xs sm:text-sm font-medium" style={{ color: '#1E252B' }}>
                        {getActivityName(entry.type)}
                      </div>
                      <div className="text-xs" style={{ color: '#475569' }}>
                        {new Date(entry.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                    style={{ background: getActivityColor(entry.type) }}
                  ></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Motivational Message */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-lg text-center" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
          <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>
            {currentStreak > 0 
              ? `Keep it up! You're on a ${currentStreak}-day streak! 🔥`
              : "Start your wellness journey today! Every small step counts. 💪"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default StreakTracker;
