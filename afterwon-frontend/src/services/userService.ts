import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc,
  collection,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  lastLoginAt: Timestamp;
  loginCount: number;
  job?: string;
}

export const userService = {
  // 사용자 프로필 생성 또는 업데이트 - 단순화
  async createOrUpdateUser(user: User): Promise<void> {
    console.log('🔄 Saving user to Firestore:', user.email);
    console.log('🔍 Database instance:', !!db);
    console.log('🔍 User UID:', user.uid);
    
    try {
      // 먼저 간단한 테스트 문서 추가해보기
      console.log('🧪 Testing basic Firestore connectivity...');
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'connectivity test',
        timestamp: new Date(),
        userId: user.uid
      });
      console.log('✅ Basic connectivity test passed:', testDoc.id);
      
      const userRef = doc(db, 'users', user.uid);
      console.log('📝 Document reference created for:', `users/${user.uid}`);
      
      // 기존 사용자 확인하지 않고 바로 저장 (upsert) - serverTimestamp 대신 일반 Date 사용
      const userProfile = {
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || '사용자',
        lastLoginAt: new Date(),
        loginCount: 1 // 일단 1로 고정
      };
      
      console.log('📄 User profile to save:', userProfile);
      console.log('⏰ Attempting setDoc...');
      
      await setDoc(userRef, userProfile, { merge: true });
      console.log('✅ User profile saved to Firestore');
    } catch (error) {
      console.error('❌ Detailed Firestore error:', error);
      console.error('❌ Error code:', (error as any)?.code);
      console.error('❌ Error message:', (error as any)?.message);
      throw error;
    }
  },

  // 사용자 프로필 조회
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        return null;
      }

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { uid: userId, ...userSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      return null;
    }
  },

  // 사용자 직무 업데이트
  async updateUserJob(userId: string, job: string): Promise<void> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { job }, { merge: true });
      console.log('✅ User job updated:', job);
    } catch (error) {
      console.error('❌ Failed to update user job:', error);
      throw error;
    }
  }
};