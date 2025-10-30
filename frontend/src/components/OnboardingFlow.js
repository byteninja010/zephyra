import React, { useState } from 'react';
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
    preferredSupport: [],
    emergencyContactEmail: ''
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
        preferredSupport: formData.preferredSupport || [],
        emergencyContactEmail: formData.emergencyContactEmail || null
      };
      
      const data = await authService.updateOnboarding(firebaseUid, cleanedFormData);
      
      // Update user data in localStorage
      if (data.user) {
        localStorage.setItem('onboardingCompleted', 'true');
        
        // If user provided mood during onboarding, set today as mood check date
        if (formData.mood) {
          const today = new Date().toDateString();
          localStorage.setItem('lastMoodCheckDate', today);
        }
        
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
          preferredSupport: formData.preferredSupport || [],
          emergencyContactEmail: formData.emergencyContactEmail || null
        };
        
        // Save whatever data we have so far
        await authService.updateOnboarding(firebaseUid, cleanedFormData);
      }
      
      localStorage.setItem('onboardingCompleted', 'true');
      
      // If user provided mood during onboarding, set today as mood check date
      if (formData.mood) {
        const today = new Date().toDateString();
        localStorage.setItem('lastMoodCheckDate', today);
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving partial onboarding data:', error);
      // Still navigate to dashboard even if save fails
      localStorage.setItem('onboardingCompleted', 'true');
      
      // If user provided mood during onboarding, set today as mood check date
      if (formData.mood) {
        const today = new Date().toDateString();
        localStorage.setItem('lastMoodCheckDate', today);
      }
      
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}>
        <span className="text-2xl sm:text-3xl">🌱</span>
      </div>
      
      <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 px-2" style={{ color: '#1E252B' }}>
        Welcome to Your Safe Space 💙
      </h1>
      
      <div className="dashboard-card p-4 sm:p-6 rounded-lg sm:rounded-xl border mb-4 sm:mb-6" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#475569' }}>
          Before we begin, I'd love to get to know you a little better so I can personalize your experience and support you better. 
          <strong style={{ color: '#3C91C5' }}> Everything is completely optional and confidential</strong> - you can skip any question 
          you don't want to answer and stay completely anonymous. We only use this information to help you.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4 text-left">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <span className="text-green-500 text-lg sm:text-xl flex-shrink-0">✓</span>
          <p className="text-sm sm:text-base" style={{ color: '#475569' }}>Your answers are completely confidential and secure</p>
        </div>
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>You can change your mind anytime</p>
        </div>
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>Skip anything you're not comfortable with</p>
        </div>
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✓</span>
          <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>We only use this data to help you better</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={skipOnboarding}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base transition-colors hover:opacity-80 cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-50"
          style={{ color: '#475569' }}
          disabled={isLoading}
        >
          {isLoading ? 'Skipping...' : 'Skip for now'}
        </button>
        <button
          onClick={nextStep}
          className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
        >
          Let's get started
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 px-2" style={{ color: '#1E252B' }}>Tell me about yourself 💙</h2>
        <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>These questions help me personalize your experience. Everything is optional and completely confidential.</p>
      </div>

      <div className="space-y-8">
        {/* Nickname */}
        <div>
          <label className="block text-base sm:text-lg font-medium mb-2 sm:mb-3" style={{ color: '#1E252B' }}>
            What should we call you? 💙
          </label>
          <p className="text-sm mb-3" style={{ color: '#475569' }}>If you'd like, we can call you by a name or nickname. You can also stay completely anonymous.</p>
          <input
            type="text"
            value={formData.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            placeholder="Enter a nickname or leave blank to stay anonymous"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ borderColor: 'rgba(107, 114, 128, 0.3)' }}
          />
        </div>

        {/* Age Range */}
        <div>
          <label className="block text-base sm:text-lg font-medium mb-2 sm:mb-3" style={{ color: '#1E252B' }}>
            If you can tell us your age, we can help better 🌟
          </label>
          <p className="text-sm mb-3" style={{ color: '#475569' }}>This helps us suggest things that feel right for you. You can skip this if you prefer.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {['13-17', '18-25', '26-35', '36-50', '51+'].map((range) => (
              <button
                key={range}
                onClick={() => handleInputChange('ageRange', formData.ageRange === range ? '' : range)}
                className={`dashboard-card p-3 rounded-lg border-2 hover:opacity-80 ${
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
          <label className="block text-base sm:text-lg font-medium mb-2 sm:mb-3" style={{ color: '#1E252B' }}>
            How are you feeling as you start here today? 💭
          </label>
          <p className="text-sm mb-3" style={{ color: '#475569' }}>We'd love to know how you're feeling right now. This helps us understand where you're starting from.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleInputChange('mood', formData.mood === mood.value ? '' : mood.value)}
                className={`dashboard-card p-3 sm:p-4 rounded-lg border-2 hover:opacity-80 ${
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
            <div>
              <textarea
                value={formData.moodNote}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 50) {
                    handleInputChange('moodNote', value);
                  }
                }}
                placeholder="Want to add a note about how you're feeling? (optional, max 50 characters)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ borderColor: 'rgba(107, 114, 128, 0.3)' }}
                rows="3"
                maxLength={50}
              />
              <div className="text-xs text-right mt-1" style={{ color: '#9CA3AF' }}>
                {formData.moodNote.length}/50 characters
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 sm:pt-6">
        <button
          onClick={prevStep}
          className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base transition-colors hover:opacity-80 order-2 sm:order-1"
          style={{ color: '#475569' }}
        >
          Back
        </button>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
          <button
            onClick={skipOnboarding}
            className="px-4 sm:px-6 py-2 sm:py-3 transition-colors text-xs sm:text-sm hover:opacity-80 cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-50"
            style={{ color: '#475569' }}
            disabled={isLoading}
          >
            {isLoading ? 'Skipping...' : 'Skip All Questions'}
          </button>
          <button
            onClick={nextStep}
            className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg hover:opacity-90"
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
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 px-2" style={{ color: '#1E252B' }}>What brings you here? 🤗</h2>
        <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>Select all that apply - this helps me understand how to support you. Everything is completely confidential.</p>
      </div>

      <div className="space-y-8">
        {/* Goals */}
        <div>
          <label className="block text-lg font-medium mb-4" style={{ color: '#1E252B' }}>
            What brings you here? For example, do you want a safe space to talk, ways to manage stress, or just gentle check-ins? 💭
          </label>
          <p className="text-sm mb-4" style={{ color: '#475569' }}>You can select multiple options or skip this entirely. We're here to help however you need.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                onClick={() => handleMultiSelect('goals', goal)}
                className={`dashboard-card p-3 rounded-lg border-2 text-left hover:opacity-80 ${
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {supportOptions.map((support) => (
              <button
                key={support}
                onClick={() => handleMultiSelect('preferredSupport', support)}
                className={`dashboard-card p-3 rounded-lg border-2 text-left hover:opacity-80 ${
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

      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 sm:pt-6">
        <button
          onClick={prevStep}
          className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base transition-colors hover:opacity-80 order-2 sm:order-1"
          style={{ color: '#475569' }}
        >
          Back
        </button>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
          <button
            onClick={skipOnboarding}
            className="px-4 sm:px-6 py-2 sm:py-3 transition-colors text-xs sm:text-sm hover:opacity-80 cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-50"
            style={{ color: '#475569' }}
            disabled={isLoading}
          >
            {isLoading ? 'Skipping...' : 'Skip All Questions'}
          </button>
          <button
            onClick={nextStep}
            className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 px-2" style={{ color: '#1E252B' }}>Emergency Contact (Optional)</h2>
        <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>This is completely optional and will only be used in emergency situations with your explicit consent.</p>
      </div>

      <div className="space-y-6">
        {/* Warning Box */}
        <div className="dashboard-card p-6 rounded-xl border" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: '#EF4444' }}>
          <div className="flex items-center justify-center space-x-3">
            <div>
              <h3 className="font-semibold mb-2 flex items-center justify-center" style={{ color: '#DC2626' }}>
                <span className="text-xl mr-2 mb-1">⚠️</span>
                Important Information
              </h3>
              <div className="space-y-2 text-sm" style={{ color: '#475569' }}>
                <p>• This email will <strong>only</strong> be used if our AI detects you might be in immediate danger</p>
                <p>• We will <strong>never</strong> share this information with anyone else</p>
                <p>• We will <strong>always</strong> ask for your consent before contacting them</p>
                <p>• You can change or remove this at any time</p>
                <p>• This is completely optional - you can skip this step</p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact Email */}
        <div>
          <label className="block text-base sm:text-lg font-medium mb-2 sm:mb-3" style={{ color: '#1E252B' }}>
            Emergency Contact Email (Optional) 📧
          </label>
          <p className="text-sm mb-4" style={{ color: '#475569' }}>
            If you'd like, you can provide an email of a trusted person (family member, friend, or counselor) 
            who we could contact in case of emergency. This is completely optional and confidential.
          </p>
          <input
            type="email"
            value={formData.emergencyContactEmail}
            onChange={(e) => handleInputChange('emergencyContactEmail', e.target.value)}
            placeholder="Enter emergency contact email (optional)"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ borderColor: 'rgba(107, 114, 128, 0.3)' }}
          />
        </div>

        {/* Additional Info */}
        <div className="dashboard-card p-4 rounded-lg" style={{ background: 'rgba(60, 145, 197, 0.05)' }}>
          <p className="text-sm" style={{ color: '#475569' }}>
            <strong>How this works:</strong> If our AI ever detects that you might be in immediate danger 
            or having thoughts of self-harm, we may ask if you'd like us to reach out to this person. 
            You always have the final say, and we will never contact them without your explicit permission.
          </p>
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
            {isLoading ? 'Skipping...' : 'Skip This Step'}
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

  const renderStep5 = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}>
        <span className="text-3xl">🎉</span>
      </div>
      
      <h1 className="text-3xl font-bold mb-4" style={{ color: '#1E252B' }}>
        You're all set! 💙
      </h1>
      
      <div className="dashboard-card p-6 rounded-xl border mb-6" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
        <p className="text-sm sm:text-base px-2" style={{ color: '#475569' }}>
          Thank you for sharing a bit about yourself. Your personalized dashboard is ready, and I'll use this 
          information to provide you with the most helpful resources and support. Everything you've shared is completely confidential.
        </p>
      </div>

      <div className="dashboard-card p-6 rounded-xl border mb-6" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
        <p className="text-sm" style={{ color: '#475569' }}>
          Remember: Your recovery code from when you signed up is the only way to access your account if you lose access. 
          Keep it safe and confidential.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="dashboard-card bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-white/20">
          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium" style={{ color: '#475569' }}>Step {currentStep} of 5</span>
              <span className="text-xs sm:text-sm font-medium" style={{ color: '#475569' }}>{Math.round((currentStep / 5) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: 'rgba(107, 114, 128, 0.2)' }}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(currentStep / 5) * 100}%`,
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
          {currentStep === 5 && renderStep5()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
