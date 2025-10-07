import React, { useState, useRef, useEffect, useCallback } from "react";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

// User utility functions
const getUserFromSession = () => {
  try {
    const userData = sessionStorage.getItem("gameUser");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting user from session:", error);
    return null;
  }
};

const updateUserScore = async (userId, newScore, gameCompleted = true) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        score: newScore,
        lastActive: new Date().toISOString(),
        gameCompleted: gameCompleted,
        submittedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(userRef, {
        username: getUserFromSession()?.username || "Unknown",
        score: newScore,
        level: 1,
        gameCompleted: gameCompleted,
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      });
    }

    console.log("Score updated successfully for user:", userId);
    return true;
  } catch (error) {
    console.error("Error updating user score:", error);
    return false;
  }
};

const DragDropMatchingGame = () => {
  // Sample data - you can replace this with your actual content
const initialQuestions = [
  { id: 1, text: '1-Tier Architecture', answer: 'The DBMS software like MySQL which is used to access the database directly' },
  { id: 2, text: '2-Tier Architecture', answer: 'The MySQL Workbench which acts as a client application to access the database' },
  { id: 3, text: '3-Tier Architecture', answer: 'Any web-based application where the client interacts through a server, for example, Rakshak AI' },
  { id: 4, text: 'N-Tier Architecture', answer: 'Large enterprise systems having multiple layers such as presentation, application, and database servers' },
];

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [activeTouchItem, setActiveTouchItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const navigate = useNavigate();

  // Refs for better performance
  const touchStartRef = useRef({ x: 0, y: 0 });
  const draggedElementRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize the game and get user from session
  useEffect(() => {
    const currentUser = getUserFromSession();
    setUser(currentUser);
    resetGame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      removeTouchDragPreview();
    };
  }, []);

  const resetGame = useCallback(() => {
    const shuffledQuestions = [...initialQuestions]
      .sort(() => Math.random() - 0.5)
      .map((q, index) => ({ ...q, displayId: index + 1 }));

    const shuffledAnswers = [...initialQuestions]
      .map((q) => q.answer)
      .sort(() => Math.random() - 0.5)
      .map((answer, index) => ({ id: index + 1, text: answer }));

    setQuestions(shuffledQuestions);
    setAnswers(shuffledAnswers);
    setMatches([]);
    setGameCompleted(false);
    setScore(0);
    setActiveTouchItem(null);
    setIsDragging(false);
    setShowConfetti(false);
    setIsSubmitting(false);
    setSubmitStatus("");
  }, [initialQuestions]);

  const handleSubmit = useCallback(async () => {
    if (matches.length !== questions.length || !user) return;

    setIsSubmitting(true);
    setSubmitStatus("Submitting your score...");

    try {
      const correctMatches = matches.filter(
        (match) =>
          initialQuestions.find((q) => q.id === match.questionId)?.answer ===
          match.answerText
      ).length;

      const finalScore = correctMatches;
      setScore(finalScore);

      // Update user score in Firebase
      const success = await updateUserScore(user.id, finalScore, true);

      if (success) {
        setGameCompleted(true);
        setShowConfetti(true);
        setSubmitStatus("Score submitted successfully! 🎉");

        // Update local user data with new score
        const updatedUser = {
          ...user,
          score: finalScore,
          gameCompleted: true,
        };
        setUser(updatedUser);
        sessionStorage.setItem("gameUser", JSON.stringify(updatedUser));

        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        setSubmitStatus("Failed to submit score. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      setSubmitStatus("Error submitting score. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [matches, questions, initialQuestions, user]);

  // Optimized drag handlers
  const handleDragStart = useCallback((e, item, type) => {
    if (type === "answer" && isAnswerUsed(item.id)) return;

    setIsDragging(true);

    if (e.dataTransfer) {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ ...item, type })
      );
      e.dataTransfer.effectAllowed = "move";
    }

    // For touch devices
    if (e.type === "touchstart") {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      setActiveTouchItem({ ...item, type });
      createTouchDragPreview(item.text, touch.clientX, touch.clientY);
    }
  }, []);

  const createTouchDragPreview = useCallback((text, x, y) => {
    removeTouchDragPreview();

    const preview = document.createElement("div");
    preview.id = "touch-drag-preview";
    preview.textContent = text;
    preview.style.position = "fixed";
    preview.style.left = `${x - 50}px`;
    preview.style.top = `${y - 25}px`;
    preview.style.zIndex = "1000";
    preview.style.pointerEvents = "none";
    preview.className =
      "bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl font-bold border-2 border-white text-center min-w-[100px] max-w-[200px]";

    document.body.appendChild(preview);
    draggedElementRef.current = preview;
  }, []);

  const updateTouchDragPreview = useCallback((x, y) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const preview = document.getElementById("touch-drag-preview");
      if (preview) {
        preview.style.left = `${x - 50}px`;
        preview.style.top = `${y - 25}px`;
      }
    });
  }, []);

  const removeTouchDragPreview = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const preview = document.getElementById("touch-drag-preview");
    if (preview) {
      preview.remove();
    }
    draggedElementRef.current = null;
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!activeTouchItem) return;

      e.preventDefault();
      const touch = e.touches[0];
      updateTouchDragPreview(touch.clientX, touch.clientY);
    },
    [activeTouchItem, updateTouchDragPreview]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (!activeTouchItem) return;

      const touch = e.changedTouches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const questionElement = elements.find((el) =>
        el.classList.contains("question-drop-zone")
      );

      if (questionElement && activeTouchItem.type === "answer") {
        const questionId = parseInt(questionElement.dataset.questionId);
        const targetQuestion = questions.find((q) => q.id === questionId);

        if (targetQuestion) {
          handleDropOnQuestion(targetQuestion, activeTouchItem);
        }
      }

      removeTouchDragPreview();
      setActiveTouchItem(null);
      setIsDragging(false);
    },
    [activeTouchItem, questions]
  );

  const handleDropOnQuestion = useCallback((targetQuestion, draggedAnswer) => {
    setMatches((prevMatches) => {
      const existingMatchIndex = prevMatches.findIndex(
        (match) => match.questionId === targetQuestion.id
      );
      const filteredMatches =
        existingMatchIndex !== -1
          ? prevMatches.filter(
              (match) => match.questionId !== targetQuestion.id
            )
          : prevMatches;

      const newMatch = {
        questionId: targetQuestion.id,
        answerId: draggedAnswer.id,
        questionText: targetQuestion.text,
        answerText: draggedAnswer.text,
      };

      return [...filteredMatches, newMatch];
    });
  }, []);

  const removeMatch = useCallback((questionId) => {
    setMatches((prev) =>
      prev.filter((match) => match.questionId !== questionId)
    );
  }, []);

  const getMatchedAnswer = useCallback(
    (questionId) => {
      return matches.find((match) => match.questionId === questionId);
    },
    [matches]
  );

  const isAnswerUsed = useCallback(
    (answerId) => {
      return matches.some((match) => match.answerId === answerId);
    },
    [matches]
  );

  // Touch event listeners with cleanup
  useEffect(() => {
    if (activeTouchItem) {
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [activeTouchItem, handleTouchMove, handleTouchEnd]);

  // Split questions for mobile layout
  const topQuestions = questions.slice(0, 2);
  const bottomQuestions = questions.slice(2);

  const allMatched =
    matches.length === questions.length && questions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-6 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: [
                  "#ff0000",
                  "#00ff00",
                  "#0000ff",
                  "#ffff00",
                  "#ff00ff",
                  "#00ffff",
                ][i % 6],
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-3">
              🎮 Match Masters
            </h1>
            <p className="text-lg text-white/80 font-medium">
              Drag answers to their matching Pair!
            </p>

            {/* User Info */}
            {user && (
              <div className="mt-3 bg-white/10 rounded-xl p-3 inline-block">
                <p className="text-white/90 font-semibold">
                  Playing as:{" "}
                  <span className="text-yellow-300">{user.username}</span>
                </p>
                <p className="text-white/70 text-sm">
                  Current Score: {user.score}
                </p>
              </div>
            )}

            {/* Score & Progress */}
            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                <div className="text-white/70 text-sm font-semibold">Score</div>
                <div className="text-2xl font-black text-white">
                  {score}
                  <span className="text-white/50">/{questions.length}</span>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                <div className="text-white/70 text-sm font-semibold">
                  Progress
                </div>
                <div className="text-2xl font-black text-white">
                  {matches.length}
                  <span className="text-white/50">/{questions.length}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-cyan-400 h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(matches.length / questions.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {gameCompleted && (
            <div className="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 border border-white/30 shadow-2xl animate-bounce-in">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                🎉 Mission Complete!
              </h3>
              <p className="text-white/90 text-lg">
                You scored{" "}
                <span className="font-black text-yellow-300">{score}</span> out
                of {questions.length}
              </p>
              {user?.gameCompleted && (
                <p className="text-green-200 font-semibold mt-2">
                  ✅ Score saved to your profile!
                </p>
              )}
              <button
                onClick={() => {
                  navigate("/leaderboard");
                }}
                className="mt-4 bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-8 rounded-xl transition-all duration-200 active:scale-95 shadow-lg"
              >
                View Leaderboard
              </button>
            </div>
          )}
        </div>

        {/* Game Container */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 mb-6 border border-white/20 shadow-2xl">
          {/* Top Questions Section */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 flex items-center justify-center">
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-xl mr-3 shadow-lg">
                ❓
              </span>
              Questions Zone
            </h2>
            
            {/* Top Questions */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              {topQuestions.map((question) => {
                const match = getMatchedAnswer(question.id);

                return (
                  <div
                    key={question.id}
                    data-question-id={question.id}
                    className={`question-drop-zone p-4 rounded-xl border-3 transition-all duration-300 touch-none ${
                      match
                        ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 shadow-lg"
                        : "bg-white/10 border-white/30 hover:border-cyan-400/50 hover:bg-white/15"
                    } ${isDragging ? "scale-105 shadow-xl" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = JSON.parse(
                        e.dataTransfer.getData("application/json")
                      );
                      if (data.type === "answer") {
                        handleDropOnQuestion(question, data);
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-full w-8 h-8 flex items-center justify-center mr-3 shadow-lg flex-shrink-0">
                          {question.displayId}
                        </span>
                        <span className="font-bold text-white text-lg">
                          {question.text}
                        </span>
                      </div>

                      {match && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="bg-white text-gray-900 px-3 py-2 rounded-xl text-sm font-bold shadow-lg border border-yellow-300 max-w-[200px] sm:max-w-[250px] md:max-w-[300px]">
                            <div className="truncate text-ellipsis overflow-hidden">
                              {match.answerText}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMatch(question.id)}
                            className="text-white hover:text-red-300 transition-colors text-lg bg-red-500/30 hover:bg-red-500/50 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0"
                            aria-label="Remove match"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Answers Section - Placed between top and bottom questions */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4 flex items-center justify-center">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3 rounded-xl mr-3 shadow-lg">
                  🎯
                </span>
                Answers Pool
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {answers.map((answer) => {
                  const isUsed = isAnswerUsed(answer.id);
                  const isActiveTouch = activeTouchItem?.id === answer.id;

                  return (
                    <div
                      key={answer.id}
                      draggable={!isUsed}
                      onDragStart={(e) =>
                        !isUsed && handleDragStart(e, answer, "answer")
                      }
                      onTouchStart={(e) =>
                        !isUsed && handleDragStart(e, answer, "answer")
                      }
                      className={`p-3 rounded-xl text-center font-bold transition-all duration-300 touch-none select-none relative overflow-hidden ${
                        isUsed
                          ? "bg-gray-600/30 text-gray-400 cursor-not-allowed transform scale-95"
                          : isActiveTouch
                          ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white scale-110 shadow-2xl border-2 border-white"
                          : "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 hover:shadow-xl active:scale-95 border-2 border-transparent"
                      } shadow-lg`}
                      style={{
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
                      }}
                    >
                      <div className="text-sm md:text-base break-words whitespace-normal">
                        {answer.text}
                      </div>
                      {isUsed && (
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                          <div className="w-full h-0.5 bg-white transform rotate-12 absolute"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Questions */}
            <div className="grid grid-cols-1 gap-4">
              {bottomQuestions.map((question) => {
                const match = getMatchedAnswer(question.id);

                return (
                  <div
                    key={question.id}
                    data-question-id={question.id}
                    className={`question-drop-zone p-4 rounded-xl border-3 transition-all duration-300 touch-none ${
                      match
                        ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 shadow-lg"
                        : "bg-white/10 border-white/30 hover:border-cyan-400/50 hover:bg-white/15"
                    } ${isDragging ? "scale-105 shadow-xl" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = JSON.parse(
                        e.dataTransfer.getData("application/json")
                      );
                      if (data.type === "answer") {
                        handleDropOnQuestion(question, data);
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-full w-8 h-8 flex items-center justify-center mr-3 shadow-lg flex-shrink-0">
                          {question.displayId}
                        </span>
                        <span className="font-bold text-white text-lg">
                          {question.text}
                        </span>
                      </div>

                      {match && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="bg-white text-gray-900 px-3 py-2 rounded-xl text-sm font-bold shadow-lg border border-yellow-300 max-w-[200px] sm:max-w-[250px] md:max-w-[300px]">
                            <div className="truncate text-ellipsis overflow-hidden">
                              {match.answerText}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMatch(question.id)}
                            className="text-white hover:text-red-300 transition-colors text-lg bg-red-500/30 hover:bg-red-500/50 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0"
                            aria-label="Remove match"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Button - Fixed at Bottom */}
        {allMatched && !gameCompleted && (
          <div className="sticky bottom-6 z-20 mt-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 border-2 border-yellow-300 shadow-2xl text-center transform hover:scale-105 transition-all duration-300 animate-pulse">
              <h3 className="text-2xl font-black text-white mb-2">
                🚀 Ready to Submit!
              </h3>
              <p className="text-white/90 mb-4">
                All pairs matched! Check your score!
              </p>

              {submitStatus && (
                <div
                  className={`mb-4 p-3 rounded-xl ${
                    submitStatus.includes("successfully")
                      ? "bg-green-500/20 border border-green-400"
                      : submitStatus.includes("Error") ||
                        submitStatus.includes("Failed")
                      ? "bg-red-500/20 border border-red-400"
                      : "bg-blue-500/20 border border-blue-400"
                  }`}
                >
                  <p className="text-white font-semibold">{submitStatus}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`bg-white text-gray-900 hover:bg-yellow-100 font-black py-4 px-12 rounded-xl text-lg transition-all duration-200 active:scale-95 shadow-lg border-2 border-yellow-300 ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "SUBMIT ANSWERS"
                )}
              </button>

              {user && (
                <p className="text-white/70 text-sm mt-3">
                  Score will be saved for:{" "}
                  <span className="font-bold text-yellow-300">
                    {user.username}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-4 text-center">
            🎮 How to Play
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="font-black text-cyan-300 mb-2 flex items-center">
                <span className="text-lg mr-2">🖱️</span> Desktop
              </h4>
              <ul className="text-white/80 space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Drag answers to questions
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Match all pairs to submit
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Click ✕ to remove matches
                </li>
              </ul>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="font-black text-pink-300 mb-2 flex items-center">
                <span className="text-lg mr-2">📱</span> Mobile
              </h4>
              <ul className="text-white/80 space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                  Tap & hold answers to drag
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                  Release to drop on questions
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                  Tap ✕ to remove matches
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti 3s linear forwards;
        }

        .animate-bounce-in {
          animation: bounce 0.6s;
        }

        @keyframes bounce {
          0%,
          20%,
          53%,
          80%,
          100% {
            transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
            transform: translate3d(0, 0, 0);
          }
          40%,
          43% {
            transition-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -30px, 0);
          }
          70% {
            transition-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -15px, 0);
          }
          90% {
            transform: translate3d(0, -4px, 0);
          }
        }

        /* Optimize for mobile */
        @media (max-width: 768px) {
          .question-drop-zone {
            min-height: 70px;
          }
        }

        /* Prevent flash of unstyled content */
        .question-drop-zone,
        [draggable] {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default DragDropMatchingGame;