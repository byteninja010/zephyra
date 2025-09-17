import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import MoodCheckInModal from "./MoodCheckInModal";
import MoodGraph from "./MoodGraph";
import BreathingExercise from "./BreathingExercise";
import ReflectionChart from "./ReflectionChart";
import StreakTracker from "./StreakTracker";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const [showReflectionChart, setShowReflectionChart] = useState(false);
  const [showStreakTracker, setShowStreakTracker] = useState(false);

  useEffect(() => {
    const validateUser = async () => {
      // Check if user is logged in
      const userId = localStorage.getItem("userId");
      const firebaseUid = localStorage.getItem("firebaseUid");

      if (!userId || !firebaseUid) {
        navigate("/signin");
        return;
      }

      try {
        // Validate user with backend
        const response = await authService.getUser(firebaseUid);

        if (response.success) {
          setUser({
            id: response.user.id,
            firebaseUid: response.user.firebaseUid,
            secretCode: response.user.secretCode,
            createdAt: response.user.createdAt,
            lastLogin: response.user.lastLogin,
            onboardingCompleted: response.user.onboardingCompleted,
            nickname: response.user.nickname,
            ageRange: response.user.ageRange,
            goals: response.user.goals,
            preferredSupport: response.user.preferredSupport,
            moodHistory: response.user.moodHistory,
          });

          // Check if onboarding is completed
          const onboardingCompleted = response.user.onboardingCompleted;

          if (!onboardingCompleted && !redirecting) {
            setRedirecting(true);
            navigate("/onboarding");
            return;
          }

          // Set onboarding completed flag in localStorage for consistency
          localStorage.setItem("onboardingCompleted", "true");

          // Check if it's first login of the day AND user hasn't provided mood today
          const lastMoodCheckDate = localStorage.getItem("lastMoodCheckDate");
          const today = new Date().toDateString();

          // Check if user has any mood entries for today
          const todayMoods = (response.user.moodHistory || []).filter(
            (mood) => {
              const moodDate = new Date(mood.date).toDateString();
              return moodDate === today;
            }
          );

          // Only show modal if:
          // 1. No mood check recorded for today in localStorage AND
          // 2. No mood entries found for today in the database
          if (lastMoodCheckDate !== today && todayMoods.length === 0) {
            setShowMoodModal(true);
          }

          // Set mood history
          setMoodHistory(response.user.moodHistory || []);

          // Update last login
          await authService.updateLastLogin(firebaseUid);
        } else {
          // User not found in backend, redirect to sign in
          localStorage.clear();
          navigate("/signin");
        }
      } catch (error) {
        console.error("Error validating user:", error);
        // If validation fails, redirect to sign in
        localStorage.clear();
        navigate("/signin");
      } finally {
        setLoading(false);
      }
    };

    validateUser();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("firebaseUid");
    localStorage.removeItem("userSecretCode");
    localStorage.removeItem("onboardingCompleted");
    localStorage.removeItem("lastLoginDate");
    localStorage.removeItem("lastMoodCheckDate");
    navigate("/");
  };

  const handleMoodSubmitted = () => {
    // Set today's date as the last mood check date
    const today = new Date().toDateString();
    localStorage.setItem("lastMoodCheckDate", today);

    // Refresh user data to get updated mood history
    const refreshUserData = async () => {
      try {
        const firebaseUid = localStorage.getItem("firebaseUid");
        const response = await authService.getUser(firebaseUid);
        if (response.success) {
          setMoodHistory(response.user.moodHistory || []);
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    };

    refreshUserData();
    setShowMoodModal(false);
  };

  const handleMoodCheckIn = () => {
    setShowMoodModal(true);
  };

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)",
        }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg animate-pulse"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
            }}
          >
            <svg
              className="w-8 h-8 text-white animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium" style={{ color: "#475569" }}>
            Loading your safe space...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)",
      }}
    >
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10"
          style={{
            background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
          }}
        ></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15"
          style={{
            background: "linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)",
          }}
        ></div>
        <div
          className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-20"
          style={{
            background: "linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)",
          }}
        ></div>
        <div
          className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-10"
          style={{
            background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-0.5 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-1">
              <img
                src="/logo.png"
                alt="Zephyra Logo"
                className="w-16 h-14 object-contain"
              />
              <h1 className="text-2xl font-bold" style={{ color: "#1E252B" }}>
                Zephyra
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: "#1E252B" }}>
                  {user.nickname ? `Hello, ${user.nickname}` : "Welcome back"}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>
                  Your safe space
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                  color: "white",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: "#1E252B" }}
          >
            Your Wellness Journey
            <span
              className="block mt-2"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Starts Here
            </span>
          </h2>
          <p
            className="text-lg font-light max-w-2xl mx-auto"
            style={{ color: "#475569" }}
          >
            Take a moment to check in with yourself. Your mental wellness
            matters, and we're here to support you every step of the way.
          </p>
          {user.goals && user.goals.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {user.goals.map((goal, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/30"
                  style={{
                    background: "rgba(255, 255, 255, 0.6)",
                    color: "#475569",
                  }}
                >
                  {goal}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Mood Check-in */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#E65100"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-1 text-center"
              style={{ color: "#1E252B" }}
            >
              Mood Check-in
            </h3>
            {moodHistory && moodHistory.length > 0 && (
              <div className="mb-4 text-center">
                <div className="flex items-center justify-center">
                  <span>
                    <span className="text-2xl">
                      {moodHistory[moodHistory.length - 1].mood === "happy" &&
                        "😊"}
                      {moodHistory[moodHistory.length - 1].mood === "neutral" &&
                        "😐"}
                      {moodHistory[moodHistory.length - 1].mood === "sad" &&
                        "😔"}
                      {moodHistory[moodHistory.length - 1].mood === "anxious" &&
                        "😰"}
                      {moodHistory[moodHistory.length - 1].mood === "tired" &&
                        "😴"}
                      {moodHistory[moodHistory.length - 1].mood === "calm" &&
                        "😌"}
                      {moodHistory[moodHistory.length - 1].mood ===
                        "frustrated" && "😤"}
                      {moodHistory[moodHistory.length - 1].mood === "hopeful" &&
                        "🤗"}
                    </span>
                    <span className="text-sm" style={{ color: "#475569" }}>
                      {moodHistory[moodHistory.length - 1].note
                        ? moodHistory[moodHistory.length - 1].note.length > 30
                          ? `${moodHistory[
                              moodHistory.length - 1
                            ].note.substring(0, 30)}...`
                          : moodHistory[moodHistory.length - 1].note
                        : ""}
                    </span>
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handleMoodCheckIn}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              {moodHistory && moodHistory.length > 0
                ? "Update Mood"
                : "Start Tracking"}
            </button>
          </div>

          {/* Breathing Exercise */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#00695C"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Breathing Exercise
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Guided breathing for calm
            </p>
            <button
              onClick={() => setShowBreathingExercise(true)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Start Breathing
            </button>
          </div>

          {/* Reflection Chart */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#2E7D32"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Reflection Chart
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Track your thoughts & growth
            </p>
            <button
              onClick={() => setShowReflectionChart(true)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Start Reflecting
            </button>
          </div>

          {/* Streak Tracker */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#F57C00"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Streak Tracker
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Build healthy habits
            </p>
            <button
              onClick={() => setShowStreakTracker(true)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              View Streaks
            </button>
          </div>
        </div>

        {/* Additional Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Chat with AI */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%)",
              }}
            >
              <img
                src="/Google_Gemini_logo.png"
                alt="Gemini AI"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              AI Companion
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Your supportive AI friend, always here to listen
            </p>
            <button
              onClick={() => navigate("/chat")}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Start Conversation
            </button>
          </div>

          {/* Crisis Support */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #FFCDD2 0%, #EF9A9A 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#C62828"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Crisis Support
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Immediate help when you need it
            </p>
            <button
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                color: "white",
              }}
            >
              Get Help Now
            </button>
          </div>

          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #FFCDD2 0%, #EF9A9A 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#C62828"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Crisis Support
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Immediate help when you need it
            </p>
            <button
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                color: "white",
              }}
            >
              Get Help Now
            </button>
          </div>

          
          
        </div>

        {/* Wellness Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Mood Graph */}
          <div className="lg:col-span-1">
            <MoodGraph moodHistory={moodHistory} />
          </div>

          {/* Wellness Goals */}
          <div
            className="p-8 rounded-2xl backdrop-blur-sm border border-white/40"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div className="flex items-center mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{
                  background:
                    "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="#F57C00"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
              <h3
                className="text-2xl font-semibold"
                style={{ color: "#1E252B" }}
              >
                Your Goals
              </h3>
            </div>
            {user.goals && user.goals.length > 0 ? (
              <div className="space-y-3">
                {user.goals.map((goal, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 rounded-lg"
                    style={{ background: "rgba(60, 145, 197, 0.1)" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                      }}
                    ></div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#475569" }}
                    >
                      {goal}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "#475569" }}>
                  No goals set yet. Consider adding some wellness goals.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Resources */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)",
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="#2E7D32"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "#1E252B" }}
            >
              Resources
            </h3>
            <p className="text-sm font-light mb-4" style={{ color: "#475569" }}>
              Mental health tools and guides
            </p>
            <button
              className="w-full px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Browse Resources
            </button>
          </div>

          {/* Settings */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="#7B1FA2"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "#1E252B" }}
            >
              Settings
            </h3>
            <p className="text-sm font-light mb-4" style={{ color: "#475569" }}>
              Manage your preferences
            </p>
            <button
              className="w-full px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Open Settings
            </button>
          </div>

          {/* Account Info */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)",
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="#00695C"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "#1E252B" }}
            >
              Account Info
            </h3>
            <div className="space-y-2 text-sm" style={{ color: "#475569" }}>
              <p>ID: {user.id.substring(0, 8)}...</p>
              <p>Code: {user.secretCode}</p>
              <p>Status: Active</p>
            </div>
          </div>
        </div>
      </main>

      {/* Mood Check-in Modal */}
      <MoodCheckInModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onMoodSubmitted={handleMoodSubmitted}
      />

      {/* Breathing Exercise Modal */}
      <BreathingExercise
        isOpen={showBreathingExercise}
        onClose={() => setShowBreathingExercise(false)}
      />

      {/* Reflection Chart Modal */}
      <ReflectionChart
        isOpen={showReflectionChart}
        onClose={() => setShowReflectionChart(false)}
      />

      {/* Streak Tracker Modal */}
      <StreakTracker
        isOpen={showStreakTracker}
        onClose={() => setShowStreakTracker(false)}
      />
    </div>
  );
};

export default Dashboard;
