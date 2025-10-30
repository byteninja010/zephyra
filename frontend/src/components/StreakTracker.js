import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

/**
 * StreakTracker Component
 * 
 * Tracks and displays user wellness activities across the entire app.
 * 
 * Activity Types:
 * - moodCheckIn: Logged when user submits a mood check-in
 * - therapyVisit: Logged when user completes a therapy session
 * - breathingExercise: Logged when user completes a breathing exercise
 * - reflection: Logged when user creates a reflection entry
 * - mindCanvas: Logged when user creates and analyzes a drawing
 * - forumPost: Logged when user successfully posts in the support forum
 * - chatSession: Logged once per chat session per day (prevents multiple message spam)
 * 
 * Logging Strategy:
 * - Most activities: Log once per occurrence
 * - Chat sessions: Log once per session per day (balanced with other activities)
 * - All logging is non-blocking and won't interrupt user experience
 * 
 * To add a new activity type:
 * 1. Add it to the streaks state below
 * 2. Add it to activityCounts in calculateStreaksFromHistory()
 * 3. Add it to stats in getWeeklyStats()
 * 4. Add icon, name, and color in the helper functions below
 * 5. Ensure the activity is logged via authService.logActivity() in the respective component
 * 6. Consider if it should be logged once per day or per occurrence
 */
const StreakTracker = ({ isOpen, onClose }) => {
  // Complete list of all trackable activities in the app
  const [streaks, setStreaks] = useState({
    moodCheckIn: 0,
    therapyVisit: 0,
    breathingExercise: 0,
    reflection: 0,
    mindCanvas: 0,
    forumPost: 0,
    chatSession: 0
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
          const parsedHistory = JSON.parse(savedHistory);
          setHistory(parsedHistory);
          calculateStreaksFromHistory(parsedHistory);
        }
      }
    };

    if (isOpen) {
      loadActivityHistory();
    }
  }, [isOpen]);

  const calculateStreaksFromHistory = (activityHistory) => {
    if (!activityHistory || activityHistory.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }

    // Extract unique days (format: YYYY-MM-DD) from activity history
    const uniqueDaysSet = new Set();
    activityHistory.forEach(entry => {
      const date = new Date(entry.date);
      // Normalize to start of day to avoid timezone issues
      const dateStr = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
      uniqueDaysSet.add(dateStr);
    });

    // Convert to array and sort chronologically (oldest to newest)
    const uniqueDays = Array.from(uniqueDaysSet).sort();

    if (uniqueDays.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }

    // Calculate current streak (consecutive days ending today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = 0;
    const mostRecentDay = uniqueDays[uniqueDays.length - 1];
    
    // Only count as current streak if most recent activity was today or yesterday
    if (mostRecentDay === todayStr || mostRecentDay === yesterdayStr) {
      currentStreak = 1;
      
      // Count backwards through consecutive days
      for (let i = uniqueDays.length - 2; i >= 0; i--) {
        const currentDay = new Date(uniqueDays[i + 1]);
        const prevDay = new Date(uniqueDays[i]);
        
        const diffTime = currentDay - prevDay;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak (any consecutive days in history)
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
      const currentDay = new Date(uniqueDays[i]);
      const prevDay = new Date(uniqueDays[i - 1]);
      
      const diffTime = currentDay - prevDay;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    setCurrentStreak(currentStreak);
    setLongestStreak(longestStreak);

    // Count all activity types - handles both known and unknown activities
    const activityCounts = {
      moodCheckIn: 0,
      therapyVisit: 0,
      breathingExercise: 0,
      reflection: 0,
      mindCanvas: 0,
      forumPost: 0,
      chatSession: 0
    };

    // Count activities, safely handling any activity type
    activityHistory.forEach(entry => {
      if (entry.type && activityCounts.hasOwnProperty(entry.type)) {
        activityCounts[entry.type]++;
      }
      // Log unrecognized activity types for debugging (helps identify missing activities)
      else if (entry.type) {
        console.info(`Unrecognized activity type: ${entry.type}`);
      }
    });

    setStreaks(activityCounts);
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
        // Recalculate all streaks and activity counts from the updated history
        calculateStreaksFromHistory(response.activityHistory || []);
      } else {
        alert('Failed to log activity. Please try again.');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      alert('Failed to log activity. Please try again.');
    }
  };

  // Get icon for each activity type with fallback
  const getActivityIcon = (type) => {
    const icons = {
      moodCheckIn: '😊',
      therapyVisit: '💬',
      breathingExercise: '🫁',
      reflection: '📝',
      mindCanvas: '🎨',
      forumPost: '💭',
      chatSession: '🤖'
    };
    return icons[type] || '⭐';
  };

  // Get user-friendly name for each activity type with fallback
  const getActivityName = (type) => {
    const names = {
      moodCheckIn: 'Mood Check-ins',
      therapyVisit: 'Therapy Visits',
      breathingExercise: 'Breathing Exercises',
      reflection: 'Reflections',
      mindCanvas: 'Mind Canvas',
      forumPost: 'Forum Posts',
      chatSession: 'Chat Sessions'
    };
    return names[type] || type.replace(/([A-Z])/g, ' $1').trim();
  };

  // Get color for each activity type with fallback
  const getActivityColor = (type) => {
    const colors = {
      moodCheckIn: '#3B82F6',      // Blue
      therapyVisit: '#8B5CF6',     // Purple
      breathingExercise: '#10B981', // Green
      reflection: '#F59E0B',       // Amber
      mindCanvas: '#EC4899',       // Pink
      forumPost: '#06B6D4',        // Cyan
      chatSession: '#6366F1'       // Indigo
    };
    return colors[type] || '#6B7280';
  };

  const getRecentActivity = () => {
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    return history
      .filter(entry => new Date(entry.date) >= twoDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  };

  // Calculate weekly statistics for all activity types
  const getWeeklyStats = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekHistory = history.filter(entry => 
      new Date(entry.date) >= weekAgo
    );

    const stats = {
      moodCheckIn: 0,
      therapyVisit: 0,
      breathingExercise: 0,
      reflection: 0,
      mindCanvas: 0,
      forumPost: 0,
      chatSession: 0
    };

    // Count activities for the week
    weekHistory.forEach(entry => {
      if (entry.type && stats.hasOwnProperty(entry.type)) {
        stats[entry.type]++;
      }
    });

    return stats;
  };

  if (!isOpen) return null;

  const weeklyStats = getWeeklyStats();
  const recentActivity = getRecentActivity();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[90vh] p-4 sm:p-6 md:p-8">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
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
              {recentActivity.map((entry, index) => (
                <div
                  key={entry._id || entry.id || index}
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
                        {new Date(entry.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
    </div>
  );
};

export default StreakTracker;
