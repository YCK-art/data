import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// Types
export interface ChatSession {
  id?: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'deleted';
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
  projectId?: string; // 프로젝트와 연결
}

export interface Project {
  id?: string;
  userId: string;
  title: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isStarred: boolean;
  status: 'active' | 'deleted';
}

export interface ProjectChatSession {
  id?: string;
  projectId: string;
  userId: string;
  title: string;
  preview: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'deleted';
}

export interface ChatMessage {
  id?: string;
  sessionId: string;
  userId: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  chartData?: any;
  insights?: string[];
  followUpQuestions?: string[];
  fileInfo?: {
    filename: string;
    fileSize: number;
    fileType: 'csv' | 'excel' | 'pdf';
    file_id: string;
  };
  tableData?: {
    data: any[];
    columns: string[];
    filename: string;
  };
}

export interface FileMetadata {
  id?: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedAt: Timestamp;
  sessionId?: string;
  processed: boolean;
  columns?: string[];
  rowCount?: number;
}

export const firestoreService = {
  // Chat Sessions - chat 컬렉션에 저장
  async createChatSession(userId: string, title: string = 'New Chat'): Promise<string> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        return '';
      }

      const sessionRef = await addDoc(collection(db, 'chat'), {
        userId,
        title,
        status: 'active',
        messages: [], // 메시지들을 배열로 저장
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Chat session created:', sessionRef.id);
      return sessionRef.id;
    } catch (error) {
      console.error('❌ Failed to create chat session:', error);
      throw error;
    }
  },

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    const q = query(
      collection(db, 'chat'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    // 클라이언트 사이드에서 status 필터링
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ChatSession))
      .filter(session => !session.status || session.status === 'active'); // status가 없거나 'active'인 것만
  },

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const docRef = doc(db, 'chat', sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const sessionData = docSnap.data() as ChatSession;
        return { id: docSnap.id, ...sessionData };
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get chat session:', error);
      return null;
    }
  },

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>) {
    await setDoc(doc(db, 'chat', sessionId), {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        throw new Error('Firestore not available');
      }

      const chatRef = doc(db, 'chat', sessionId);
      await setDoc(chatRef, {
        status: 'deleted',
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('✅ Chat session soft deleted:', sessionId);
    } catch (error) {
      console.error('❌ Failed to delete chat session:', error);
      throw error;
    }
  },

  // Chat Messages - chat 문서의 messages 배열에 추가
  async addMessage(message: Omit<ChatMessage, 'id'>): Promise<string> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        return '';
      }

      const messageId = Date.now().toString();
      const chatRef = doc(db, 'chat', message.sessionId);
      
      // 기존 채팅 문서 가져오기
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const messages = chatData.messages || [];
        
        // Firestore 호환성을 위해 중첩 배열 처리
        const sanitizedMessage = {
          ...message,
          // chartData가 중첩 배열을 포함할 수 있으므로 JSON 문자열로 변환
          chartData: message.chartData ? JSON.stringify(message.chartData) : null,
          // tableData도 중첩 배열을 포함할 수 있으므로 JSON 문자열로 변환
          tableData: message.tableData ? {
            ...message.tableData,
            data: JSON.stringify(message.tableData.data) // 데이터 배열을 문자열로 변환
          } : null
        };
        
        // 새 메시지 추가 - serverTimestamp() 대신 일반 Date 사용 (배열 안에서는 serverTimestamp 지원 안됨)
        const newMessage = {
          id: messageId,
          ...sanitizedMessage,
          timestamp: new Date()
        };
        
        messages.push(newMessage);
        
        // 문서 업데이트
        await setDoc(chatRef, {
          messages,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        console.log('✅ Message added to chat');
      } else {
        console.warn('⚠️ Chat session not found, creating new session:', message.sessionId);
        // 세션이 없으면 새로 생성
        await setDoc(chatRef, {
          userId: message.userId,
          title: 'New Chat',
          status: 'active',
          messages: [{
            id: messageId,
            ...sanitizedMessage,
            timestamp: new Date()
          }],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ New chat session created with message');
      }
      
      return messageId;
    } catch (error) {
      console.error('❌ Failed to add message:', error);
      throw error;
    }
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    console.log('🔍 Getting messages for session:', sessionId);
    
    if (!db) {
      console.error('❌ Firestore not initialized in getMessages');
      return [];
    }
    
    const chatRef = doc(db, 'chat', sessionId);
    const chatSnap = await getDoc(chatRef);
    
    console.log('📄 Chat document exists:', chatSnap.exists());
    console.log('📄 Chat document ID:', sessionId);
    
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      console.log('📋 Raw chat data:', chatData);
      console.log('📋 Chat data keys:', Object.keys(chatData));
      
      const messages = chatData.messages || [];
      console.log('💬 Raw messages array:', messages);
      console.log('💬 Messages count:', messages.length);
      console.log('💬 First message (if exists):', messages[0] || 'No messages');
      
      // JSON 문자열로 저장된 데이터를 다시 객체로 변환
      const processedMessages = messages.map((message: any, index: number) => {
        console.log(`🔄 Processing message ${index + 1}:`, message);
        
        try {
          let chartData = null;
          let tableData = message.tableData;

          // chartData 안전하게 처리
          if (message.chartData) {
            try {
              if (typeof message.chartData === 'string') {
                chartData = JSON.parse(message.chartData);
              } else {
                chartData = message.chartData; // 이미 객체인 경우
              }
            } catch (chartError) {
              console.warn(`⚠️ Failed to parse chartData for message ${index + 1}:`, chartError);
              chartData = null;
            }
          }

          // tableData 안전하게 처리
          if (message.tableData && message.tableData.data) {
            try {
              if (typeof message.tableData.data === 'string') {
                tableData = {
                  ...message.tableData,
                  data: JSON.parse(message.tableData.data)
                };
              } else {
                tableData = message.tableData; // 이미 객체인 경우
              }
            } catch (tableError) {
              console.warn(`⚠️ Failed to parse tableData for message ${index + 1}:`, tableError);
              tableData = message.tableData; // 원본 유지
            }
          }

          const processed = {
            ...message,
            chartData,
            tableData
          };
          
          console.log(`✅ Processed message ${index + 1}:`, processed);
          return processed;
        } catch (error) {
          console.error(`❌ Error processing message ${index + 1}:`, error);
          return message; // 원본 메시지 반환
        }
      });
      
      console.log('🎯 Final processed messages:', processedMessages);
      return processedMessages;
    }
    
    console.warn('⚠️ Chat document does not exist for session:', sessionId);
    return [];
  },

  // Get messages without real-time subscription (to avoid 400 errors)
  async subscribeToMessages(sessionId: string, callback: (messages: ChatMessage[]) => void) {
    // Instead of real-time subscription, just get messages once
    try {
      const messages = await this.getMessages(sessionId);
      callback(messages);
    } catch (error) {
      console.warn('Failed to load messages:', error);
      callback([]);
    }
    
    // Return a no-op unsubscribe function
    return () => {};
  },

  // File Management - Firebase Storage에 파일 업로드
  async uploadFile(userId: string, file: File, sessionId?: string): Promise<FileMetadata> {
    try {
      if (!storage) {
        console.error('❌ Firebase Storage not initialized');
        throw new Error('Storage not available');
      }
      
      if (!db) {
        console.error('❌ Firestore not initialized');
        throw new Error('Firestore not available');
      }

      const fileId = `${userId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `user-files/${fileId}`);
      
      // Upload file to Firebase Storage
      console.log('📤 Uploading file to Storage...');
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      console.log('✅ File uploaded to Storage');
      
      // Save file metadata to Firestore
      const fileMetadata: Omit<FileMetadata, 'id'> = {
        userId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || file.name.split('.').pop() || 'unknown',
        fileUrl,
        uploadedAt: serverTimestamp() as Timestamp,
        sessionId,
        processed: false
      };
      
      const metadataRef = await addDoc(collection(db, 'fileMetadata'), fileMetadata);
      console.log('✅ File metadata saved to Firestore');
      
      return { id: metadataRef.id, ...fileMetadata };
    } catch (error) {
      console.error('❌ Failed to upload file:', error);
      throw error;
    }
  },

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const docRef = doc(db, 'fileMetadata', fileId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FileMetadata;
    }
    return null;
  },

  async updateFileMetadata(fileId: string, updates: Partial<FileMetadata>) {
    await setDoc(doc(db, 'fileMetadata', fileId), updates, { merge: true });
  },

  async getUserFiles(userId: string): Promise<FileMetadata[]> {
    const q = query(
      collection(db, 'fileMetadata'),
      where('userId', '==', userId),
      orderBy('uploadedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileMetadata));
  },

  async deleteFile(fileId: string, fileUrl: string) {
    console.log('🗑️ Deleting file:', { fileId, fileUrl });

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'fileMetadata', fileId));
      console.log('✅ Deleted from Firestore:', fileId);

      // Delete from Storage
      const storageRef = ref(storage, fileUrl);
      await deleteObject(storageRef);
      console.log('✅ Deleted from Storage:', fileUrl);
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      throw error;
    }
  },

  // Batch delete files
  async deleteFiles(files: { id: string, fileUrl: string }[]) {
    console.log('🗑️ Batch deleting files:', files.length);

    for (const file of files) {
      try {
        await this.deleteFile(file.id, file.fileUrl);
      } catch (error) {
        console.error(`❌ Failed to delete file ${file.id}:`, error);
        // Continue with other files even if one fails
      }
    }

    console.log('✅ Batch delete completed');
  },

  // Project Management Functions

  // Create a new project
  async createProject(userId: string, title: string, description: string): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const projectData: Omit<Project, 'id'> = {
        userId,
        title,
        description,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        isStarred: false,
        status: 'active'
      };

      const projectRef = await addDoc(collection(db, 'projects'), projectData);
      console.log('✅ Project created:', projectRef.id);
      return projectRef.id;
    } catch (error) {
      console.error('❌ Failed to create project:', error);
      throw error;
    }
  },

  // Get user's projects
  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const q = query(
        collection(db, 'projects'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
    } catch (error) {
      console.error('❌ Failed to get user projects:', error);
      throw error;
    }
  },

  // Update project
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      await setDoc(doc(db, 'projects', projectId), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Project updated:', projectId);
    } catch (error) {
      console.error('❌ Failed to update project:', error);
      throw error;
    }
  },

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      await setDoc(doc(db, 'projects', projectId), {
        status: 'deleted',
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Project deleted:', projectId);
    } catch (error) {
      console.error('❌ Failed to delete project:', error);
      throw error;
    }
  },

  // Project Chat Session Management

  // Create a new chat session within a project
  async createProjectChatSession(projectId: string, userId: string, title: string, preview: string): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const sessionData: Omit<ProjectChatSession, 'id'> = {
        projectId,
        userId,
        title,
        preview,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        status: 'active'
      };

      const sessionRef = await addDoc(collection(db, 'projectChatSessions'), sessionData);
      console.log('✅ Project chat session created:', sessionRef.id);
      return sessionRef.id;
    } catch (error) {
      console.error('❌ Failed to create project chat session:', error);
      throw error;
    }
  },

  // Get chat sessions for a specific project
  async getProjectChatSessions(projectId: string): Promise<ProjectChatSession[]> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const q = query(
        collection(db, 'projectChatSessions'),
        where('projectId', '==', projectId),
        where('status', '==', 'active'),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectChatSession));
    } catch (error) {
      console.error('❌ Failed to get project chat sessions:', error);
      throw error;
    }
  },

  // Update project chat session
  async updateProjectChatSession(sessionId: string, updates: Partial<ProjectChatSession>): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      await setDoc(doc(db, 'projectChatSessions', sessionId), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Project chat session updated:', sessionId);
    } catch (error) {
      console.error('❌ Failed to update project chat session:', error);
      throw error;
    }
  },

  // Delete project chat session
  async deleteProjectChatSession(sessionId: string): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      await setDoc(doc(db, 'projectChatSessions', sessionId), {
        status: 'deleted',
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Project chat session deleted:', sessionId);
    } catch (error) {
      console.error('❌ Failed to delete project chat session:', error);
      throw error;
    }
  }
};