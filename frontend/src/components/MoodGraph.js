import React from 'react';

const MoodGraph = ({ moodHistory }) => {
  // Get last 7 days of mood data
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Create mood data for each day
  const moodData = last7Days.map(day => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const dayMoods = moodHistory.filter(mood => {
      const moodDate = new Date(mood.date);
      return moodDate >= dayStart && moodDate <= dayEnd;
    });

    return {
      date: day,
      moods: dayMoods,
      latestMood: dayMoods.length > 0 ? dayMoods[dayMoods.length - 1] : null
    };
  });

  // Mood value mapping for graph height
  const getMoodValue = (mood) => {
    const moodValues = {
      'sad': 1,
      'tired': 2,
      'frustrated': 3,
      'anxious': 4,
      'neutral': 5,
      'calm': 6,
      'hopeful': 7,
      'happy': 8
    };
    return moodValues[mood] || 5;
  };

  // Get mood color
  const getMoodColor = (mood) => {
    const moodColors = {
      'sad': '#EF4444',
      'tired': '#F59E0B',
      'frustrated': '#F97316',
      'anxious': '#8B5CF6',
      'neutral': '#6B7280',
      'calm': '#10B981',
      'hopeful': '#3B82F6',
      'happy': '#F59E0B'
    };
    return moodColors[mood] || '#6B7280';
  };

  const maxHeight = 60;
  const barWidth = 28;
  const spacing = 8;

  return (
    <div className="w-full">
      {/* Graph Container */}
      <div className="dashboard-card relative bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/40">
        {/* Title */}
        <div className="flex items-center justify-between mb-8 sm:mb-12 md:mb-16">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold" style={{ color: '#1E252B' }}>Mood Trends</h3>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
            <span className="text-xs sm:text-sm font-medium" style={{ color: '#475569' }}>Last 7 days</span>
          </div>
        </div>

        {/* Graph */}
        <div className="relative">
          {/* Background Grid */}
          <div className="absolute inset-0 flex items-end justify-between">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
              <div
                key={level}
                className="w-full border-t border-gray-200 opacity-30"
                style={{ height: `${(level / 8) * maxHeight}px` }}
              ></div>
            ))}
          </div>

          {/* Mood Bars */}
          <div className="relative flex items-end justify-between h-16 sm:h-20">
            {moodData.map((dayData, index) => {
              const moodValue = dayData.latestMood ? getMoodValue(dayData.latestMood.mood) : 0;
              const barHeight = moodValue > 0 ? (moodValue / 8) * maxHeight : 8;
              const moodColor = dayData.latestMood ? getMoodColor(dayData.latestMood.mood) : '#E5E7EB';

              return (
                <div key={index} className="flex flex-col items-center space-y-1 sm:space-y-2">
                  {/* Mood Bar */}
                  <div className="relative group">
                    <div
                      className="rounded-t-lg transition-all duration-500 hover:scale-105 cursor-pointer"
                      style={{
                        width: barWidth,
                        height: barHeight,
                        background: moodValue > 0 
                          ? `linear-gradient(135deg, ${moodColor} 0%, ${moodColor}CC 100%)`
                          : '#E5E7EB',
                        minHeight: moodValue > 0 ? '8px' : '4px'
                      }}
                    ></div>
                    
                    {/* Mood Emoji on top */}
                    {dayData.latestMood && (
                      <div 
                        className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 text-lg sm:text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        {dayData.latestMood.mood === 'happy' && '😊'}
                        {dayData.latestMood.mood === 'neutral' && '😐'}
                        {dayData.latestMood.mood === 'sad' && '😔'}
                        {dayData.latestMood.mood === 'anxious' && '😰'}
                        {dayData.latestMood.mood === 'tired' && '😴'}
                        {dayData.latestMood.mood === 'calm' && '😌'}
                        {dayData.latestMood.mood === 'frustrated' && '😤'}
                        {dayData.latestMood.mood === 'hopeful' && '🤗'}
                      </div>
                    )}

                    {/* Tooltip */}
                    {dayData.latestMood && (
                      <div className="absolute -top-12 sm:-top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10 max-w-32">
                        {dayData.latestMood.note 
                          ? (dayData.latestMood.note.length > 20 
                              ? `${dayData.latestMood.note.substring(0, 20)}...` 
                              : dayData.latestMood.note)
                          : dayData.latestMood.mood}
                      </div>
                    )}
                  </div>

                  {/* Day Label */}
                  <div className="text-xs font-medium hidden sm:block" style={{ color: '#6B7280' }}>
                    {dayData.date.toLocaleDateString('en', { weekday: 'short' })}
                  </div>
                  <div className="text-xs font-medium sm:hidden" style={{ color: '#6B7280' }}>
                    {dayData.date.toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
                  </div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>
                    {dayData.date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Legend */}
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-center">
          {['happy', 'hopeful', 'calm', 'neutral', 'anxious', 'frustrated', 'tired', 'sad'].map((mood) => (
            <div key={mood} className="flex items-center space-x-1 sm:space-x-2">
              <div 
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                style={{ background: getMoodColor(mood) }}
              ></div>
              <span className="text-xs capitalize" style={{ color: '#6B7280' }}>{mood}</span>
            </div>
          ))}
        </div>

        {/* Encouraging Message */}
        {moodData.some(day => day.latestMood) && (
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg text-center" style={{ background: 'rgba(60, 145, 197, 0.05)' }}>
            <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>
              💙 Your mood patterns help us understand how you're doing. Keep tracking!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodGraph;
