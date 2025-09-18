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
  const [personalizedQuote, setPersonalizedQuote] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

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

          // Fetch personalized quote
          await fetchPersonalizedQuote(firebaseUid);

          // Load scheduled sessions
          await loadScheduledSessions();

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
          // Refresh personalized quote with updated mood data
          await fetchPersonalizedQuote(firebaseUid);
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

  const fetchPersonalizedQuote = async (firebaseUid) => {
    try {
      setQuoteLoading(true);
      const response = await authService.getPersonalizedQuote(firebaseUid);
      if (response.success) {
        setPersonalizedQuote(response.quote);
      }
    } catch (error) {
      console.error("Error fetching personalized quote:", error);
      // Set fallback quote
      setPersonalizedQuote(
        "Your wellness journey is unique and beautiful. Keep going, one step at a time."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  const loadScheduledSessions = async () => {
    try {
      const firebaseUid = localStorage.getItem("firebaseUid");
      if (!firebaseUid) return;

      const response = await fetch(`http://localhost:5000/api/sessions/upcoming/${firebaseUid}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setScheduledSessions(data.sessions || []);
        }
      }
    } catch (error) {
      console.error("Error loading scheduled sessions:", error);
    }
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
        <div className="max-w-8xl px-0.5 sm:px-8 lg:px-10">
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
            <div className="flex items-center space-x-5 mr-4">
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
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          {/* Personalized Quote */}
          <div className="mt-8 max-w-4xl mx-auto">
            {quoteLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full animate-pulse"
                  style={{ background: "#3C91C5" }}
                ></div>
                <div
                  className="w-4 h-4 rounded-full animate-pulse"
                  style={{ background: "#5A7D95" }}
                ></div>
                <div
                  className="w-4 h-4 rounded-full animate-pulse"
                  style={{ background: "#3C91C5" }}
                ></div>
              </div>
            ) : (
              <div
                className="p-6 rounded-2xl backdrop-blur-sm border border-white/40"
                style={{ background: "rgba(255, 255, 255, 0.8)" }}
              >
                <div className="flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 mr-2"
                    fill="none"
                    stroke="#3C91C5"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#3C91C5" }}
                  >
                    Thought of the Day
                  </span>
                </div>
                <p
                  className="text-lg md:text-xl font-medium leading-relaxed"
                  style={{ color: "#1E252B" }}
                >
                  "{personalizedQuote}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
          {/* AI Companion */}
          <div
            className="group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
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

          {/* Sessions */}
          <div
            className=" group p-6 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="white"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3
              className="text-xl font-semibold mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Sessions
            </h3>
            <p
              className="text-sm font-light text-center mb-4"
              style={{ color: "#475569" }}
            >
              Schedule and manage your wellness sessions
            </p>
            <button
              onClick={() => navigate("/sessions")}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Manage Sessions
            </button>
          </div>

        </div>


         {/* Wellness Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Mood Graph */}
          <div className="lg:col-span-1">
            <MoodGraph moodHistory={moodHistory} />
          </div>

          {/* Scheduled Sessions */}
          <div
            className="p-8 rounded-2xl backdrop-blur-sm border border-white/40"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                  style={{
                    background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                  }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="white"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3
                  className="text-2xl font-semibold"
                  style={{ color: "#1E252B" }}
                >
                  Scheduled Sessions
                </h3>
              </div>
              <button
                onClick={() => navigate("/sessions")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                  color: "white",
                }}
              >
                Manage All
              </button>
            </div>
            
            {scheduledSessions && scheduledSessions.length > 0 ? (
              <div className="space-y-3">
                {scheduledSessions.slice(0, 4).map((session, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300"
                    style={{ background: "rgba(60, 145, 197, 0.05)" }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: session.status === 'active' 
                            ? "linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)"
                            : "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)"
                        }}
                      ></div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#1E252B" }}>
                          {session.sessionId.startsWith('session-instant_') ? 'Instant Session' : 'Scheduled Session'}
                        </p>
                        <p className="text-xs" style={{ color: "#475569" }}>
                          {session.schedule.frequency} • {session.schedule.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium" style={{ color: "#3C91C5" }}>
                        {session.status === 'active' ? 'Active' : 'Scheduled'}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>
                        {new Date(session.nextSessionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {scheduledSessions.length > 4 && (
                  <div className="text-center pt-2">
                    <p className="text-xs" style={{ color: "#475569" }}>
                      +{scheduledSessions.length - 4} more sessions
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
                  }}
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="#3C91C5"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm mb-4" style={{ color: "#475569" }}>
                  No scheduled sessions yet
                </p>
                <button
                  onClick={() => navigate("/sessions")}
                  className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                    color: "white",
                  }}
                >
                  Schedule Session
                </button>
              </div>
            )}
          </div>

          
        </div>

        {/* Additional Quick Actions */}
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

          {/* Chat with AI */}
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

      {/* Crisis Support Button - Fixed Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowCrisisModal(true)}
          className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
            color: "white"
          }}
          title="Crisis Support"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </button>
      </div>

      {/* Crisis Support Modal */}
      {showCrisisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl animate-bounce-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
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
                  <div>
                    <h3 className="text-xl font-bold">Crisis Support</h3>
                    <p className="text-red-100 text-sm">Immediate help when you need it</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCrisisModal(false)}
                  className="text-white hover:text-red-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Need Immediate Help?
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  If you're experiencing a mental health crisis or having thoughts of self-harm, please reach out for help immediately.
                </p>
              </div>

              {/* Emergency Contact */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">988</div>
                  <p className="text-sm text-red-700 font-medium mb-2">Suicide & Crisis Lifeline</p>
                  <p className="text-xs text-red-600 mb-3">Available 24/7, free and confidential</p>
                  <a
                    href="tel:988"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Now
                  </a>
                </div>
              </div>

              {/* Additional Resources */}
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Emergency Services</p>
                    <p className="text-xs text-gray-600">Call 911 for immediate danger</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Crisis Text Line</p>
                    <p className="text-xs text-gray-600">Text HOME to 741741</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  You are not alone. Help is available 24/7.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
