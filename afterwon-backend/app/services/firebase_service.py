import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
from typing import Dict, Any, Optional
import json
from datetime import datetime

class FirebaseService:
    _instance = None
    _db = None
    _bucket = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
            cls._instance._initialize_firebase()
        return cls._instance
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Initialize Firebase Admin (서버사이드에서는 Admin SDK 사용)
            # 서비스 계정 키 파일이 필요합니다
            if not firebase_admin._apps:
                # Firebase 서비스 계정 키를 환경변수에서 읽기
                firebase_config = {
                    "type": "service_account",
                    "project_id": "data-b1194",
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.getenv('FIREBASE_CLIENT_EMAIL')}"
                }
                
                if all([firebase_config["private_key"], firebase_config["client_email"]]):
                    cred = credentials.Certificate(firebase_config)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': 'data-b1194.firebasestorage.app'
                    })
                    self._db = firestore.client()
                    self._bucket = storage.bucket()
                    print("Firebase initialized successfully")
                else:
                    print("Firebase credentials not found, using local storage")
                    self._db = None
                    self._bucket = None
        except Exception as e:
            print(f"Firebase initialization failed: {e}")
            self._db = None
            self._bucket = None
    
    @property
    def db(self):
        return self._db
    
    @property
    def bucket(self):
        return self._bucket
    
    def is_available(self) -> bool:
        """Check if Firebase is available"""
        return self._db is not None and self._bucket is not None
    
    async def save_chat_message(self, user_id: str, session_id: str, message_data: Dict[str, Any]) -> str:
        """Save chat message to Firestore"""
        if not self.is_available():
            return None
            
        try:
            message_ref = self._db.collection('chatMessages').add({
                'userId': user_id,
                'sessionId': session_id,
                'timestamp': firestore.SERVER_TIMESTAMP,
                **message_data
            })
            return message_ref[1].id
        except Exception as e:
            print(f"Error saving chat message: {e}")
            return None
    
    async def get_chat_messages(self, session_id: str, user_id: str) -> list:
        """Get chat messages for a session"""
        if not self.is_available():
            return []
            
        try:
            messages_ref = self._db.collection('chatMessages')
            query = messages_ref.where('sessionId', '==', session_id).where('userId', '==', user_id)
            docs = query.order_by('timestamp').stream()
            
            messages = []
            for doc in docs:
                message_data = doc.to_dict()
                message_data['id'] = doc.id
                messages.append(message_data)
            
            return messages
        except Exception as e:
            print(f"Error getting chat messages: {e}")
            return []
    
    async def create_chat_session(self, user_id: str, title: str = "New Chat") -> str:
        """Create a new chat session"""
        if not self.is_available():
            return None
            
        try:
            session_ref = self._db.collection('chatSessions').add({
                'userId': user_id,
                'title': title,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            return session_ref[1].id
        except Exception as e:
            print(f"Error creating chat session: {e}")
            return None
    
    async def save_file_metadata(self, user_id: str, file_data: Dict[str, Any]) -> str:
        """Save file metadata to Firestore"""
        if not self.is_available():
            return None
            
        try:
            file_ref = self._db.collection('fileMetadata').add({
                'userId': user_id,
                'uploadedAt': firestore.SERVER_TIMESTAMP,
                'processed': True,  # 백엔드에서 처리 완료된 상태
                **file_data
            })
            return file_ref[1].id
        except Exception as e:
            print(f"Error saving file metadata: {e}")
            return None
    
    async def upload_file_to_storage(self, file_content: bytes, file_path: str) -> Optional[str]:
        """Upload file to Firebase Storage and return download URL"""
        if not self.is_available():
            return None
            
        try:
            blob = self._bucket.blob(file_path)
            blob.upload_from_string(file_content)
            
            # Make the file publicly accessible (optional)
            blob.make_public()
            
            return blob.public_url
        except Exception as e:
            print(f"Error uploading file to storage: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str) -> list:
        """Get all chat sessions for a user"""
        if not self.is_available():
            return []
            
        try:
            sessions_ref = self._db.collection('chatSessions')
            query = sessions_ref.where('userId', '==', user_id)
            docs = query.order_by('updatedAt', direction=firestore.Query.DESCENDING).stream()
            
            sessions = []
            for doc in docs:
                session_data = doc.to_dict()
                session_data['id'] = doc.id
                sessions.append(session_data)
            
            return sessions
        except Exception as e:
            print(f"Error getting user sessions: {e}")
            return []