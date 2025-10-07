// src/utils/userUtils.js
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const getUserFromSession = () => {
  try {
    const userData = sessionStorage.getItem('gameUser');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
};

export const updateUserScore = async (userId, newScore) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      score: newScore,
      lastActive: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user score:', error);
  }
};

export const clearUserSession = () => {
  sessionStorage.removeItem('gameUser');
};