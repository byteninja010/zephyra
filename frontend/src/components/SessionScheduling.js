import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import sessionService from '../services/sessionService';

const SessionScheduling = ({ isOpen, onClose }) => {
  const [schedule, setSchedule] = useState({
    frequency: 'daily',
    time: '09:00',
    days: ['monday'],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrentSchedule();
  }, []);

  const loadCurrentSchedule = async () => {
    try {
      const response = await sessionService.getSessionSchedule();
      if (response.success && response.session) {
        setCurrentSchedule(response.session);
      }
    } catch (error) {
      console.error('Error loading current schedule:', error);
    }
  };

  const handleFrequencyChange = (frequency) => {
    setSchedule(prev => ({
      ...prev,
      frequency,
      days: frequency === 'daily' ? [] : frequency === 'weekly' ? ['monday'] : []
    }));
  };

  const handleDayToggle = (day) => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await sessionService.createSessionSchedule(schedule);
      if (response.success) {
        setCurrentSchedule(response.session);
        // Close modal after successful creation
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create session schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!currentSchedule) return;
    
    try {
      const response = await sessionService.cancelSession(currentSchedule.sessionId);
      if (response.success) {
        setCurrentSchedule(null);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to cancel session schedule');
    }
  };

  const formatNextSession = (nextSessionDate) => {
    const date = new Date(nextSessionDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString();
  };

  const getFrequencyText = (frequency) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  const getDaysText = (days) => {
    if (days.length === 0) return '';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) {
      return 'Weekdays';
    }
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="dashboard-card bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#1E252B' }}>
            Schedule Your Sessions
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 ml-2"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {currentSchedule ? (
          // Show current schedule
          <div className="space-y-4 sm:space-y-6">
            <div className="dashboard-card p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 border-green-200 bg-green-50">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <CheckCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-green-800">
                  Active Session Schedule
                </h3>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-2 flex-wrap">
                  <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base text-green-800">
                    {getFrequencyText(currentSchedule.schedule.frequency)}
                  </span>
                  {currentSchedule.schedule.days.length > 0 && (
                    <span className="text-xs sm:text-sm text-green-600">
                      ({getDaysText(currentSchedule.schedule.days)})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-green-800">
                    {currentSchedule.schedule.time}
                  </span>
                </div>
                
                <div className="text-xs sm:text-sm md:text-base text-green-700">
                  <strong>Next session:</strong> {formatNextSession(currentSchedule.nextSessionDate)}
                </div>
              </div>
            </div>

            <div className="flex space-x-2 sm:space-x-3">
              <button
                onClick={handleCancelSchedule}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-medium text-white transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Cancel Schedule</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          // Show scheduling form
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
                <p className="text-red-700 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            {/* Frequency Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3" style={{ color: '#475569' }}>
                How often would you like sessions?
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {['daily', 'weekly', 'monthly'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => handleFrequencyChange(freq)}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      schedule.frequency === freq
                        ? 'text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      background: schedule.frequency === freq
                        ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                        : 'rgba(229, 231, 235, 0.5)'
                    }}
                  >
                    {getFrequencyText(freq)}
                  </button>
                ))}
              </div>
            </div>

            {/* Days Selection (for weekly) */}
            {schedule.frequency === 'weekly' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3" style={{ color: '#475569' }}>
                  Which days?
                </label>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`p-2 sm:p-3 rounded-md sm:rounded-lg text-xs font-medium transition-all ${
                        schedule.days.includes(day)
                          ? 'text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      style={{
                        background: schedule.days.includes(day)
                          ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                          : 'rgba(229, 231, 235, 0.5)'
                      }}
                    >
                      {day.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3" style={{ color: '#475569' }}>
                What time?
              </label>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: '#64748B' }} />
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule(prev => ({ ...prev, time: e.target.value }))}
                  className="px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex-1"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-medium transition-all duration-300 hover:bg-gray-100"
                style={{ color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || (schedule.frequency === 'weekly' && schedule.days.length === 0)}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-medium text-white transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Create Schedule</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SessionScheduling;
