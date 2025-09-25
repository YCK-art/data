'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import DataTable from '../Table/DataTable'
import FileSystem from '../FileSystem/FileSystem'
import ChatSearch from './ChatSearch'
import AppConnector from '../AppConnector/AppConnector'
import Settings from '../Settings/Settings'
import Projects from '../Projects/Projects'
import PlotlyChart from '../Chart/PlotlyChart'
import { apiService } from '@/services/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { authService } from '@/services/auth'
import { firestoreService, ChatSession } from '@/services/firestore'
import { userService } from '@/services/userService'
import { User } from 'firebase/auth'
import { RiSideBarLine } from 'react-icons/ri'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean  // 스트리밍 상태 추적
  chartData?: any
  insights?: string[]
  followUpQuestions?: string[]
  fileInfo?: {
    filename: string
    fileSize: number
    fileType: 'csv' | 'excel'
    file_id: string
  }
  tableData?: {
    data: any[]
    columns: string[]
    filename: string
  }
  codeExecution?: {
    codeChunks: string[]
    isExecuting: boolean
    result?: string
    output?: string  // 실행 결과 출력
  }
}

export default function ChatInterface() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<any>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentSessionId')
    }
    return null
  })
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentProjectId')
    }
    return null
  })
  const [isProjectChat, setIsProjectChat] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isProjectChat') === 'true'
    }
    return false
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true'
    }
    return false
  })
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<'chat' | 'filesystem' | 'chatsearch' | 'appconnector' | 'settings' | 'projects'>('chat')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [expandedChart, setExpandedChart] = useState<{chartData: any, title: string} | null>(null)
  const [panelWidth, setPanelWidth] = useState(50) // 차트 패널 너비 (퍼센트)
  const [inputKey, setInputKey] = useState(Date.now()) // ChatInput 강제 리렌더링용
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean
    sessionId: string | null
    sessionTitle: string | null
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: null
  })
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const resizerRef = useRef<HTMLDivElement>(null)
  
  // 사용자 정보 캐싱을 위한 state 추가
  const [cachedUserInfo, setCachedUserInfo] = useState<{
    initial: string
    displayName: string
    email: string | null
  } | null>(() => {
    // localStorage에서 캐시된 사용자 정보 로드
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cachedUserInfo')
      return cached ? JSON.parse(cached) : null
    }
    return null
  })
  const { sendMessage: sendWebSocketMessage, lastMessage, isConnected } = useWebSocket(false)
  const router = useRouter()

  // 사용자 정보 업데이트 및 캐싱
  const updateUserCache = (user: User | null) => {
    if (!user) {
      setCachedUserInfo(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cachedUserInfo')
      }
      return
    }

    const userInfo = {
      initial: getUserInitial(user),
      displayName: getUserDisplayName(user),
      email: user.email
    }

    setCachedUserInfo(userInfo)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cachedUserInfo', JSON.stringify(userInfo))
    }
  }

  // 사용자 이니셜 추출 함수
  const getUserInitial = (user: User | null): string => {
    if (!user) return '?'
    
    // displayName이 있으면 첫 글자 사용
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase()
    }
    
    // email에서 @ 앞 첫 글자 사용
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    
    return '?'
  }

  // 사용자 이름 추출 함수 (개선)
  const getUserDisplayName = (user: User | null): string => {
    if (!user) return '사용자'
    
    // displayName이 있으면 사용
    if (user.displayName) {
      return user.displayName
    }
    
    // Google 로그인의 경우 email에서 이름 부분 추출 시도
    if (user.email) {
      const emailPrefix = user.email.split('@')[0]
      
      // Gmail의 경우 점(.)을 공백으로 변환하여 이름처럼 표시
      if (user.email.includes('@gmail.com')) {
        const nameParts = emailPrefix.split('.')
        if (nameParts.length > 1) {
          // 각 단어의 첫 글자를 대문자로 변환
          return nameParts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        }
      }
      
      // 일반적인 경우 첫 글자만 대문자로
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    }
    
    return '사용자'
  }

  // 새 채팅 시작 함수 (테스트용)
  const startNewChat = () => {
    console.log('🆕 Starting new chat - clearing current session')
    setCurrentSessionId(null)
    updateCurrentSessionId(null)
    setMessages([])
    localStorage.removeItem('currentSessionId')
    console.log('✅ Session cleared, ready for new chat')
  }

  // currentSessionId 업데이트 시 localStorage에도 저장
  const updateCurrentSessionId = (sessionId: string | null) => {
    setCurrentSessionId(sessionId)
    if (typeof window !== 'undefined') {
      if (sessionId) {
        localStorage.setItem('currentSessionId', sessionId)
      } else {
        localStorage.removeItem('currentSessionId')
      }
    }
  }

  // 프로젝트 컨텍스트 업데이트
  const updateProjectContext = (projectId: string | null, isProject: boolean = false) => {
    setCurrentProjectId(projectId)
    setIsProjectChat(isProject)
    if (typeof window !== 'undefined') {
      if (projectId) {
        localStorage.setItem('currentProjectId', projectId)
        localStorage.setItem('isProjectChat', isProject.toString())
      } else {
        localStorage.removeItem('currentProjectId')
        localStorage.removeItem('isProjectChat')
      }
    }
  }

  // 새 채팅 시작 시 프로젝트 컨텍스트 클리어
  const clearProjectContext = () => {
    updateProjectContext(null, false)
  }

  // Hydration 문제 해결을 위한 mounted 상태 관리
  useEffect(() => {
    setMounted(true)
  }, [])

  // 메뉴 외부 클릭시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // 채팅 히스토리 메뉴 외부 클릭 처리
      if (openMenuId !== null) {
        if (!target.closest('[data-menu-container]')) {
          setOpenMenuId(null);
        }
      }
      
      // 프로필 메뉴 외부 클릭 처리
      if (isProfileMenuOpen) {
        if (!target.closest('[data-profile-menu]')) {
          setIsProfileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId, isProfileMenuOpen]);

  // ESC 키로 삭제 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && deleteConfirmModal.isOpen) {
        handleDeleteChatCancel();
      }
    };

    if (deleteConfirmModal.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteConfirmModal.isOpen]);

  // currentSessionId 변화 추적
  useEffect(() => {
    console.log('🔄 currentSessionId changed:', {
      previous: 'previous value',
      current: currentSessionId,
      timestamp: new Date().toISOString()
    })
  }, [currentSessionId])

  // 프로젝트 컨텍스트 변화 시 채팅 히스토리 다시 로드
  useEffect(() => {
    if (user) {
      console.log('🔄 Project context changed:', { currentProjectId, isProjectChat })
      loadChatHistory(user)
    }
  }, [currentProjectId, isProjectChat, user])

  // 인증 상태 확인 및 redirect 결과 체크
  useEffect(() => {
    // 페이지 로드 시 redirect 결과 먼저 확인
    const checkAuth = async () => {
      try {
        // redirect 결과 확인
        await authService.checkRedirectResult();
      } catch (error) {
        console.warn('Redirect check failed:', error);
      }
    };

    checkAuth();

    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        console.log('User authenticated:', user.email)
        setUser(user)
        // 사용자 정보 캐시 업데이트
        updateUserCache(user)
        // Firestore 오류에 관계없이 사용자 상태 유지
        initializeChatSession(user).catch(error => {
          console.warn('⚠️ Chat initialization failed but user remains authenticated:', error)
        })
      } else {
        console.log('User not authenticated, redirecting to home')
        // 로그아웃 시 현재 세션 정보 클리어
        updateCurrentSessionId(null)
        updateUserCache(null) // 사용자 캐시도 클리어
        setMessages([])
        setUploadedFile(null)
        setChatHistory([])
        // 로그인되지 않은 경우 랜딩페이지로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  // 채팅 히스토리 불러오기
  const loadChatHistory = async (user: User) => {
    try {
      console.log('📚 Loading chat history for:', user.uid)
      const sessions = await firestoreService.getChatSessions(user.uid)

      console.log('📋 Raw sessions from Firestore:', sessions)

      // 사이드바에는 모든 채팅 히스토리 표시 (프로젝트 필터링 제거)
      setChatHistory(sessions)
      console.log('✅ Chat history loaded and set:', sessions.length, 'sessions')

      // 각 세션의 제목도 로깅
      sessions.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.title} (${session.id})`)
      })
    } catch (error) {
      console.warn('⚠️ Failed to load chat history (continuing without it):', error)
      setChatHistory([])
    }
  }

  // 채팅 세션 초기화 - 단순화
  const initializeChatSession = async (user: User) => {
    console.log('🚀 Initializing chat for:', user.email)

    // 저장된 프로젝트 컨텍스트 확인 및 설정
    const savedProjectId = localStorage.getItem('currentProjectId')
    const savedIsProjectChat = localStorage.getItem('isProjectChat') === 'true'

    if (savedProjectId && savedIsProjectChat) {
      updateProjectContext(savedProjectId, true)
      console.log('🔄 Restored project context:', savedProjectId)
    }

    // 채팅 히스토리 불러오기 (프로젝트 컨텍스트에 따라 필터링됨)
    await loadChatHistory(user)

    // 저장된 세션이 있으면 복원, 없으면 환영 메시지 표시
    const savedSessionId = localStorage.getItem('currentSessionId')
    if (savedSessionId && savedSessionId !== currentSessionId) {
      console.log('🔄 Restoring saved session:', savedSessionId)
      try {
        // 저장된 세션의 메시지 불러오기
        await handleSessionClick(savedSessionId)
        return // 세션 복원 완료, 환영 메시지는 표시하지 않음
      } catch (error) {
        console.warn('⚠️ Failed to restore saved session, showing welcome message:', error)
        localStorage.removeItem('currentSessionId') // 잘못된 세션 ID 제거
      }
    }
    
    // 환영 메시지 표시 (저장된 세션이 없거나 복원 실패한 경우)
    const welcomeMessage: Message = {
      id: '1',
      type: 'assistant',
      content: t('auth.welcomeMessage'),
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    
    // 환영 메시지 표시 시 currentSessionId를 null로 설정 (히스토리 하이라이트 제거)
    updateCurrentSessionId(null)

    // 사용자 저장 시도
    try {
      await userService.createOrUpdateUser(user);
      console.log('✅ User saved successfully')
      
      // 자동 세션 생성 제거 - 사용자가 직접 채팅을 시작할 때까지 대기
      // const sessionId = await firestoreService.createChatSession(user.uid)
      // setCurrentSessionId(sessionId)
      // console.log('✅ Chat session created')

      // 기존 히스토리만 불러오기 (새 세션 생성 안함)
      // await loadChatHistory(user)

    } catch (error) {
      console.warn('⚠️ Failed to initialize Firestore (continuing with temp session):', error)
      updateCurrentSessionId(`temp_${Date.now()}`)
    }
  }

  const scrollToBottom = (immediate = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: immediate ? 'instant' : 'smooth',
        block: 'end'
      })
    }
  }

  // 스크롤 위치를 감지하여 자동 스크롤 활성화/비활성화
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    if (!target) return

    const { scrollTop, scrollHeight, clientHeight } = target
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50 // 50px 여유

    setIsAutoScrollEnabled(isNearBottom)
  }




  // 차트 확대 상태를 boolean으로 변환하여 dependency 안정화
  const isChartExpanded = !!expandedChart

  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-messages-container')
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll)
      return () => chatContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 자동 스크롤: 새로운 메시지가 추가되거나 로딩 중일 때 자동으로 맨 아래로 스크롤
  // 단, 차트 확대 상태일 때는 자동 스크롤 비활성화
  useEffect(() => {
    // 차트 확대 상태에서는 자동 스크롤 비활성화
    if (isChartExpanded) return

    // 메시지가 있거나 로딩 중일 때 자동 스크롤 (자동 스크롤이 활성화된 경우만)
    if ((messages.length > 0 || isLoading) && isAutoScrollEnabled) {
      // 약간의 지연을 두어 DOM 업데이트를 기다린 후 스크롤
      const timer = setTimeout(() => scrollToBottom(false), 100)
      return () => clearTimeout(timer)
    }
  }, [messages, isLoading, isChartExpanded, isAutoScrollEnabled])

  // 로딩 중일 때 지속적인 스크롤 (ChatGPT처럼)
  // 단, 차트 확대 상태일 때는 자동 스크롤 비활성화
  useEffect(() => {
    // 차트 확대 상태에서는 자동 스크롤 비활성화
    if (isChartExpanded) return

    if (isLoading && isAutoScrollEnabled) {
      const interval = setInterval(() => {
        scrollToBottom(false)
      }, 500) // 0.5초마다 스크롤 확인

      return () => clearInterval(interval)
    }
  }, [isLoading, isChartExpanded, isAutoScrollEnabled])

  // 타임스탬프 포맷팅
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ''
    
    let date: Date
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      date = new Date(timestamp)
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    
    return date.toLocaleDateString('ko-KR')
  }

  // 세션 클릭 핸들러
  const handleSessionClick = async (sessionId: string) => {
    console.log('🎯 handleSessionClick called with:', { sessionId, currentSessionId, hasUser: !!user })
    
    if (!user) {
      console.log('❌ No user available for session click')
      return
    }
    
    if (sessionId === currentSessionId) {
      console.log('🔄 Session click ignored - same session:', sessionId)
      return
    }
    
    try {
      console.log('🔄 Loading session:', sessionId)
      console.log('🔄 Current user:', user.uid)
      console.log('🔄 Previous sessionId:', currentSessionId)
      
      updateCurrentSessionId(sessionId)
      console.log('✅ Updated currentSessionId to:', sessionId)
      
      // 채팅 페이지로 전환
      setCurrentPage('chat')
      console.log('📱 Switched to chat page')
      
      // 선택한 세션의 메시지들 불러오기
      console.log('📡 Fetching messages for session:', sessionId)
      const sessionMessages = await firestoreService.getMessages(sessionId)
      console.log('📨 Raw messages from Firestore:', sessionMessages)
      console.log('📨 Number of messages found:', sessionMessages.length)
      
      if (sessionMessages.length === 0) {
        console.warn('⚠️ No messages found for session:', sessionId)
        setMessages([])
        setUploadedFile(null) // 메시지가 없으면 파일도 없음
        return
      }
      
      // 메시지 형식 변환 및 파일 정보 복구
      let sessionFileInfo = null
      const convertedMessages: Message[] = sessionMessages.map((msg, index) => {
        console.log(`📝 Converting message ${index + 1}:`, msg)
        
        // 파일 정보가 있는 메시지에서 파일 정보 추출
        if (msg.fileInfo && !sessionFileInfo && msg.fileInfo.file_id) {
          console.log('📁 Found file info in message:', msg.fileInfo)
          sessionFileInfo = {
            file_id: msg.fileInfo.file_id, // 실제 file_id 사용 (restored_ 생성 방지)
            name: msg.fileInfo.filename,
            size: msg.fileInfo.fileSize,
            columns: msg.tableData?.columns || [],
            rows: msg.tableData?.data?.length || 0,
            preview: msg.tableData?.data || [],
            restored: false // file_id가 있으므로 복구된 파일이 아님
          }
        }
        
        return {
          id: msg.id || msg.timestamp?.toString() || `msg-${index}`,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp || Date.now()),
          chartData: msg.chartData,
          insights: msg.insights,
          followUpQuestions: msg.followUpQuestions,
          fileInfo: msg.fileInfo,
          tableData: msg.tableData,
          codeExecution: msg.codeExecution
        }
      })
      
      console.log('✅ Converted messages:', convertedMessages)
      setMessages(convertedMessages)

      // 세션 전환 시 입력 컴포넌트 강제 리렌더링
      setInputKey(Date.now())
      
      // 세션에 파일 정보가 있으면 복구
      if (sessionFileInfo) {
        console.log('📁 Restoring file info for session:', sessionFileInfo)
        setUploadedFile(sessionFileInfo)
      } else {
        // 파일이 없으면 초기화
        setUploadedFile(null)
        // 세션에서 Firestore에 저장된 파일 정보 확인
        try {
          const sessionData = await firestoreService.getChatSession(sessionId)
          if (sessionData?.fileId && sessionData?.fileName) {
            console.log('📁 Found file info in session metadata:', sessionData)
            setUploadedFile({
              file_id: sessionData.fileId, // 실제 file_id 사용
              name: sessionData.fileName,
              size: 0, // 정확한 크기는 알 수 없음
              restored: false, // 실제 file_id가 있으므로 복구된 파일이 아님
              fileUrl: sessionData.fileUrl
            })
          } else {
            setUploadedFile(null)
          }
        } catch (error) {
          console.warn('⚠️ Could not restore file info from session metadata:', error)
          setUploadedFile(null)
        }
      }
      
      console.log('✅ Session loaded with', convertedMessages.length, 'messages')
      
    } catch (error) {
      console.error('❌ Failed to load session:', error)
      console.error('❌ Error details:', error.message)
      setUploadedFile(null)
    }
  }

  const handleFollowUpClick = (question: string) => {
    handleSendMessage(question)
  }

  const handleMessageUpdate = (messageId: string, updates: Partial<Message>) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    )
  }

  // 채팅 메뉴 액션들
  const handleRenameChat = (sessionId: string) => {
    // TODO: 이름 변경 기능 구현
    console.log('Rename chat:', sessionId)
    setOpenMenuId(null)
  }

  const handleShareChat = (sessionId: string) => {
    // TODO: 공유 기능 구현
    console.log('Share chat:', sessionId)
    setOpenMenuId(null)
  }

  const handleDeleteChatClick = (sessionId: string, sessionTitle: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      sessionId,
      sessionTitle
    })
    setOpenMenuId(null)
  }

  const handleDeleteChatConfirm = async () => {
    if (!user || !deleteConfirmModal.sessionId) return

    try {
      await firestoreService.deleteChatSession(deleteConfirmModal.sessionId)
      // 채팅 히스토리 새로고침
      await loadChatHistory(user)
      // 현재 선택된 세션이 삭제된 경우 초기화
      if (currentSessionId === deleteConfirmModal.sessionId) {
        updateCurrentSessionId(null)
        setMessages([])
        setUploadedFile(null)
      }
      console.log('Chat deleted:', deleteConfirmModal.sessionId)
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }

    // 모달 닫기
    setDeleteConfirmModal({
      isOpen: false,
      sessionId: null,
      sessionTitle: null
    })
  }

  const handleDeleteChatCancel = () => {
    setDeleteConfirmModal({
      isOpen: false,
      sessionId: null,
      sessionTitle: null
    })
  }

  // 차트 확대 기능
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0)


  const handleChartExpand = (chartData: any, title: string) => {
    // 현재 스크롤 위치 저장
    const chatMessagesContainer = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement
    if (chatMessagesContainer) {
      const scrollTop = chatMessagesContainer.scrollTop
      setSavedScrollPosition(scrollTop)
      console.log('💾 Saved scroll position:', scrollTop)
    }

    setExpandedChart({ chartData, title })
  }

  const handleChartClose = () => {
    setExpandedChart(null)

    // 저장된 스크롤 위치로 복원
    setTimeout(() => {
      const chatMessagesContainer = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement
      if (chatMessagesContainer && savedScrollPosition > 0) {
        chatMessagesContainer.scrollTop = savedScrollPosition
        console.log('🔄 Restored scroll position:', savedScrollPosition)
      }
    }, 100) // DOM 업데이트 대기
  }

  // 리사이저 기능
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!resizerRef.current?.contains(e.target as Node)) return

      const startX = e.clientX
      const startWidth = panelWidth

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX
        // 사이드바 너비를 동적으로 계산 (min-width 고려)
        const sidebarWidth = isSidebarCollapsed ? Math.max(64, window.innerWidth * 0.064) : Math.max(256, window.innerWidth * 0.256)
        const containerWidth = Math.max(320, window.innerWidth - sidebarWidth) // 최소 320px 보장
        const deltaPercent = (deltaX / containerWidth) * 100

        // 화면 크기에 따른 동적 제한
        const minWidth = window.innerWidth < 768 ? 30 : 20 // 모바일에서 최소 30%
        const maxWidth = window.innerWidth < 768 ? 70 : 80 // 모바일에서 최대 70%

        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth - deltaPercent))
        setPanelWidth(newWidth)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'default'
        document.body.style.userSelect = 'auto'

        // 리사이즈 완료 후 차트 리사이즈 트리거
        setTimeout(() => {
          if (window.Plotly && expandedChart) {
            const chartElements = document.querySelectorAll('.plotly-chart-container')
            chartElements.forEach((element) => {
              window.Plotly.Plots.resize(element)
            })
          }
        }, 100)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [panelWidth, isSidebarCollapsed, expandedChart])

  // 윈도우 리사이즈 시 차트 리사이즈 및 반응형 처리
  useEffect(() => {
    const handleWindowResize = () => {
      // 차트 리사이즈
      if (window.Plotly && expandedChart) {
        setTimeout(() => {
          const chartElements = document.querySelectorAll('.plotly-chart-container')
          chartElements.forEach((element) => {
            window.Plotly.Plots.resize(element)
          })
        }, 100)
      }

      // 작은 화면에서 사이드바 자동 축소
      if (window.innerWidth < 768 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
        if (typeof window !== 'undefined') {
          localStorage.setItem('sidebarCollapsed', 'true')
        }
      }

      // 차트 패널 너비 조정 (화면이 너무 작아지면)
      if (expandedChart && window.innerWidth < 1024) {
        const newMaxWidth = window.innerWidth < 768 ? 70 : 75
        if (panelWidth > newMaxWidth) {
          setPanelWidth(newMaxWidth)
        }
      }
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [expandedChart, isSidebarCollapsed, panelWidth])

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await authService.signOut()
      setIsProfileMenuOpen(false)
      console.log('✅ Logout successful')
    } catch (error) {
      console.error('❌ Logout failed:', error)
    }
  }

  // 새 채팅 시작
  const handleNewChat = async () => {
    if (!user) return

    console.log('🆕 Starting new chat (default welcome screen)')

    // 세션 ID를 null로 설정 (히스토리 하이라이트 제거)
    updateCurrentSessionId(null)

    // 프로젝트 컨텍스트 클리어 (전역 채팅으로 전환)
    clearProjectContext()

    // 환영 메시지만 표시 (세션 생성 안함)
    const welcomeMessage: Message = {
      id: '1',
      type: 'assistant',
      content: t('auth.welcomeMessage'),
      timestamp: new Date()
    }
    setMessages([welcomeMessage])

    // 파일 정보 초기화 (새 채팅이므로)
    setUploadedFile(null)

    // 채팅 입력 컴포넌트 강제 리렌더링을 위한 키 업데이트
    setInputKey(Date.now())

    // 채팅 히스토리 다시 로드 (전역 채팅만 표시)
    await loadChatHistory(user)

    console.log('✅ Default welcome screen displayed (no session created yet)')
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !user) return

    // 새 메시지 전송 시 자동 스크롤 다시 활성화
    setIsAutoScrollEnabled(true)

    // 세션이 없으면 새로 생성
    let sessionId = currentSessionId
    let isNewSession = false
    console.log('🔍 Current sessionId:', sessionId, 'from localStorage:', localStorage.getItem('currentSessionId'))

    // 개발 테스트를 위해 새 세션 강제 생성 (테스트 후 제거 필요)
    if (!sessionId || sessionId.startsWith('temp_')) {
      try {
        // 첫 메시지로 즉시 제목 생성
        console.log('🏷️ Generating title for new session with first message:', content)

        let generatedTitle = '새 채팅' // 기본값
        try {
          const titleResponse = await apiService.generateChatTitle(content)
          generatedTitle = titleResponse.title || '새 채팅'
          console.log('✅ Title generated successfully:', generatedTitle)
        } catch (titleError) {
          console.error('❌ Failed to generate title, using default:', titleError)
          // 제목 생성 실패해도 계속 진행
        }

        sessionId = await firestoreService.createChatSession(user.uid, generatedTitle)
        updateCurrentSessionId(sessionId)
        isNewSession = true
        console.log('✅ New session created with title:', sessionId, generatedTitle)

        // 새 세션 생성 직후 즉시 히스토리 새로고침
        try {
          console.log('🔄 Refreshing chat history immediately after session creation')
          await loadChatHistory(user)
        } catch (historyError) {
          console.warn('⚠️ Failed to reload chat history after session creation:', historyError)
        }
      } catch (error) {
        console.error('❌ Failed to create session:', error)
        sessionId = `temp_${Date.now()}`
        updateCurrentSessionId(sessionId)
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    // 초기 AI 응답 메시지 생성 (항상 "처리 중..." 으로 시작)
    const assistantMessageId = (Date.now() + 1).toString()
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '처리 중...',
      timestamp: new Date(),
      isStreaming: true  // 스트리밍 시작
    }

    setMessages(prev => [...prev, initialAssistantMessage])

    // 첫 번째 사용자 메시지인지 확인 (환영 메시지 제외)
    const isFirstUserMessage = messages.length <= 1 || messages.filter(m => m.type === 'user').length === 0

    try {
      // Firestore에 사용자 메시지 저장 시도 (실패해도 계속 진행)
      if (sessionId && !sessionId.startsWith('temp_')) {
        try {
          console.log('💾 Attempting to save user message:', {
            sessionId,
            userId: user.uid,
            messageType: userMessage.type,
            contentLength: userMessage.content.length
          })

          await firestoreService.addMessage({
            sessionId: sessionId,
            userId: user.uid,
            type: userMessage.type,
            content: userMessage.content,
            timestamp: userMessage.timestamp as any
          })
          console.log('✅ User message saved to Firestore successfully')
        } catch (firestoreError: any) {
          console.error('❌ CRITICAL: Failed to save user message:', {
            error: firestoreError,
            errorMessage: firestoreError?.message,
            errorCode: firestoreError?.code,
            sessionId,
            userId: user.uid,
            userMessageId: userMessage.id
          })
        }
      } else {
        console.log('⚠️ Skipping user message save:', {
          sessionId,
          isTemp: sessionId?.startsWith('temp_'),
          reason: !sessionId ? 'No session ID' : 'Temporary session'
        })
      }

      // WebSocket으로 분석 시작 알림
      if (isConnected) {
        sendWebSocketMessage({ type: 'start_analysis' })
      }

      // 통합 API를 사용한 AI 응답 생성
      let assistantMessage: Message;

      try {
        // 복원된 파일인지 확인 (restored_ 접두사로 시작하는 경우)
        if (uploadedFile && uploadedFile.file_id.startsWith('restored_')) {
          assistantMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: '죄송합니다. 이 채팅에서 사용된 파일이 더 이상 서버에 존재하지 않습니다. 새로운 파일을 업로드해주세요.',
            timestamp: new Date()
          }
        } else {
          // 대화 히스토리 준비 (최근 10개 메시지만)
          const conversationHistory = messages
            .filter(msg => msg.type === 'user' || msg.type === 'assistant')
            .slice(-10)
            .map(msg => ({
              role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
              content: msg.content,
              timestamp: msg.timestamp.toISOString()
            }))

          // 최종 메시지 상태 추적용
          let finalAssistantMessage: Message = { ...initialAssistantMessage }
          let textBuffer = '' // textBuffer를 외부 스코프에 선언

          // 스트리밍 시작
          await apiService.askUnifiedQuestionStream(
            {
              question: content,
              file_id: uploadedFile?.file_id || null,
              conversation_history: conversationHistory
            },
            // onChunk: ChatGPT 스타일 실시간 메시지 업데이트 (최적화됨)
            (() => {
              let lastTextUpdate = 0
              const TEXT_UPDATE_THROTTLE = 0 // Disable throttling temporarily

              return (chunk) => {
                console.log('📦 Received chunk:', chunk.type, chunk.content?.substring?.(0, 20))

                // text_stream의 경우에만 throttling 적용 (code_stream은 즉시 처리)
                if (chunk.type === 'text_stream') {
                  textBuffer += chunk.content
                  const now = Date.now()

                  if (now - lastTextUpdate < TEXT_UPDATE_THROTTLE) {
                    // throttling으로 UI 업데이트는 건너뛰지만 텍스트는 계속 처리
                    // textBuffer가 누적되어 다음 업데이트에서 반영됨
                    return // Skip UI update but continue accumulating
                  }
                  lastTextUpdate = now
                }

                // code_stream은 즉시 처리 (throttling 없음)
                if (chunk.type === 'code_stream') {
                  console.log('🔥 Processing code_stream immediately:', chunk.content)
                }

                setMessages(prevMessages => {
                  return prevMessages.map(msg => {
                    if (msg.id === assistantMessageId) {
                      const updatedMessage = { ...msg }

                      switch (chunk.type) {
                        case 'analysis_start':
                        case 'step_update':
                          // "처리 중..." 을 실제 분석 단계로 업데이트
                          updatedMessage.content = chunk.content
                          break

                        case 'code_complete_display':
                          // 완성된 코드를 한 번에 표시
                          updatedMessage.codeExecution = {
                            codeChunks: chunk.code.split('\n').filter(line => line.trim()),
                            isExecuting: true,
                            result: '',
                            output: ''
                          }
                          // 코드가 표시된 후에는 content 업데이트를 중단
                          updatedMessage.content = ''
                          break

                        case 'code_stream':
                          // 더 이상 사용하지 않음 (완성된 코드만 표시)
                          break

                        case 'code_execution_result':
                          // 코드 실행 완료
                          if (updatedMessage.codeExecution) {
                            updatedMessage.codeExecution.isExecuting = false
                            updatedMessage.codeExecution.result = chunk.content
                            updatedMessage.codeExecution.output = chunk.content
                          }
                          break

                        case 'chart_generated':
                          // 차트가 생성되면 표시
                          updatedMessage.chartData = chunk.chartData
                          break


                        case 'insights_generated':
                          // 인사이트 표시 비활성화 (text_stream으로 통합)
                          // updatedMessage.insights = chunk.insights
                          break

                        case 'analysis_complete':
                          // 코드가 없는 경우에만 최종 텍스트 응답 적용
                          if (!updatedMessage.codeExecution && textBuffer) {
                            updatedMessage.content += textBuffer
                            textBuffer = ''
                          }
                          updatedMessage.chartData = chunk.chartData
                          // insights 제거: updatedMessage.insights = chunk.insights
                          updatedMessage.followUpQuestions = chunk.followUpQuestions || []
                          if (chunk.codeExecution) {
                            updatedMessage.codeExecution = chunk.codeExecution
                          }
                          updatedMessage.isStreaming = false  // 스트리밍 완료
                          break

                        case 'text_stream':
                          // 코드가 실행 중일 때만 텍스트 업데이트 중단 (완료 후에는 허용)
                          console.log('🔤 text_stream case:', {
                            hasCodeExecution: !!updatedMessage.codeExecution,
                            isExecuting: updatedMessage.codeExecution?.isExecuting,
                            chunkContent: chunk.content,
                            currentContent: updatedMessage.content.substring(0, 50)
                          })
                          const canAddText = !updatedMessage.codeExecution || !updatedMessage.codeExecution.isExecuting
                          console.log('🔍 Can add text?', canAddText)

                          if (canAddText && chunk.content) {
                            console.log('💬 Adding chunk content to message:', chunk.content.substring(0, 50))
                            const beforeLength = updatedMessage.content.length
                            updatedMessage.content += chunk.content
                            console.log(`📝 Content updated: ${beforeLength} -> ${updatedMessage.content.length}`)
                          } else if (!canAddText) {
                            console.log('🚫 Text blocked due to code execution')
                          }
                          break

                        case 'error':
                          updatedMessage.content = chunk.content
                          if (updatedMessage.codeExecution) {
                            updatedMessage.codeExecution.isExecuting = false
                          }
                          updatedMessage.isStreaming = false  // 에러 시에도 스트리밍 종료
                          break

                        default:
                          // 기본적으로 콘텐츠 업데이트
                          if (chunk.content) {
                            updatedMessage.content = chunk.content
                          }
                          break
                      }

                      // 최종 메시지 상태를 추적
                      finalAssistantMessage = { ...updatedMessage }
                      return updatedMessage
                    }
                    return msg
                  })
                })
              }

            })(),
            // onError
            (error) => {
              console.error('스트리밍 오류:', error)
              setMessages(prevMessages => {
                return prevMessages.map(msg => {
                  if (msg.id === assistantMessageId) {
                    return {
                      ...msg,
                      content: `분석 중 오류가 발생했습니다: ${error.message}`,
                      codeExecution: msg.codeExecution ? {
                        ...msg.codeExecution,
                        isExecuting: false
                      } : undefined
                    }
                  }
                  return msg
                })
              })
            },
            // onComplete
            async () => {
              console.log('✅ 스트리밍 완료, 남은 textBuffer:', textBuffer.length)

              // 남은 textBuffer 처리
              if (textBuffer) {
                console.log('🔄 onComplete에서 남은 textBuffer 처리:', textBuffer.substring(0, 100))
                setMessages(prevMessages => {
                  return prevMessages.map(msg => {
                    if (msg.id === assistantMessageId) {
                      console.log('🔄 최종 content 업데이트:', msg.content.length, '->', msg.content.length + textBuffer.length)
                      return {
                        ...msg,
                        content: msg.content + textBuffer
                      }
                    }
                    return msg
                  })
                })
                textBuffer = ''
              }

              // 스트리밍 완료 후 Firestore에 최종 메시지 저장
              if (sessionId && !sessionId.startsWith('temp_')) {
                try {
                  console.log('💾 Saving final message to Firestore:', finalAssistantMessage)

                  const messageData: any = {
                    sessionId: sessionId,
                    userId: user.uid,
                    type: finalAssistantMessage.type,
                    content: finalAssistantMessage.content,
                    timestamp: finalAssistantMessage.timestamp as any
                  }

                  // 추가 데이터들 포함
                  if (finalAssistantMessage.chartData) {
                    messageData.chartData = finalAssistantMessage.chartData
                  }
                  if (finalAssistantMessage.insights) {
                    messageData.insights = finalAssistantMessage.insights
                  }
                  if (finalAssistantMessage.followUpQuestions) {
                    messageData.followUpQuestions = finalAssistantMessage.followUpQuestions
                  }
                  if (finalAssistantMessage.fileInfo) {
                    messageData.fileInfo = finalAssistantMessage.fileInfo
                  }
                  if (finalAssistantMessage.tableData) {
                    messageData.tableData = finalAssistantMessage.tableData
                  }
                  if (finalAssistantMessage.codeExecution) {
                    messageData.codeExecution = finalAssistantMessage.codeExecution
                  }

                  await firestoreService.addMessage(messageData)
                  console.log('✅ 스트리밍 완료된 메시지가 Firestore에 저장됨')

                  // 항상 히스토리 새로고침 (새 세션이거나 기존 세션이거나)
                  try {
                    console.log('🔄 Refreshing chat history after message completion')
                    await loadChatHistory(user)
                  } catch (historyError) {
                    console.warn('⚠️ Failed to reload chat history:', historyError)
                  }
                } catch (firestoreError: any) {
                  console.error('❌ 스트리밍 완료 후 Firestore 저장 실패:', firestoreError)
                }
              }
            }
          )

          // 스트리밍 처리 완료, 기존 로직 건너뛰기
          return
        }
      } catch (error) {
        console.error('Unified question error:', error)
        // 스트리밍 실패 시 기존 메시지를 에러 메시지로 교체
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === assistantMessageId) {
              return {
                ...msg,
                content: '죄송합니다. 현재 답변을 생성할 수 없습니다. 나중에 다시 시도해주세요.',
                codeExecution: msg.codeExecution ? {
                  ...msg.codeExecution,
                  isExecuting: false
                } : undefined
              }
            }
            return msg
          })
        })
      }

      // 새 세션인 경우 히스토리 새로고침 (제목은 이미 생성됨)
      if (isNewSession) {
        try {
          console.log('🔄 Refreshing chat history for new session')
          await loadChatHistory(user)
        } catch (historyError) {
          console.warn('⚠️ Failed to reload chat history:', historyError)
        }
      }
      
    } catch (error) {
      console.error('Analysis error:', error)

      // 기존 메시지를 에러 메시지로 교체
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              content: `분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              codeExecution: msg.codeExecution ? {
                ...msg.codeExecution,
                isExecuting: false
              } : undefined
            }
          }
          return msg
        })
      })

      // 오류 메시지도 Firestore에 저장
      try {
        await firestoreService.addMessage({
          sessionId: currentSessionId,
          userId: user.uid,
          type: 'assistant',
          content: `분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          timestamp: new Date() as any
        })
      } catch (firestoreError) {
        console.error('Error saving error message to Firestore:', firestoreError)
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user) {
      console.error('❌ User not available for file upload')
      return
    }

    // 세션이 없으면 새로 생성
    let sessionId = currentSessionId
    if (!sessionId) {
      try {
        sessionId = await firestoreService.createChatSession(user.uid)
        updateCurrentSessionId(sessionId)
        console.log('✅ New session created for file upload:', sessionId)
      } catch (error) {
        console.error('❌ Failed to create session:', error)
        sessionId = `temp_${Date.now()}`
        updateCurrentSessionId(sessionId)
      }
    }

    console.log('📁 Starting file upload process...')

    // 파일 업로드 중 메시지 추가 (로딩 상태 대신)
    const uploadStartMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: '파일을 업로드하고 분석하는 중입니다...',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, uploadStartMessage])
    
    try {
      console.log('Starting file upload process...')
      
      // 1. Firebase Storage에 파일 업로드
      const fileMetadata = await firestoreService.uploadFile(user.uid, file, sessionId)
      console.log('File uploaded to Firebase Storage:', fileMetadata.id)
      
      // 2. 백엔드 API로 파일 업로드 및 분석
      const uploadResponse = await apiService.uploadFile(file)
      console.log('File processed by backend:', uploadResponse.file_id)
      
      setUploadedFile({
        file_id: uploadResponse.file_id,
        name: uploadResponse.filename,
        size: uploadResponse.file_size,
        columns: uploadResponse.columns,
        rows: uploadResponse.row_count,
        preview: uploadResponse.preview,
        firebaseFileId: fileMetadata.id // Firebase file metadata ID
      })

      // 3. Firebase에 파일 메타데이터 업데이트 (처리 완료, 컬럼 정보 등)
      if (fileMetadata.id) {
        await firestoreService.updateFileMetadata(fileMetadata.id, {
          processed: true,
          columns: uploadResponse.columns,
          rowCount: uploadResponse.row_count
        })
        console.log('File metadata updated in Firestore')
      }

      const uploadMessage: Message = {
        id: uploadStartMessage.id, // 같은 ID 사용하여 메시지 교체
        type: 'assistant',
        content: `파일이 성공적으로 업로드되었습니다! (${uploadResponse.row_count.toLocaleString()}행, ${uploadResponse.columns.length}컬럼)\n\n이제 데이터에 대해 질문해보세요.`,
        timestamp: new Date(),
        fileInfo: {
          filename: uploadResponse.filename,
          fileSize: uploadResponse.file_size,
          fileType: uploadResponse.filename.toLowerCase().endsWith('.csv') ? 'csv' : 'excel',
          file_id: uploadResponse.file_id
        },
        tableData: {
          data: uploadResponse.preview,
          columns: uploadResponse.columns,
          filename: uploadResponse.filename
        }
      }

      // 업로드 시작 메시지를 완료 메시지로 교체
      setMessages(prev => prev.map(msg =>
        msg.id === uploadStartMessage.id ? uploadMessage : msg
      ))

      // 4. Firestore에 업로드 메시지 저장
      if (sessionId && !sessionId.startsWith('temp_')) {
        await firestoreService.addMessage({
          sessionId: sessionId,
          userId: user.uid,
          type: uploadMessage.type,
          content: uploadMessage.content,
          timestamp: uploadMessage.timestamp as any,
          fileInfo: uploadMessage.fileInfo,
          tableData: uploadMessage.tableData
        })
        console.log('Upload message saved to Firestore')
      }

      console.log('File upload completed successfully')

      // 6. 채팅 세션에 파일 정보 업데이트
      if (sessionId && !sessionId.startsWith('temp_')) {
        await firestoreService.updateChatSession(sessionId, {
          fileId: fileMetadata.id,
          fileName: file.name,
          fileUrl: fileMetadata.fileUrl
        })
      }
      console.log('Chat session updated with file info')
      
    } catch (error) {
      console.error('Upload error:', error)

      const errorMessage: Message = {
        id: uploadStartMessage.id, // 같은 ID 사용하여 메시지 교체
        type: 'assistant',
        content: `파일 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date()
      }

      // 업로드 시작 메시지를 에러 메시지로 교체
      setMessages(prev => prev.map(msg =>
        msg.id === uploadStartMessage.id ? errorMessage : msg
      ))

      // 오류 메시지도 Firestore에 저장
      if (sessionId && !sessionId.startsWith('temp_') && user) {
        try {
          await firestoreService.addMessage({
            sessionId: sessionId,
            userId: user.uid,
            type: errorMessage.type,
            content: errorMessage.content,
            timestamp: errorMessage.timestamp as any
          })
        } catch (firestoreError) {
          console.error('Error saving error message to Firestore:', firestoreError)
        }
      }
    }
  }


  // 개발 환경에서 테스트를 위한 임시 사용자 생성
  if (!user) {
    console.log('⚠️ User is null/undefined - creating temporary user for testing')
    const tempUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    } as User
    setUser(tempUser)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full max-w-none mx-auto overflow-hidden">
      {/* Sidebar */}
      <div
        className={`bg-gray-900 text-white flex flex-col transition-all duration-300 flex-shrink-0 ${
          isSidebarCollapsed ? 'w-16 min-w-16' : 'w-64 min-w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`p-4 ${
          isSidebarCollapsed ? 'flex justify-center' : 'flex items-center justify-between'
        }`}>
          {isSidebarCollapsed ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsSidebarCollapsed(prev => {
                  const newValue = !prev
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('sidebarCollapsed', newValue.toString())
                  }
                  return newValue
                })
              }}
              className="p-1 hover:bg-gray-800 rounded transition-colors relative group"
            >
              <Image 
                src="/image/logo.png" 
                alt="AfterWon Logo" 
                width={40} 
                height={40}
                className="object-contain group-hover:opacity-0 transition-opacity duration-200"
              />
              <RiSideBarLine className="w-4 h-4 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Image 
                  src="/image/logo.png" 
                  alt="AfterWon Logo" 
                  width={32} 
                  height={32}
                  className="object-contain"
                />
                <span className="font-bold text-white" style={{fontFamily: 'SpectralLight, serif'}}>Afterwon</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsSidebarCollapsed(prev => {
                    const newValue = !prev
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('sidebarCollapsed', newValue.toString())
                    }
                    return newValue
                  })
                }}
                className="p-1 hover:bg-gray-800 rounded transition-colors"
              >
                <RiSideBarLine className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Menu Items */}
        <div className="p-3 space-y-1">
          {/* New Chat */}
          <button 
            onClick={() => {
              handleNewChat()
              setCurrentPage('chat')
            }}
            className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2 text-left'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm font-medium">{t('nav.newChat')}</span>}
          </button>

          {/* Chat Search */}
          <button 
            onClick={() => {
              setCurrentPage('chatsearch')
              updateCurrentSessionId(null)
            }}
            className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2 text-left'
            } ${currentPage === 'chatsearch' ? 'bg-gray-800' : ''}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm font-medium">{t('nav.chatSearch')}</span>}
          </button>
          
          {/* Projects */}
          <button
            onClick={() => {
              setCurrentPage('projects')
              updateCurrentSessionId(null)
            }}
            className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2 text-left'
            } ${currentPage === 'projects' ? 'bg-gray-800' : ''}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm font-medium">{t('nav.projects')}</span>}
          </button>

          {/* File System */}
          <button 
            onClick={() => {
              setCurrentPage('filesystem')
              updateCurrentSessionId(null)
            }}
            className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2 text-left'
            } ${currentPage === 'filesystem' ? 'bg-gray-800' : ''}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm">{t('nav.fileSystem')}</span>}
          </button>

          {/* App Connector */}
          <button
            onClick={() => {
              setCurrentPage('appconnector')
              updateCurrentSessionId(null)
            }}
            className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2 text-left'
            } ${currentPage === 'appconnector' ? 'bg-gray-800' : ''}`}
            style={{ marginTop: '24px' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm">{t('nav.appConnector')}</span>}
          </button>

          {/* Dashboard */}
          <button
            onClick={() => {
              setCurrentPage('dashboard')
              updateCurrentSessionId(null)
            }}
            className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2 text-left'
            } ${currentPage === 'dashboard' ? 'bg-gray-800' : ''}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm">{t('nav.dashboard')}</span>}
          </button>
          
        </div>

        {/* Content Area - Either chat history or spacer */}
        {isSidebarCollapsed ? (
          /* Collapsed state - spacer to push profile to bottom */
          <div className="flex-1"></div>
        ) : (
          <>
            {/* Chat History Section */}
            <div className="px-3 py-2" style={{ marginTop: '24px' }}>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                {t('nav.recentItems')}
              </h3>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              {chatHistory.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  {t('chat.noHistory')}
                </div>
              ) : (
                chatHistory.map((session) => (
                  <div
                    key={session.id}
                    className={`relative group w-full rounded-lg transition-colors ${
                      currentSessionId === session.id ? 'bg-gray-800' : 'hover:bg-gray-800'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        console.log('🖱️ Chat history item clicked:', session.id, session.title)
                        e.preventDefault()
                        e.stopPropagation()
                        handleSessionClick(session.id!)
                      }}
                      className="w-full text-left p-2 pr-8"
                    >
                      <div className="text-sm text-gray-300 truncate">
                        {session.title || '새 채팅'}
                      </div>
                    </button>

                    {/* Three-dot menu button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === session.id ? null : session.id!)
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    {openMenuId === session.id && (
                      <div data-menu-container className="absolute right-0 top-8 mt-1 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
                        <div className="py-1">
                          <button
                            onClick={() => handleRenameChat(session.id!)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {t('menu.rename')}
                          </button>
                          <button
                            onClick={() => handleShareChat(session.id!)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                            {t('menu.share')}
                          </button>
                          <div className="border-t border-gray-700 my-1"></div>
                          <button
                            onClick={() => handleDeleteChatClick(session.id!, session.title)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {t('menu.delete')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* User Section - Always visible at bottom */}
        <div className="p-3 relative" data-profile-menu>
          {isSidebarCollapsed ? (
            /* Collapsed state - profile image centered like other menu items */
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`w-full flex items-center rounded-lg hover:bg-gray-800 transition-colors justify-center p-2`}
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium">
                  {mounted ? (cachedUserInfo?.initial || getUserInitial(user)) : '?'}
                </span>
              </div>
            </button>
          ) : (
            /* Expanded state - full profile info */
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {mounted ? (cachedUserInfo?.initial || getUserInitial(user)) : '?'}
                </span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium truncate">
                  {cachedUserInfo?.displayName || getUserDisplayName(user)}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {t('profile.pro')}
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* Profile Dropdown Menu - Only show when expanded sidebar */}
          {isProfileMenuOpen && !isSidebarCollapsed && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-50">
              {/* User Email Header */}
              <div className="px-4 py-3 border-b border-gray-600">
                <div className="text-sm text-gray-300 truncate">
                  {cachedUserInfo?.email || user?.email}
                </div>
              </div>

              {/* User Info with Check */}
              <div className="px-4 py-3 border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {mounted ? (cachedUserInfo?.initial || getUserInitial(user)) : '?'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {cachedUserInfo?.displayName || getUserDisplayName(user)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {t('profile.pro')}
                      </div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setCurrentPage('settings')
                    setIsProfileMenuOpen(false)
                    updateCurrentSessionId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {t('common.settings')}
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                  {t('profile.help')}
                </button>
              </div>

              <div className="border-t border-gray-600 py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                  {t('profile.upgrade')}
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-between">
                  <span>{t('profile.learnMore')}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="border-t border-gray-600 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content Container - 분할 레이아웃 또는 일반 레이아웃 */}
      {expandedChart ? (
        // 차트 확대 모드: 분할 레이아웃
        <div className="flex flex-1 h-screen overflow-hidden min-w-0">
          {/* 좌측 채팅 패널 */}
          <div
            className="flex flex-col bg-slate-800 overflow-hidden min-w-0"
            style={{ width: `${100 - panelWidth}%` }}
          >
            <ChatHeader uploadedFile={uploadedFile} />

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
              <div className="flex-1 overflow-y-auto chat-messages-container">
                <ChatMessages
                  messages={messages}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                  onFollowUpClick={handleFollowUpClick}
                  onChartExpand={handleChartExpand}
                  uploadedFile={uploadedFile}
                  user={user}
                  onMessageUpdate={handleMessageUpdate}
                />
              </div>

            </div>

            <div className="p-4 bg-slate-800 flex-shrink-0 relative z-10">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  key={inputKey}
                  onSendMessage={handleSendMessage}
                  onFileUpload={handleFileUpload}
                  isLoading={isLoading}
                  disabled={!user}
                  hasFile={!!uploadedFile}
                  placeholder={!uploadedFile ? t('chat.typeMessage') : t('chat.askQuestion')}
                />
              </div>
            </div>
          </div>

          {/* 리사이저 */}
          <div
            ref={resizerRef}
            className="w-1 bg-blue-500 hover:bg-blue-600 cursor-col-resize flex-shrink-0 relative group"
          >
            <div className="absolute inset-y-0 -inset-x-1 group-hover:bg-blue-500 transition-colors opacity-20"></div>
          </div>

          {/* 우측 차트 패널 */}
          <div
            className="bg-white border-l border-gray-300 flex flex-col min-w-0"
            style={{ width: `${panelWidth}%` }}
          >
            {/* 차트 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">{expandedChart.title}</h2>
              <button
                onClick={handleChartClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="차트 닫기"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 확대된 차트 */}
            <div className="flex-1 p-4">
              <div className="h-full">
                <PlotlyChart
                  data={expandedChart.chartData}
                  height={typeof window !== 'undefined' ? window.innerHeight - 120 : 600}
                  onTitleChange={() => {}}
                  showTitleEditor={false}
                  showControls={false}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 일반 모드: 기존 레이아웃
        <div className="flex flex-col bg-slate-800 flex-1 h-screen min-w-0 overflow-hidden">
          {currentPage === 'chat' ? (
            <>
              <ChatHeader uploadedFile={uploadedFile} />

              <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
                <div className="flex-1 overflow-y-auto">
                  <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    messagesEndRef={messagesEndRef}
                    onFollowUpClick={handleFollowUpClick}
                    onChartExpand={handleChartExpand}
                    uploadedFile={uploadedFile}
                    user={user}
                    onMessageUpdate={handleMessageUpdate}
                  />
                </div>

              </div>

              <div className="p-4 bg-slate-800 flex-shrink-0 relative z-10">
                <div className="max-w-4xl mx-auto">
                  <ChatInput
                    key={inputKey}
                    onSendMessage={handleSendMessage}
                    onFileUpload={handleFileUpload}
                    isLoading={isLoading}
                    disabled={!user}
                    hasFile={!!uploadedFile}
                    placeholder={!uploadedFile ? t('chat.typeMessage') : t('chat.askQuestion')}
                  />
                </div>
              </div>
            </>
          ) : currentPage === 'filesystem' ? (
            <FileSystem user={user} />
          ) : currentPage === 'projects' ? (
            <Projects
              user={user}
              onStartChat={(message) => {
                // 프로젝트에서 시작된 채팅인지 확인
                const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem('currentProjectId') : null
                const savedSessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null
                const isProjectChatSaved = typeof window !== 'undefined' ? localStorage.getItem('isProjectChat') === 'true' : false

                if (savedProjectId && savedSessionId && isProjectChatSaved) {
                  // 프로젝트 컨텍스트 설정
                  updateProjectContext(savedProjectId, true)
                  updateCurrentSessionId(savedSessionId)

                  // 프로젝트 채팅 히스토리 다시 로드
                  if (user) {
                    loadChatHistory(user)
                  }
                }

                setCurrentPage('chat')

                // 메시지가 있는 경우에만 전송
                if (message && message.trim()) {
                  handleSendMessage(message)
                }
              }}
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
              hasFile={!!uploadedFile}
            />
          ) : currentPage === 'chatsearch' ? (
            <ChatSearch
              user={user}
            chatHistory={chatHistory}
            onSessionClick={(sessionId) => {
              handleSessionClick(sessionId)
              setCurrentPage('chat')
            }}
            onNewChat={() => {
              handleNewChat()
              setCurrentPage('chat')
            }}
          />
          ) : currentPage === 'appconnector' ? (
            <AppConnector user={user} />
          ) : currentPage === 'dashboard' ? (
            <div className="flex flex-col h-full bg-slate-800 text-white">
              <div className="max-w-6xl mx-auto w-full p-6">
                <h1 className="text-2xl font-bold mb-2">{t('dashboard.title')}</h1>
                <p className="text-gray-400 text-sm mb-6">
                  {t('dashboard.description')}
                </p>

                {/* 임시 placeholder content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center mb-4">
                      <svg className="w-8 h-8 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <h3 className="text-lg font-semibold">{t('dashboard.chartAnalysis')}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">{t('dashboard.chartAnalysisDesc')}</p>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center mb-4">
                      <svg className="w-8 h-8 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <h3 className="text-lg font-semibold">{t('dashboard.dataStatistics')}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">{t('dashboard.dataStatisticsDesc')}</p>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center mb-4">
                      <svg className="w-8 h-8 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-semibold">{t('dashboard.usageStats')}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">{t('dashboard.usageStatsDesc')}</p>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-gray-500">{t('dashboard.underDevelopment')}</p>
                </div>
              </div>
            </div>
          ) : currentPage === 'settings' ? (
            <Settings user={user} />
          ) : null}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirmModal.isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={handleDeleteChatCancel}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              채팅을 삭제하시겠습니까?
            </h3>
            <p className="text-gray-600 mb-2">
              이 행동으로 <strong>{deleteConfirmModal.sessionTitle || '채팅'}이(가)</strong> 삭제됩니다.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              이 채팅에 저장된 메모리를 삭제하려면 <strong>설정으로 가세요.</strong>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteChatCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteChatConfirm}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}