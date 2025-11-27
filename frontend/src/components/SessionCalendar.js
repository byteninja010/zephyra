import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const SessionCalendar = ({ currentSchedule, upcomingSessions = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessionDates, setSessionDates] = useState(new Set());

  // Calculate all upcoming session dates from current schedule
  useEffect(() => {
    const dates = new Set();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 2); // Show 2 months ahead

    // Calculate dates based on schedule if available
    if (currentSchedule && currentSchedule.schedule) {
      const schedule = currentSchedule.schedule;
      
      // Calculate dates based on schedule
      const calculateDates = () => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const [hours, minutes] = schedule.time.split(':').map(Number);
        
        // Start from the next session date if available, otherwise calculate from now
        let checkDate = currentSchedule.nextSessionDate 
          ? new Date(currentSchedule.nextSessionDate)
          : new Date(now);
        
        checkDate.setHours(hours, minutes, 0, 0);

        // If the date has passed, move to the next occurrence
        if (checkDate <= now) {
          if (schedule.frequency === 'daily') {
            checkDate.setDate(checkDate.getDate() + 1);
          } else if (schedule.frequency === 'weekly') {
            checkDate.setDate(checkDate.getDate() + 1);
          } else if (schedule.frequency === 'monthly') {
            checkDate.setMonth(checkDate.getMonth() + 1);
          }
        }

        // For monthly, get the day of month from nextSessionDate or use today
        let monthlyDay = null;
        if (schedule.frequency === 'monthly' && currentSchedule.nextSessionDate) {
          monthlyDay = new Date(currentSchedule.nextSessionDate).getDate();
        } else if (schedule.frequency === 'monthly') {
          monthlyDay = now.getDate();
        }

        while (checkDate <= endDate) {
          let shouldInclude = false;

          switch (schedule.frequency) {
            case 'daily':
              shouldInclude = true;
              break;
            case 'weekly':
              const dayName = dayNames[checkDate.getDay()];
              shouldInclude = schedule.days.includes(dayName);
              break;
            case 'monthly':
              // For monthly, include the same day of month
              shouldInclude = monthlyDay !== null && checkDate.getDate() === monthlyDay;
              break;
          }

          if (shouldInclude) {
            const dateKey = formatDateKey(checkDate);
            dates.add(dateKey);
          }

          // Move to next occurrence
          if (schedule.frequency === 'daily') {
            checkDate.setDate(checkDate.getDate() + 1);
          } else if (schedule.frequency === 'weekly') {
            checkDate.setDate(checkDate.getDate() + 1);
          } else if (schedule.frequency === 'monthly') {
            checkDate.setMonth(checkDate.getMonth() + 1);
          }
        }
      };

      calculateDates();
    }

    // Also add dates from upcoming sessions
    upcomingSessions.forEach(session => {
      if (session.nextSessionDate) {
        const date = new Date(session.nextSessionDate);
        const dateKey = formatDateKey(date);
        dates.add(dateKey);
      }
    });

    setSessionDates(dates);
  }, [currentSchedule, upcomingSessions]);

  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const monthYear = useMemo(() => {
    const { year, month } = getDaysInMonth(currentDate);
    return {
      month: currentDate.toLocaleDateString('en-US', { month: 'long' }),
      year: year
    };
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      const hasSession = sessionDates.has(dateKey);
      const isToday = isCurrentMonth && day === today.getDate();
      const isPast = date < today && !isToday;

      days.push({
        day,
        date,
        dateKey,
        hasSession,
        isToday,
        isPast
      });
    }

    return days;
  }, [currentDate, sessionDates]);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-1 px-0.5 flex-shrink-0" style={{ height: '20px' }}>
        <button
          onClick={() => navigateMonth('prev')}
          className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="w-3 h-3 text-gray-600" />
        </button>
        <h3 className="text-xs font-semibold flex-shrink-0" style={{ color: '#1E252B' }}>
          {monthYear.month.substring(0, 3)} {monthYear.year}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Next month"
        >
          <ChevronRightIcon className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5 flex-shrink-0" style={{ height: '16px' }}>
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center text-[9px] font-medium flex items-center justify-center"
            style={{ color: '#64748B' }}
          >
            {day.substring(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 flex-1 min-h-0" style={{ gridAutoRows: '1fr' }}>
        {calendarDays.map((dayData, index) => {
          if (dayData === null) {
            return <div key={`empty-${index}`} className="min-h-0" />;
          }

          const { day, hasSession, isToday, isPast } = dayData;

          return (
            <div
              key={day}
              className={`
                flex flex-col items-center justify-center rounded
                transition-all duration-200 cursor-pointer
                ${isToday ? 'ring-1 ring-blue-500' : ''}
                ${isPast ? 'opacity-50' : 'hover:bg-gray-50'}
              `}
              style={{
                backgroundColor: isToday ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                minHeight: 0
              }}
            >
              <span
                className={`text-[10px] font-medium leading-none ${
                  isToday ? 'text-blue-600 font-bold' : isPast ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                {day}
              </span>
              {hasSession && (
                <div className="mt-0.5 flex gap-0.5">
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-1 pt-1 border-t border-gray-200 flex items-center justify-center gap-1.5 text-[9px] flex-shrink-0" style={{ height: '20px' }}>
        <div className="flex items-center gap-1">
          <div
            className="w-1 h-1 rounded-full flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
            }}
          />
          <span style={{ color: '#64748B' }}>Session</span>
        </div>
      </div>
    </div>
  );
};

export default SessionCalendar;

