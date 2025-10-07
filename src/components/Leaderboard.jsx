// src/pages/Leaderboard.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getUserFromSession } from '../utils/userUtils';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  // Get current user from session
  useEffect(() => {
    const user = getUserFromSession();
    setCurrentUser(user);
  }, []);

  // Realtime listener for leaderboard data
  useEffect(() => {
    setLoading(true);

    let usersQuery;
    const usersRef = collection(db, 'users');

    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      usersQuery = query(
        usersRef,
        where('submittedAt', '>=', today.toISOString()),
        orderBy('submittedAt', 'asc')
      );
    } else if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      usersQuery = query(
        usersRef,
        where('submittedAt', '>=', weekAgo.toISOString()),
        orderBy('submittedAt', 'asc')
      );
    } else {
      usersQuery = query(usersRef, orderBy('submittedAt', 'asc'));
    }

    const unsubscribe = onSnapshot(usersQuery, 
      (snapshot) => {
        const usersData = [];
        snapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.gameCompleted && userData.score !== undefined) {
            usersData.push({
              id: doc.id,
              ...userData,
              submittedAt: userData.submittedAt || userData.createdAt
            });
          }
        });

        const sortedUsers = usersData.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return new Date(a.submittedAt) - new Date(b.submittedAt);
        });

        const rankedUsers = sortedUsers.map((user, index) => ({
          ...user,
          rank: index + 1
        }));

        setUsers(rankedUsers);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter]);

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600 shadow-yellow-500/50';
      case 2: return 'from-gray-400 to-gray-600 shadow-gray-500/50';
      case 3: return 'from-orange-400 to-orange-600 shadow-orange-500/50';
      default: return 'from-blue-500 to-purple-600 shadow-blue-500/30';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const submitted = new Date(timestamp);
    const diffInSeconds = Math.floor((now - submitted) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleGoBack = () => {
   navigate('/');
  };

  const handlePlayAgain = () => {
    navigate('/');
  };

  const getCurrentUserRank = () => {
    if (!currentUser) return null;
    return users.find(user => user.id === currentUser.id);
  };

  const currentUserRank = getCurrentUserRank();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-4 px-3 sm:py-6 sm:px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-20 h-20 sm:w-32 sm:h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-20 h-20 sm:w-32 sm:h-32 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/20 shadow-2xl">
            {/* Mobile Header - Stacked Layout */}
            <div className="block sm:hidden space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleGoBack}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 text-sm"
                >
                  ← Back
                </button>
                <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  🏆
                </h1>
                <button
                  onClick={handlePlayAgain}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 text-sm"
                >
                  Home
                </button>
              </div>
              
              <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Leaderboard
              </h1>
            </div>

            {/* Desktop Header - Horizontal Layout */}
            <div className="hidden sm:flex items-center justify-between mb-4">
              <button
                onClick={handleGoBack}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200 active:scale-95"
              >
                ← Back
              </button>
              
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                🏆 Leaderboard
              </h1>
              
              <button
                onClick={handlePlayAgain}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200 active:scale-95"
              >
                Home
              </button>
            </div>

            <p className="text-white/80 text-sm sm:text-lg mb-4 sm:mb-6">
              Top performers ranked by score and submission time
            </p>

            {/* Current User Stats */}
            {currentUserRank && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-3 sm:p-4 border border-purple-400/30 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`bg-gradient-to-r ${getRankColor(currentUserRank.rank)} text-white font-black rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg text-sm sm:text-base`}>
                      {getRankIcon(currentUserRank.rank)}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-white font-bold text-sm sm:text-lg">Your Position</h3>
                      <p className="text-white/80 text-xs sm:text-sm">
                        Rank <span className="font-black text-yellow-300">{currentUserRank.rank}</span> of {users.length}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm sm:text-base">
                      Score: <span className="text-green-300">{currentUserRank.score}</span>
                    </p>
                    <p className="text-white/70 text-xs sm:text-sm">
                      {getTimeAgo(currentUserRank.submittedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters and Search - Mobile Stacked */}
            <div className="block sm:hidden space-y-3">
              {/* Time Filter */}
              {/* <div className="bg-white/10 rounded-xl p-3">
                <label className="text-white/80 text-xs font-semibold block mb-2">Time Period</label>
                <div className="flex space-x-1">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'Week' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        filter === option.value
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div> */}

              {/* Search */}
              <div className="bg-white/10 rounded-xl p-3">
                <label className="text-white/80 text-xs font-semibold block mb-2">Search Players</label>
                <input
                  type="text"
                  placeholder="Search username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg py-2 px-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Filters and Search - Desktop Horizontal */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
              {/* <div className="bg-white/10 rounded-xl p-3">
                <label className="text-white/80 text-sm font-semibold block mb-2">Time Period</label>
                <div className="flex space-x-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        filter === option.value
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div> */}

              <div className="bg-white/10 rounded-xl p-3">
                <label className="text-white/80 text-sm font-semibold block mb-2">Search Players</label>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg py-2 px-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Stats - Mobile Compact */}
            <div className="grid grid-cols-3 mt-5 gap-2 sm:gap-4 text-center">
              <div className="bg-white/10 rounded-xl p-2 sm:p-3">
                <div className="text-white/70 text-xs sm:text-sm">Total Players</div>
                <div className="text-lg sm:text-2xl font-black text-white">{users.length}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2 sm:p-3">
                <div className="text-white/70 text-xs sm:text-sm">Top Score</div>
                <div className="text-lg sm:text-2xl font-black text-yellow-300">
                  {users[0]?.score || 0}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-2 sm:p-3">
                <div className="text-white/70 text-xs sm:text-sm">Avg Score</div>
                <div className="text-lg sm:text-2xl font-black text-cyan-300">
                  {users.length > 0 
                    ? Math.round(users.reduce((sum, user) => sum + user.score, 0) / users.length)
                    : 0
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/20 shadow-2xl">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-white mx-auto mb-3 sm:mb-4"></div>
              <h3 className="text-lg sm:text-xl font-black text-white">Loading Leaderboard...</h3>
              <p className="text-white/70 text-sm sm:text-base">Fetching realtime updates</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">😕</div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">No Players Found</h3>
              <p className="text-white/70 text-sm sm:text-base">
                {searchTerm ? 'No players match your search' : 'Be the first to play and appear on the leaderboard!'}
              </p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {filteredUsers.slice(0, 3).length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6 text-center">🏆 Top Performers</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {filteredUsers.slice(0, 3).map((user, index) => (
                      <div
                        key={user.id}
                        className={`bg-gradient-to-b ${getRankColor(user.rank)} rounded-2xl p-4 sm:p-6 text-center border-2 ${
                          user.rank === 1 ? 'border-yellow-400' : 
                          user.rank === 2 ? 'border-gray-400' : 
                          'border-orange-400'
                        } shadow-2xl transform ${
                          user.rank === 1 ? 'sm:scale-105 sm:-mt-2' : 'scale-100'
                        } transition-all duration-300`}
                      >
                        <div className="text-3xl sm:text-4xl mb-2">{getRankIcon(user.rank)}</div>
                        <div className="text-white font-black text-lg sm:text-xl mb-1 truncate px-2">
                          {user.username}
                        </div>
                        <div className="text-white/90 text-base sm:text-lg font-bold mb-2">
                          Score: {user.score}
                        </div>
                        <div className="text-white/70 text-xs sm:text-sm">
                          {getTimeAgo(user.submittedAt)}
                        </div>
                        {currentUser?.id === user.id && (
                          <div className="mt-2 bg-white/20 rounded-full px-2 py-1 text-xs text-white font-bold">
                            YOU
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Leaderboard List */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6 text-center">
                Leaderboard
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`bg-white/5 hover:bg-white/10 rounded-xl p-3 sm:p-4 border transition-all duration-200 ${
                        currentUser?.id === user.id
                          ? 'border-cyan-400 bg-cyan-500/20'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className={`bg-gradient-to-r ${getRankColor(user.rank)} text-white font-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg text-xs sm:text-sm`}>
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-white font-bold text-sm sm:text-lg flex items-center truncate">
                              {user.username}
                              {currentUser?.id === user.id && (
                                <span className="ml-2 bg-cyan-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                  YOU
                                </span>
                              )}
                            </h4>
                            <p className="text-white/70 text-xs sm:text-sm truncate">
                              Submitted {getTimeAgo(user.submittedAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg sm:text-2xl font-black text-green-300">
                            {user.score}
                          </div>
                          <div className="text-white/70 text-xs sm:text-sm">
                            Level {user.level || 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 sm:mt-6 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-white/20">
            <h4 className="text-white font-bold text-sm sm:text-base mb-2">📈 Ranking System</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-white/80">
              <div className="flex items-center justify-center">
                <span className="text-yellow-300 font-bold mr-1">•</span>
                <span className='text-black'>Higher Score = Better Rank</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-cyan-300 font-bold mr-1">•</span>
                <span className='text-black'>Earlier Submission = Tie-breaker</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-black font-bold mr-1">•</span>
                <span className='text-black'>Real-time Updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isSearchFocused && (
        <div className="fixed bottom-0 left-0 right-0 bg-indigo-900 border-t border-white/20 p-3 sm:hidden">
          <button
            onClick={() => setIsSearchFocused(false)}
            className="w-full bg-white text-gray-900 font-bold py-3 rounded-xl transition-all duration-200 active:scale-95"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;