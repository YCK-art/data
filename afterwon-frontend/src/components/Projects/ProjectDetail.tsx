'use client'

import { useState, useEffect } from 'react'
import { FiArrowLeft, FiShare2 } from 'react-icons/fi'
import ChatInput from '../Chat/ChatInput'
import { firestoreService, Project, ProjectChatSession } from '@/services/firestore'
import { User } from 'firebase/auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProjectDetailProps {
  project: Project
  user: User | null
  onBack: () => void
  onStartChat: (message: string) => void
  onFileUpload?: (file: any) => void
  isLoading?: boolean
  hasFile?: boolean
}

export default function ProjectDetail({
  project,
  user,
  onBack,
  onStartChat,
  onFileUpload,
  isLoading = false,
  hasFile = false
}: ProjectDetailProps) {
  const { t } = useLanguage()
  const [chatSessions, setChatSessions] = useState<ProjectChatSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Load project chat sessions
  useEffect(() => {
    const loadChatSessions = async () => {
      if (!project.id) return

      try {
        setLoadingSessions(true)
        const sessions = await firestoreService.getProjectChatSessions(project.id)
        setChatSessions(sessions)
      } catch (error) {
        console.error('Failed to load project chat sessions:', error)
        setChatSessions([])
      } finally {
        setLoadingSessions(false)
      }
    }

    loadChatSessions()
  }, [project.id])

  const handleSendMessage = async (message: string) => {
    if (!user || !project.id) return

    try {
      // Create a new project chat session
      const sessionTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '')
      const preview = message.slice(0, 100) + (message.length > 100 ? '...' : '')

      const sessionId = await firestoreService.createProjectChatSession(
        project.id,
        user.uid,
        sessionTitle,
        preview
      )

      console.log('✅ Created project chat session:', sessionId)

      // Reload chat sessions to show the new one
      const sessions = await firestoreService.getProjectChatSessions(project.id)
      setChatSessions(sessions)

      // Create a new regular chat session connected to this project
      const newChatSessionId = await firestoreService.createChatSession(user.uid, sessionTitle)

      // Update the chat session to include project connection
      await firestoreService.updateChatSession(newChatSessionId, {
        projectId: project.id,
        title: sessionTitle
      })

      console.log('✅ Created new chat session for project:', newChatSessionId)

      // Store the project context for the new chat
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentProjectId', project.id)
        localStorage.setItem('currentSessionId', newChatSessionId)
      }

      // Navigate to chat interface with the message and new session
      onStartChat(message)
    } catch (error) {
      console.error('❌ Failed to create project chat session:', error)
      // Fallback to regular chat if project chat creation fails
      onStartChat(message)
    }
  }

  const handleFileUpload = (file: any) => {
    if (onFileUpload) {
      onFileUpload(file)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 30) return `${diffInDays} days ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 pt-12 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200"
                title="Back to projects"
              >
                <FiArrowLeft className="w-5 h-5 text-slate-300" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-white">{project.title}</h1>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-200 text-slate-300">
              <FiShare2 className="w-4 h-4" />
              {t('projects.share')}
            </button>
          </div>

          {/* Input Area */}
          <div className="relative">
            <ChatInput
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
              disabled={false}
              hasFile={hasFile}
              placeholder={t('projects.startNewChat', { projectName: project.title })}
            />
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400">{t('projects.loadingConversations')}</div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  className="p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200 cursor-pointer group"
                  onClick={async () => {
                    try {
                      console.log('Opening project chat:', chat.id)

                      // Store the project and session context
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('currentProjectId', project.id!)
                        localStorage.setItem('currentSessionId', chat.id!)
                        localStorage.setItem('isProjectChat', 'true')
                      }

                      // Navigate to chat interface
                      onStartChat('')
                    } catch (error) {
                      console.error('Failed to open project chat:', error)
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-white mb-2 group-hover:text-slate-100 transition-colors duration-200">
                        {chat.title}
                      </h3>
                      <p
                        className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-200 leading-relaxed"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {chat.preview}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 ml-4 flex-shrink-0">
                      {formatDate(chat.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}