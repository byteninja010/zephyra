import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const BreathingExercise = ({ isOpen, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('inhale');
  const [timeLeft, setTimeLeft] = useState(4);
  const [cycle, setCycle] = useState(0);
  const [totalCycles] = useState(4);
  const [breathPattern, setBreathPattern] = useState('4-4-4-4'); // inhale-hold-exhale-hold

  const patterns = {
    '4-4-4-4': { inhale: 4, hold1: 4, exhale: 4, hold2: 4, name: 'Box Breathing' },
    '4-7-8': { inhale: 4, hold1: 7, exhale: 8, hold2: 0, name: '4-7-8 Technique' },
    '5-5-5': { inhale: 5, hold1: 5, exhale: 5, hold2: 0, name: 'Equal Breathing' },
    '6-2-8': { inhale: 6, hold1: 2, exhale: 8, hold2: 0, name: 'Calming Breath' }
  };

  const phases = ['inhale', 'hold1', 'exhale', 'hold2'];
  const phaseLabels = {
    inhale: 'Breathe In',
    hold1: 'Hold',
    exhale: 'Breathe Out',
    hold2: 'Pause'
  };

  const phaseColors = {
    inhale: '#3C91C5',
    hold1: '#5A7D95',
    exhale: '#77A3B8',
    hold2: '#A8DADC'
  };

  useEffect(() => {
    let interval;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      const currentPhaseIndex = phases.indexOf(currentPhase);
      const nextPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      const nextPhase = phases[nextPhaseIndex];
      
      if (nextPhaseIndex === 0) {
        // Completed one cycle
        setCycle(cycle + 1);
        if (cycle + 1 >= totalCycles) {
          setIsActive(false);
          setCycle(0);
          setCurrentPhase('inhale');
          setTimeLeft(patterns[breathPattern].inhale);
          
          // Log completed breathing exercise
          logBreathingExercise();
          return;
        }
      }
      
      setCurrentPhase(nextPhase);
      setTimeLeft(patterns[breathPattern][nextPhase]);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, currentPhase, cycle, breathPattern, totalCycles]);

  const startExercise = () => {
    setIsActive(true);
    if (cycle === 0) {
      setCurrentPhase('inhale');
      setTimeLeft(patterns[breathPattern].inhale);
    }
  };

  const pauseExercise = () => {
    setIsActive(false);
  };

  const resumeExercise = () => {
    setIsActive(true);
  };

  const resetExercise = () => {
    setIsActive(false);
    setCycle(0);
    setCurrentPhase('inhale');
    setTimeLeft(patterns[breathPattern].inhale);
  };

  const logBreathingExercise = async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      if (firebaseUid) {
        await authService.logActivity(firebaseUid, 'breathingExercise');
      }
    } catch (error) {
      console.error('Error logging breathing exercise:', error);
    }
  };

  const getCircleSize = () => {
    if (currentPhase === 'inhale') {
      return 200 + (timeLeft / patterns[breathPattern].inhale) * 100;
    } else if (currentPhase === 'exhale') {
      return 200 + (timeLeft / patterns[breathPattern].exhale) * 100;
    } else {
      return 300; // Hold phases
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="dashboard-card bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[90vh] p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#1E252B' }}>
            Breathing Exercise
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

        {/* Pattern Selection */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3" style={{ color: '#475569' }}>
            Choose Breathing Pattern:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(patterns).map(([key, pattern]) => (
              <button
                key={key}
                onClick={() => setBreathPattern(key)}
                className={`dashboard-card p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  breathPattern === key
                    ? 'text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{
                  background: breathPattern === key
                    ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                    : 'rgba(229, 231, 235, 0.5)'
                }}
              >
                {pattern.name}
              </button>
            ))}
          </div>
        </div>

        {/* Breathing Circle */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="relative mb-4 sm:mb-6">
            <div
              className="rounded-full border-4 transition-all duration-1000 ease-in-out flex items-center justify-center"
              style={{
                width: Math.min(getCircleSize(), window.innerWidth > 640 ? getCircleSize() : getCircleSize() * 0.7),
                height: Math.min(getCircleSize(), window.innerWidth > 640 ? getCircleSize() : getCircleSize() * 0.7),
                borderColor: phaseColors[currentPhase],
                background: `linear-gradient(135deg, ${phaseColors[currentPhase]}20, ${phaseColors[currentPhase]}10)`
              }}
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2" style={{ color: phaseColors[currentPhase] }}>
                  {timeLeft}
                </div>
                <div className="text-base sm:text-lg font-medium" style={{ color: '#475569' }}>
                  {phaseLabels[currentPhase]}
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="text-center">
            <div className="text-xs sm:text-sm" style={{ color: '#475569' }}>
              Cycle {cycle + 1} of {totalCycles}
            </div>
            <div className="w-24 sm:w-32 h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((cycle + (4 - phases.indexOf(currentPhase)) / 4) / totalCycles) * 100}%`,
                  background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex space-x-2 sm:space-x-3">
          {!isActive && cycle === 0 ? (
            <button
              onClick={startExercise}
              className="flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-white text-sm sm:text-base font-medium transition-all duration-300 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
            >
              Start Exercise
            </button>
          ) : !isActive && cycle > 0 ? (
            <button
              onClick={resumeExercise}
              className="flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-white text-sm sm:text-base font-medium transition-all duration-300 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              Resume
            </button>
          ) : (
            <button
              onClick={pauseExercise}
              className="flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-white text-sm sm:text-base font-medium transition-all duration-300 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            >
              Pause
            </button>
          )}
          <button
            onClick={resetExercise}
            className="px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-300 hover:shadow-lg"
            style={{ 
              background: 'rgba(229, 231, 235, 0.5)',
              color: '#475569'
            }}
          >
            Reset
          </button>
        </div>

        {/* Instructions */}
        <div className="dashboard-card mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(60, 145, 197, 0.1)' }}>
          <h3 className="text-sm sm:text-base font-medium mb-2" style={{ color: '#1E252B' }}>Instructions:</h3>
          <ul className="text-xs sm:text-sm space-y-1" style={{ color: '#475569' }}>
            <li>• Find a comfortable position</li>
            <li>• Close your eyes or focus on the circle</li>
            <li>• Follow the breathing pattern</li>
            <li>• Stay relaxed and focused</li>
          </ul>
        </div>
        </div>
      </div>
    </div>
  );
};

export default BreathingExercise;
