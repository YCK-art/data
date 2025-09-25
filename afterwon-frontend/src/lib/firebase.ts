import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, disableNetwork, enableNetwork, clearIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCqANpM7BPe6kWNALhe2mJB-SMsot59YPs",
  authDomain: "data-d6156.firebaseapp.com",
  projectId: "data-d6156",
  storageBucket: "data-d6156.firebasestorage.app",
  messagingSenderId: "87074128954",
  appId: "1:87074128954:web:2030d6e5d68961ae18e103",
  measurementId: "G-T1GM24BVZP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Firestore 연결 문제 해결을 위한 설정
if (typeof window !== 'undefined') {
  try {
    console.log('🔧 Firebase 연결 설정 중...');

    // 내부 어설션 오류 해결을 위한 캐시 초기화
    clearIndexedDbPersistence(db).catch((error) => {
      console.log('🧹 캐시 초기화 시도:', error.message);
    });

  } catch (error) {
    console.warn('⚠️ Firebase 설정 경고 (무시됨):', error);

    // 심각한 오류 발생 시 네트워크 재연결 시도
    try {
      disableNetwork(db).then(() => {
        return enableNetwork(db);
      }).catch(e => console.log('네트워크 재연결 시도:', e.message));
    } catch (networkError) {
      console.log('네트워크 재연결 실패:', networkError);
    }
  }
}

export { auth, db, storage };
export default app;