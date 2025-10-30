import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import API_URL from "../config/api";
import MoodCheckInModal from "./MoodCheckInModal";
import MoodGraph from "./MoodGraph";
import BreathingExercise from "./BreathingExercise";
import ReflectionChart from "./ReflectionChart";
import StreakTracker from "./StreakTracker";
import MindCanvas from "./MindCanvas";

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
  const [showMindCanvas, setShowMindCanvas] = useState(false);
  const [personalizedQuote, setPersonalizedQuote] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showMindCanvasToast, setShowMindCanvasToast] = useState(true);
  const [showSupportForumToast, setShowSupportForumToast] = useState(true);
  const [highlightedCard, setHighlightedCard] = useState(null);
  const [showCompanionTooltip, setShowCompanionTooltip] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(0);
  const [companionActive, setCompanionActive] = useState(() => {
    const saved = localStorage.getItem("companionActive");
    return saved !== null ? saved === "true" : true;
  });

  // Persist companion active state
  useEffect(() => {
    localStorage.setItem("companionActive", companionActive);
  }, [companionActive]);

  // Activity suggestions for the companion robot
  const activitySuggestions = [
    {
      icon: "🧘",
      text: "Try a breathing exercise",
      action: () => setShowBreathingExercise(true),
    },
    {
      icon: "😊",
      text: "Check in on your mood",
      action: () => setShowMoodModal(true),
    },
    {
      icon: "💬",
      text: "Chat with your AI friend",
      action: () => navigate("/chat"),
    },
    {
      icon: "🎨",
      text: "Express yourself on Mind Canvas",
      action: () => setShowMindCanvas(true),
    },
    {
      icon: "📝",
      text: "Reflect on your thoughts",
      action: () => setShowReflectionChart(true),
    },
    {
      icon: "🔥",
      text: "Check your wellness streak",
      action: () => setShowStreakTracker(true),
    },
    {
      icon: "👥",
      text: "Visit the support forum",
      action: () => navigate("/forum"),
    },
    {
      icon: "📅",
      text: "Schedule a wellness session",
      action: () => navigate("/sessions"),
    },
  ];

  // Companion robot tooltip cycling
  useEffect(() => {
    if (!companionActive) {
      setShowCompanionTooltip(false);
      return;
    }

    // Show the same activity suggestion every 15 seconds
    const showTooltipInterval = setInterval(() => {
      setShowCompanionTooltip(true);
      setTimeout(() => setShowCompanionTooltip(false), 5000);
    }, 20000);

    // Initial show after 2 seconds
    const initialShow = setTimeout(() => {
      setShowCompanionTooltip(true);
      setTimeout(() => setShowCompanionTooltip(false), 5000);
    }, 2000);

    // Switch to next activity every 5 minutes
    const cycleActivity = setInterval(() => {
      setCurrentActivity((prev) => (prev + 1) % activitySuggestions.length);
    }, 300000); // 5 minutes

    return () => {
      clearTimeout(initialShow);
      clearInterval(showTooltipInterval);
      clearInterval(cycleActivity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionActive]);

  // Close toasts on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (showMindCanvasToast) {
        setShowMindCanvasToast(false);
      }
      if (showSupportForumToast) {
        setShowSupportForumToast(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showMindCanvasToast, showSupportForumToast]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const response = await fetch(
        `${API_URL}/api/sessions/upcoming/${firebaseUid}?limit=10`
      );
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
        <div className="max-w-8xl px-2 sm:px-4 md:px-8 lg:px-10">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-1">
              <img
                src="/logo.png"
                alt="Zephyra Logo"
                className="w-12 h-10 sm:w-16 sm:h-14 object-contain"
              />
              <h1
                className="text-lg sm:text-xl md:text-2xl font-bold"
                style={{ color: "#1E252B" }}
              >
                Zephyra
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-5 mr-2 sm:mr-4">
              <div className="text-right hidden sm:block">
                <p
                  className="text-xs sm:text-sm font-medium"
                  style={{ color: "#1E252B" }}
                >
                  {user.nickname ? `Hello, ${user.nickname}` : "Welcome back"}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>
                  Your safe space
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
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
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-12">
          {/* Personalized Quote */}
          <div className="mt-4 sm:mt-8 max-w-4xl mx-auto">
            {quoteLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse"
                  style={{ background: "#3C91C5" }}
                ></div>
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse"
                  style={{ background: "#5A7D95" }}
                ></div>
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse"
                  style={{ background: "#3C91C5" }}
                ></div>
              </div>
            ) : (
              <div
                className="dashboard-card p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40"
                style={{ background: "rgba(255, 255, 255, 0.8)" }}
              >
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 mr-2"
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
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#3C91C5" }}
                  >
                    Thought of the Day
                  </span>
                </div>
                <p
                  className="text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-relaxed"
                  style={{ color: "#1E252B" }}
                >
                  "{personalizedQuote}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* AI Companion */}
          <div
            className="dashboard-card group p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              AI Companion
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Your supportive AI friend, always here to listen
            </p>
            <button
              onClick={() => navigate("/chat")}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
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
            className="dashboard-card group p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            {/* New Feature Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
              <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg">
                ✨ <span className="hidden sm:inline">MORE</span> PERSONALIZED
              </span>
              <span className=" px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg hidden sm:block">
                ✨ POWERED BY IMAGEN & LYRIA
              </span>
            </div>

            <div
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Sessions
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Schedule and manage your wellness sessions
            </p>
            <button
              onClick={() => navigate("/sessions")}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Manage Sessions
            </button>
          </div>

          {/* Support Forum */}
          <div
            id="support-forum-section"
            className={`dashboard-card group p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:-translate-y-2 relative scroll-mt-8 ${
              highlightedCard === "support-forum"
                ? "border-cyan-400 shadow-2xl ring-4 ring-cyan-300/50 animate-pulse"
                : "border-white/40 hover:shadow-xl"
            }`}
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            {/* New Feature Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
              <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg">
                ✨ NEW<span className="hidden sm:inline"> FEATURE</span>
              </span>
              <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg hidden sm:block">
                ✨ MODERATED BY GEMINI
              </span>
            </div>

            <div
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
                fill="none"
                stroke="white"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            </div>
            <h3
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              AI-Moderated Forum
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Safe anonymous community with AI content moderation
            </p>
            <button
              onClick={() => navigate("/forum")}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Join Community
            </button>
          </div>

          {/* Mind Canvas */}
          <div
            id="mind-canvas-section"
            className={`dashboard-card group p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:-translate-y-2 relative scroll-mt-8 ${
              highlightedCard === "mind-canvas"
                ? "border-blue-400 shadow-2xl ring-4 ring-blue-300/50 animate-pulse"
                : "border-white/40 hover:shadow-xl"
            }`}
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            {/* New Feature Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
              <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg">
                ✨ NEW<span className="hidden sm:inline"> FEATURE</span>
              </span>
              <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg hidden sm:block">
                ✨ POWERED BY VISION AI
              </span>
            </div>

            <div
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <h3
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Mind Canvas
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Draw your emotions, AI understands
            </p>
            <button
              onClick={() => setShowMindCanvas(true)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                color: "white",
              }}
            >
              Start Drawing
            </button>
          </div>
        </div>

        {/* Wellness Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Mood Graph */}
          <div className="lg:col-span-1">
            <MoodGraph moodHistory={moodHistory} />
          </div>

          {/* Scheduled Sessions */}
          <div
            className="dashboard-card p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mr-2 sm:mr-4"
                  style={{
                    background:
                      "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
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
                  className="text-lg sm:text-xl md:text-2xl font-semibold"
                  style={{ color: "#1E252B" }}
                >
                  Scheduled Sessions
                </h3>
              </div>
              <button
                onClick={() => navigate("/sessions")}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
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
                    className="flex items-center justify-between p-2 sm:p-3 md:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300"
                    style={{ background: "rgba(60, 145, 197, 0.05)" }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                        style={{
                          background:
                            session.status === "active"
                              ? "linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)"
                              : "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                        }}
                      ></div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#1E252B" }}
                        >
                          {session.sessionId.startsWith("session-instant_")
                            ? "Instant Session"
                            : "Scheduled Session"}
                        </p>
                        <p className="text-xs" style={{ color: "#475569" }}>
                          {session.schedule.frequency} • {session.schedule.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#3C91C5" }}
                      >
                        {session.status === "active" ? "Active" : "Scheduled"}
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
                    background:
                      "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
                  }}
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
                    background:
                      "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          {/* Mood Check-in */}
          <div
            className="dashboard-card group p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
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
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
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
            className="dashboard-card group p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Breathing Exercise
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Guided breathing for calm & relaxation
            </p>
            <button
              onClick={() => setShowBreathingExercise(true)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
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
            className="dashboard-card group p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            {/* New Feature Badge */}
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
              <span className="hidden lg:inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg">
                ✨ NEW
              </span>
            </div>

            <div
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Reflection Chart
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Track your thoughts & growth
            </p>
            <button
              onClick={() => setShowReflectionChart(true)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
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
            className="dashboard-card group p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            style={{ background: "rgba(255, 255, 255, 0.8)" }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 mx-auto"
              style={{
                background: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
              }}
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
              className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 md:mb-3 text-center"
              style={{ color: "#1E252B" }}
            >
              Streak Tracker
            </h3>
            <p
              className="text-xs sm:text-sm font-light text-center mb-3 sm:mb-4"
              style={{ color: "#475569" }}
            >
              Build healthy habits & Streaks
            </p>
            <button
              onClick={() => setShowStreakTracker(true)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
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

      {/* Mind Canvas Modal */}
      <MindCanvas
        isOpen={showMindCanvas}
        onClose={() => setShowMindCanvas(false)}
      />

      {/* Support Forum Toast Notification - Fixed Top Center */}
      {showSupportForumToast && (
        <div className="hidden lg:block fixed top-8 left-[41.5%] -translate-x-1/2 z-40 animate-bounce">
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full shadow-lg border border-white/30 backdrop-blur-sm"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
            }}
          >
            <button
              onClick={() => {
                setShowSupportForumToast(false);
                const supportForumSection = document.getElementById(
                  "support-forum-section"
                );
                if (supportForumSection) {
                  supportForumSection.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  setHighlightedCard("support-forum");
                  setTimeout(() => setHighlightedCard(null), 3000);
                }
              }}
              className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="text-lg">💬</span>
              <span className="px-2 py-0.5 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full">
                NEW
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-sm">
                  Try Out
                </span>
                <span className="text-white font-medium text-sm underline decoration-white/60 underline-offset-2">
                  Support Forum
                </span>
              </div>
            </button>
            <button
              onClick={() => setShowSupportForumToast(false)}
              className="ml-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-0.5 transition-all"
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mind Canvas Toast Notification - Fixed Top Center */}
      {showMindCanvasToast && (
        <div className="hidden lg:block fixed top-20 left-[42%] -translate-x-1/2 z-40 animate-bounce">
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full shadow-lg border border-white/30 backdrop-blur-sm"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
            }}
          >
            <button
              onClick={() => {
                setShowMindCanvasToast(false);
                const mindCanvasSection = document.getElementById(
                  "mind-canvas-section"
                );
                if (mindCanvasSection) {
                  mindCanvasSection.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  setHighlightedCard("mind-canvas");
                  setTimeout(() => setHighlightedCard(null), 3000);
                }
              }}
              className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="text-lg">🎨</span>
              <span className="px-2 py-0.5 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full">
                NEW
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-sm">
                  Try Out
                </span>
                <span className="text-white font-medium text-sm underline decoration-white/60 underline-offset-2">
                  Mind Canvas
                </span>
              </div>
            </button>
            <button
              onClick={() => setShowMindCanvasToast(false)}
              className="ml-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-0.5 transition-all"
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Companion Robot - Fixed Bottom Right (above crisis button) */}
      <div className="fixed bottom-20 sm:bottom-24 md:bottom-28 right-3 sm:right-4 md:right-6 z-50">
        {/* Tooltip */}
        {showCompanionTooltip && (
          <div className="absolute bottom-full right-0 mb-2 sm:mb-3 w-44 sm:w-56 md:w-60 animate-fade-in">
            <div
              className="bg-white rounded-lg sm:rounded-2xl shadow-xl border-2 p-2 sm:p-3 relative"
              style={{
                borderColor: "#3C91C5",
                background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              }}
            >
              {/* Speech bubble arrow */}
              <div
                className="absolute -bottom-2 right-3 sm:right-6 w-3 h-3 sm:w-4 sm:h-4 bg-white transform rotate-45 border-r-2 border-b-2"
                style={{ borderColor: "#3C91C5" }}
              ></div>

              <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <span className="text-lg sm:text-2xl">
                  {activitySuggestions[currentActivity].icon}
                </span>
                <p className="text-xs sm:text-sm font-medium text-gray-800 flex-1 leading-tight">
                  {activitySuggestions[currentActivity].text}
                </p>
              </div>

              <div className="relative z-10 flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    activitySuggestions[currentActivity].action();
                    setShowCompanionTooltip(false);
                    // Cycle to next activity after user completes current one
                    setCurrentActivity(
                      (prev) => (prev + 1) % activitySuggestions.length
                    );
                  }}
                  className="flex-1 py-1 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                    color: "white",
                  }}
                >
                  Let's do it!
                </button>
                <button
                  onClick={() => {
                    setCompanionActive(!companionActive);
                    setShowCompanionTooltip(false);
                  }}
                  className="py-1 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95 border"
                  style={{
                    background: companionActive ? "#FEE2E2" : "#D1FAE5",
                    color: companionActive ? "#991B1B" : "#065F46",
                    borderColor: companionActive ? "#FCA5A5" : "#86EFAC",
                  }}
                  title={
                    companionActive ? "Pause suggestions" : "Resume suggestions"
                  }
                >
                  {companionActive ? "⏸️" : "▶️"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Companion Robot Button */}
        <button
          onClick={() => setShowCompanionTooltip(!showCompanionTooltip)}
          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center relative group ${
            companionActive ? "bg-cyan-700" : "bg-gray-600"
          }`}
          style={{
            color: "white",
            animation: companionActive
              ? "bounceSlow 3s ease-in-out infinite"
              : "none",
          }}
          title={
            companionActive
              ? "Your Wellness Companion (Active)"
              : "Your Wellness Companion (Paused)"
          }
        >
          {/* Robot Face */}
          <div className="relative scale-75 sm:scale-90 md:scale-100">
            {/* Head */}
            <div className="w-8 h-8 bg-white rounded-lg flex flex-col items-center justify-center relative">
              {/* Left Ear */}
              <div className="absolute -left-2 top-2 w-1.5 h-3 bg-orange-400 rounded-sm"></div>

              {/* Right Ear */}
              <div className="absolute -right-2 top-2 w-1.5 h-3 bg-orange-400 rounded-sm"></div>

              {/* Antenna */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                <div className="w-0.5 h-2 bg-white"></div>
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>

              {/* Eyes */}
              <div className="flex gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-blink"></div>
                <div className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-blink"></div>
              </div>

              {/* Smile */}
              <div className="w-4 h-1.5 border-b-2 border-gray-800 rounded-full"></div>
            </div>

            {/* Notification badge */}
            <div
              className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white"
              style={{
                background: companionActive ? "#4ADE80" : "#F87171",
                animation: companionActive
                  ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                  : "none",
              }}
            ></div>
          </div>
        </button>
      </div>

      {/* Crisis Support Button - Fixed Bottom Right */}
      <div className="fixed bottom-3 sm:bottom-4 md:bottom-6 right-3 sm:right-4 md:right-6 z-50">
        <button
          onClick={() => setShowCrisisModal(true)}
          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
            color: "white",
          }}
          title="Crisis Support"
        >
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
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
          <div className="dashboard-card bg-white rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl animate-bounce-in">
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
                    <p className="text-red-100 text-sm">
                      Immediate help when you need it
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCrisisModal(false)}
                  className="text-white hover:text-red-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
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
                  If you're experiencing a mental health crisis or having
                  thoughts of self-harm, please reach out for help immediately.
                </p>
              </div>

              {/* Emergency Contact */}
              <div className="dashboard-card bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    14416
                  </div>
                  <p className="text-sm text-red-700 font-medium mb-2">
                    Suicide & Crisis Lifeline
                  </p>
                  <p className="text-xs text-red-600 mb-3">
                    Available 24/7, free and confidential
                  </p>
                  <a
                    href="tel:14416"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Call Now
                  </a>
                </div>
              </div>

              {/* Additional Resources */}
              <div className="space-y-3">
                <div className="dashboard-card flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Emergency Services
                    </p>
                    <p className="text-xs text-gray-600">
                      Call 112 for immediate danger
                    </p>
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
