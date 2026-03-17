import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { UserProfile } from '../types';

export const XP_REWARDS = {
  TROPHY_EARNED: 500,
  STRIPE_EARNED: 1000,
  BELT_EARNED: 5000,
  LOG_WEIGHT: 50,
  BJJ_ATTENDANCE: 150,
  ROUND_ROLLED: 50,
  GYM_SESSION: 150,
  PERSONAL_BEST: 300,
};

export const addXp = async (userId: string, appId: string, amount: number) => {
  if (!userId || !appId || amount <= 0) return;

  try {
    const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
    const profileSnap = await getDoc(profileRef);
    
    let currentXp = 0;
    if (profileSnap.exists()) {
      const data = profileSnap.data() as UserProfile;
      currentXp = data.xp || 0;
    }

    const newXp = currentXp + amount;
    const newLevel = Math.floor(newXp / 1000) + 1;

    await setDoc(profileRef, {
      xp: newXp,
      level: newLevel
    }, { merge: true });

    return { newXp, newLevel };
  } catch (error) {
    console.error("Error adding XP:", error);
    handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${userId}/profile`);
  }
};
