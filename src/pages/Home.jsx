import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Adjust the import path as needed
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [username, setUsername] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check if username already exists in Firestore
  const checkUsernameExists = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.trim()));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  // Check if user has existing incomplete game
  const findExistingUser = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
          exists: true,
          id: userDoc.id,
          gameCompleted: userData.gameCompleted || false,
          level: userData.level || 1,
          score: userData.score || 0
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error("Error finding user:", error);
      return { exists: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (username.trim()) {
      setIsLoading(true);
      setError("");

      try {
        // Check if username already exists
        const existingUser = await findExistingUser(username);
        
        if (existingUser.exists) {
          if (!existingUser.gameCompleted) {
            // User exists and game is not completed - resume their progress
            const sessionUserData = {
              id: existingUser.id,
              username: username.trim(),
              level: existingUser.level,
              score: existingUser.score,
              gameCompleted: existingUser.gameCompleted,
              timestamp: new Date().toISOString(),
            };

            sessionStorage.setItem("gameUser", JSON.stringify(sessionUserData));
            setIsSubmitted(true);
            console.log("Resuming existing game for user:", username);
          } else {
            // User exists but game is completed - don't allow new entry
            setError("This username already exists and has completed the game. Please choose a different username.");
            return;
          }
        } else {
          // Username doesn't exist - create new user
          const userData = {
            username: username.trim(),
            createdAt: serverTimestamp(),
            level: 1,
            score: 0,
            gameCompleted: false,
            lastActive: serverTimestamp(),
          };

          // Add user to Firestore
          const docRef = await addDoc(collection(db, "users"), userData);

          // Store user info in session storage
          const sessionUserData = {
            id: docRef.id,
            username: username.trim(),
            level: 1,
            score: 0,
            gameCompleted: false,
            timestamp: new Date().toISOString(),
          };

          sessionStorage.setItem("gameUser", JSON.stringify(sessionUserData));
          setIsSubmitted(true);
          console.log("New user created and stored:", username);
        }
      } catch (error) {
        console.error("Error storing user:", error);
        setError("Failed to save user. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    setUsername("");
    setIsSubmitted(false);
    setError("");
    // Clear session storage when resetting
    sessionStorage.removeItem("gameUser");
  };

  const handleStartGame = () => {
    // Retrieve user from session storage
    const userData = sessionStorage.getItem("gameUser");
    if (userData) {
      const user = JSON.parse(userData);
      if (!user.gameCompleted) {
        console.log("Starting game for user:", user);
        navigate("/game");
      } else {
        setError("This game has already been completed. Please start a new game with a different username.");
        handleReset();
      }
    }
  };

  // Check if user already exists in session on component mount
  useEffect(() => {
    const existingUser = sessionStorage.getItem("gameUser");
    if (existingUser) {
      const user = JSON.parse(existingUser);
      setUsername(user.username);
      setIsSubmitted(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            DBMS<span className="text-yellow-400"> Game</span>
          </h1>
          <p className="text-gray-300 text-lg">Enter your warrior name</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Username Form */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 text-lg"
                maxLength={20}
                autoFocus
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-gray-400 text-sm">
                  {username.length}/20
                </span>
              </div>
            </div>

            {/* Character Preview */}
            {username && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{username}</p>
                    <p className="text-gray-400 text-sm">Level 1 Warrior</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || isLoading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 relative"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Checking...
                </div>
              ) : (
                "Enter Game"
              )}
            </button>
          </form>
        ) : (
          /* Welcome Screen */
          <div className="text-center space-y-6">
            <div className="animate-bounce">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/20">
                <span className="text-white text-2xl font-bold">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome, <span className="text-yellow-400">{username}</span>!
              </h2>
              <p className="text-gray-300">
                Ready to begin your DBMS adventure?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Start Game
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 border border-white/20"
              >
                Change Name
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Developed by Niraj and Bhavesh
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
      <div className="absolute bottom-20 right-16 w-6 h-6 bg-blue-400 rounded-full animate-pulse delay-75"></div>
      <div className="absolute top-32 right-20 w-3 h-3 bg-purple-400 rounded-full animate-pulse delay-150"></div>
    </div>
  );
};

export default Home;