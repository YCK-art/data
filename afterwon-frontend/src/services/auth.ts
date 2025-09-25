import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  User,
  onAuthStateChanged,
  NextOrObserver
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { userService } from './userService';

// Google Auth Provider with custom parameters
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  display: 'popup'
});

export const authService = {
  // Sign in with Google - COOP 문제 해결을 위해 redirect 방식도 시도
  async signInWithGoogle(): Promise<User | null> {
    try {
      if (!auth) {
        console.error('❌ Firebase Auth not initialized');
        return null;
      }

      console.log('🔑 Attempting Google sign in...');
      
      try {
        // 먼저 popup 방식 시도
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        if (user) {
          console.log('✅ User signed in via popup:', user.email);
          await this.handleUserAfterSignIn(user);
        }
        
        return user;
      } catch (popupError: any) {
        console.warn('⚠️ Popup sign-in failed, trying redirect:', popupError.message);
        
        // COOP 에러나 팝업 차단 시 redirect 방식 사용
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.message.includes('Cross-Origin-Opener-Policy')) {
          console.log('🔄 Using redirect method due to COOP policy');
          await signInWithRedirect(auth, googleProvider);
          return null; // redirect는 페이지가 새로고침되므로 null 반환
        }
        
        throw popupError;
      }
    } catch (error) {
      console.error('❌ Error signing in with Google:', error);
      throw error;
    }
  },

  // 사용자 로그인 후 처리
  async handleUserAfterSignIn(user: User): Promise<void> {
    try {
      await userService.createOrUpdateUser(user);
      console.log('✅ User profile processed');
    } catch (firestoreError) {
      console.warn('⚠️ Failed to save user profile:', firestoreError);
    }
  },

  // 페이지 로드 시 redirect 결과 확인
  async checkRedirectResult(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        console.log('✅ User signed in via redirect:', result.user.email);
        await this.handleUserAfterSignIn(result.user);
        return result.user;
      }
      return null;
    } catch (error) {
      console.error('❌ Redirect result error:', error);
      return null;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: NextOrObserver<User>): () => void {
    return onAuthStateChanged(auth, callback);
  }
};