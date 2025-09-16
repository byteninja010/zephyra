import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    nickname: '',
    ageRange: '',
    mood: '',
    moodNote: '',
    goals: [],
    preferredSupport: []
  });
  const [isLoading, setIsLoading] = useState(false);

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

  const goalOptions = [
    'Safe space to talk',
    'Stress management',
    'Daily check-ins',
    'Better sleep',
    'Managing anxiety',
    'Building confidence',
    'Coping with depression',
    'Work-life balance',
    'Relationships',
    'Self-care routine'
  ];

  const supportOptions = [
    'Talking it out',
    'Reflection & journaling',
    'Breathing exercises',
    'Mindfulness',
    'Distraction activities',
    'Physical movement',
    'Creative expression',
    'Music or sounds',
    'Reading or learning',
    'Connecting with others'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelect = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Get user data from localStorage as fallback
      const firebaseUid = localStorage.getItem('firebaseUid') || user?.uid;
      
      if (!firebaseUid) {
        console.error('No user ID available');
        navigate('/auth');
        return;
      }

      // Clean up form data - convert empty strings to null/empty arrays
      const cleanedFormData = {
        nickname: formData.nickname || null,
        ageRange: formData.ageRange || null,
        mood: formData.mood || null,
        moodNote: formData.moodNote || null,
        goals: formData.goals || [],
        preferredSupport: formData.preferredSupport || []
      };
      
      const data = await authService.updateOnboarding(firebaseUid, cleanedFormData);
      
      // Update user data in localStorage
      if (data.user) {
        localStorage.setItem('onboardingCompleted', 'true');
        // Update the user context if available
        if (updateUser) {
          updateUser(data.user);
        }
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      // Still navigate to dashboard even if save fails
      localStorage.setItem('onboardingCompleted', 'true');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const skipOnboarding = async () => {
    setIsLoading(true);
    try {
      // Get user data from localStorage as fallback
      const firebaseUid = localStorage.getItem('firebaseUid') || user?.uid;
      
      if (firebaseUid) {
        // Clean up form data - convert empty strings to null/empty arrays
        const cleanedFormData = {
          nickname: formData.nickname || null,
          ageRange: formData.ageRange || null,
          mood: formData.mood || null,
          moodNote: formData.moodNote || null,
          goals: formData.goals || [],
          preferredSupport: formData.preferredSupport || []
        };
        
        // Save whatever data we have so far
        await authService.updateOnboarding(firebaseUid, cleanedFormData);
      }
      
      localStorage.setItem('onboardingCompleted', 'true');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving partial onboarding data:', error);
      // Still navigate to dashboard even if save fails
      localStorage.setItem('onboardingCompleted', 'true');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}>
        <span className="text-3xl">🌱</span>
      </div>
      
      <h1 className="text-3xl font-bold mb-4" style={{ color: '#1E252B' }}>
        Welcome to Your Safe Space 💙
      </h1>
      
      <div className="p-6 rounded-xl border mb-6" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
        <p className="leading-relaxed" style={{ color: '#475569' }}>
          Before we begin, I'd love to get to know you a little better so I can personalize your experience and support you better. 
          <strong style={{ color: '#3C91C5' }}> Everything is completely optional and confidential</strong> - you can skip any question 
          you don't want to answer and stay completely anonymous. We only use this information to help you.
        </p>
      </div>

      <div className="space-y-4 text-left">
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p style={{ color: '#475569' }}>Your answers are completely confidential and secure</p>
        </div>
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p style={{ color: '#475569' }}>You can change your mind anytime</p>
        </div>
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p style={{ color: '#475569' }}>Skip anything you're not comfortable with</p>
        </div>
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p style={{ color: '#475569' }}>We only use this data to help you better</p>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={skipOnboarding}
          className="px-6 py-3 transition-colors hover:opacity-80 cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-50"
          style={{ color: '#475569' }}
          disabled={isLoading}
        >
          {isLoading ? 'Skipping...' : 'Skip for now'}
        </button>
        <button
          onClick={nextStep}
          className="px-8 py-3 text-white rounded-lg hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
        >
          Let's get started
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1E252B' }}>Tell me about yourself 💙</h2>
        <p style={{ color: '#475569' }}>These questions help me personalize your experience. Everything is optional and completely confidential.</p>
      </div>

      <div className="space-y-8">
        {/* Nickname */}
        <div>
          <label className="block text-lg font-medium mb-3" style={{ color: '#1E252B' }}>
            What should we call you? 💙
          </label>
          <p className="text-sm mb-3" style={{ color: '#475569' }}>If you'd like, we can call you by a name or nickname. You can also stay completely anonymous.</p>
          <input
            type="text"
            value={formData.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            placeholder="Enter a nickname or leave blank to stay anonymous"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ borderColor: 'rgba(107, 114, 128, 0.3)' }}
          />
        </div>

        {/* Age Range */}
        <div>
          <label className="block text-lg font-medium mb-3" style={{ color: '#1E252B' }}>
            If you can tell us your age, we can help better 🌟
          </label>
          <p className="text-sm mb-3" style={{ color: '#475569' }}>This helps us suggest things that feel right for you. You can skip this if you prefer.</p>
          <div className="grid grid-cols-2 gap-3">
            {['13-17', '18-25', '26-35', '36-50', '51+'].map((range) => (
              <button
                key={range}
                onClick={() => handleInputChange('ageRange', formData.ageRange === range ? '' : range)}
                className={`p-3 rounded-lg border-2 hover:opacity-80 ${
                  formData.ageRange === range
                    ? 'text-white'
                    : 'hover:border-gray-300'
                }`}
                style={{
                  borderColor: formData.ageRange === range ? '#3C91C5' : 'rgba(107, 114, 128, 0.3)',
                  background: formData.ageRange === range ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' : 'transparent',
                  color: formData.ageRange === range ? 'white' : '#475569'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Current Mood */}
        <div>
          <label className="block text-lg font-medium mb-3" style={{ color: '#1E252B' }}>
            How are you feeling as you start here today? 💭
          </label>
          <p className="text-sm mb-3" style={{ color: '#475569' }}>We'd love to know how you're feeling right now. This helps us understand where you're starting from.</p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleInputChange('mood', formData.mood === mood.value ? '' : mood.value)}
                className={`p-4 rounded-lg border-2 hover:opacity-80 ${
                  formData.mood === mood.value
                    ? 'text-white'
                    : 'hover:border-gray-300'
                }`}
                style={{
                  borderColor: formData.mood === mood.value ? '#3C91C5' : 'rgba(107, 114, 128, 0.3)',
                  background: formData.mood === mood.value ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' : 'transparent'
                }}
              >
                <div className="text-2xl mb-1">{mood.emoji}</div>
                <div className="text-sm" style={{ color: formData.mood === mood.value ? 'white' : '#475569' }}>{mood.label}</div>
              </button>
            ))}
          </div>
          {formData.mood && (
            <textarea
              value={formData.moodNote}
              onChange={(e) => handleInputChange('moodNote', e.target.value)}
              placeholder="Want to add a note about how you're feeling? (optional)"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ borderColor: 'rgba(107, 114, 128, 0.3)' }}
              rows="3"
            />
          )}
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={prevStep}
          className="px-6 py-3 transition-colors hover:opacity-80"
          style={{ color: '#475569' }}
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={skipOnboarding}
            className="px-6 py-3 transition-colors text-sm hover:opacity-80 cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-50"
            style={{ color: '#475569' }}
            disabled={isLoading}
          >
            {isLoading ? 'Skipping...' : 'Skip All Questions'}
          </button>
          <button
            onClick={nextStep}
            className="px-8 py-3 text-white rounded-lg hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1E252B' }}>What brings you here? 🤗</h2>
        <p style={{ color: '#475569' }}>Select all that apply - this helps me understand how to support you. Everything is completely confidential.</p>
      </div>

      <div className="space-y-8">
        {/* Goals */}
        <div>
          <label className="block text-lg font-medium mb-4" style={{ color: '#1E252B' }}>
            What brings you here? For example, do you want a safe space to talk, ways to manage stress, or just gentle check-ins? 💭
          </label>
          <p className="text-sm mb-4" style={{ color: '#475569' }}>You can select multiple options or skip this entirely. We're here to help however you need.</p>
          <div className="grid grid-cols-2 gap-3">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                onClick={() => handleMultiSelect('goals', goal)}
                className={`p-3 rounded-lg border-2 text-left hover:opacity-80 ${
                  formData.goals.includes(goal)
                    ? 'text-white'
                    : 'hover:border-gray-300'
                }`}
                style={{
                  borderColor: formData.goals.includes(goal) ? '#3C91C5' : 'rgba(107, 114, 128, 0.3)',
                  background: formData.goals.includes(goal) ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' : 'transparent',
                  color: formData.goals.includes(goal) ? 'white' : '#475569'
                }}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Support Preferences */}
        <div>
          <label className="block text-lg font-medium mb-4" style={{ color: '#1E252B' }}>
            When you're having a tough time, what usually helps you most? 🤝
          </label>
          <p className="text-sm mb-4" style={{ color: '#475569' }}>This helps us know how to support you when you need it most. You can skip this if you prefer.</p>
          <div className="grid grid-cols-2 gap-3">
            {supportOptions.map((support) => (
              <button
                key={support}
                onClick={() => handleMultiSelect('preferredSupport', support)}
                className={`p-3 rounded-lg border-2 text-left hover:opacity-80 ${
                  formData.preferredSupport.includes(support)
                    ? 'text-white'
                    : 'hover:border-gray-300'
                }`}
                style={{
                  borderColor: formData.preferredSupport.includes(support) ? '#3C91C5' : 'rgba(107, 114, 128, 0.3)',
                  background: formData.preferredSupport.includes(support) ? 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' : 'transparent',
                  color: formData.preferredSupport.includes(support) ? 'white' : '#475569'
                }}
              >
                {support}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={prevStep}
          className="px-6 py-3 transition-colors hover:opacity-80"
          style={{ color: '#475569' }}
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={skipOnboarding}
            className="px-6 py-3 transition-colors text-sm hover:opacity-80 cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-50"
            style={{ color: '#475569' }}
            disabled={isLoading}
          >
            {isLoading ? 'Skipping...' : 'Skip All Questions'}
          </button>
          <button
            onClick={nextStep}
            className="px-8 py-3 text-white rounded-lg hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}>
        <span className="text-3xl">🎉</span>
      </div>
      
      <h1 className="text-3xl font-bold mb-4" style={{ color: '#1E252B' }}>
        You're all set! 💙
      </h1>
      
      <div className="p-6 rounded-xl border mb-6" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
        <p style={{ color: '#475569' }}>
          Thank you for sharing a bit about yourself. Your personalized dashboard is ready, and I'll use this 
          information to provide you with the most helpful resources and support. Everything you've shared is completely confidential.
        </p>
      </div>

      <div className="p-6 rounded-xl border mb-6" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
        <p className="text-sm" style={{ color: '#475569' }}>
          Remember: Your recovery code from when you signed up is the only way to access your account if you lose access. 
          Keep it safe and confidential.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="px-8 py-4 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
      >
        {isLoading ? 'Setting up your dashboard...' : 'Go to Dashboard'}
      </button>
    </div>
  );


  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-25" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-30" style={{ background: 'linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)' }}></div>
        <div className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: '#475569' }}>Step {currentStep} of 4</span>
              <span className="text-sm font-medium" style={{ color: '#475569' }}>{Math.round((currentStep / 4) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: 'rgba(107, 114, 128, 0.2)' }}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(currentStep / 4) * 100}%`,
                  background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
