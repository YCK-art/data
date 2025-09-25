'use client'

import { useState, useRef, useEffect } from 'react'
import { User } from 'firebase/auth'
import { ChatSession } from '@/services/firestore'
import { useLanguage } from '@/contexts/LanguageContext'

interface ChatSearchProps {
  user: User | null
  chatHistory: ChatSession[]
  onSessionClick: (sessionId: string) => void
  onNewChat: () => void
}

export default function ChatSearch({ user, chatHistory, onSessionClick, onNewChat }: ChatSearchProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredHistory, setFilteredHistory] = useState<ChatSession[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 컴포넌트 마운트 시 검색 입력창에 포커스
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // 검색어가 변경될 때 필터링
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredHistory(chatHistory)
    } else {
      const filtered = chatHistory.filter(session => 
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredHistory(filtered)
    }
  }, [searchQuery, chatHistory])

  // 타임스탬프 포맷팅
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ''

    let date: Date
    if (timestamp.toDate) {
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

    if (diffMins < 1) return t('chatSearch.justNow')
    if (diffMins < 60) return t('chatSearch.minutesAgo', { minutes: diffMins })
    if (diffHours < 24) return t('chatSearch.hoursAgo', { hours: diffHours })
    if (diffDays === 1) return t('chatSearch.yesterday')
    if (diffDays < 7) return t('chatSearch.daysAgo', { days: diffDays })

    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 pt-12">
        <h1 className="text-2xl font-bold">{t('chatSearch.title')}</h1>
        <button 
          onClick={onNewChat}
          className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">{t('chatSearch.newChat')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-6">
        <div className="relative">
          <svg 
            className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('chatSearch.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-12 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:bg-gray-600"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>{t('chatSearch.totalChats', { count: chatHistory.length })}</span>
          <button className="text-blue-400 hover:text-blue-300">
            {t('chatSearch.all')}
          </button>
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 px-6 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery ? t('chatSearch.noResults') : t('chatSearch.noHistory')}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredHistory.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionClick(session.id!)}
                className="w-full text-left p-4 hover:bg-gray-700 rounded-lg transition-colors border-b border-gray-700 last:border-b-0"
              >
                <div className="mb-2">
                  <h3 className="text-white font-medium text-base leading-tight">
                    {session.title || t('chatSearch.newChatTitle')}
                  </h3>
                </div>
                <div className="text-sm text-gray-400">
                  {formatTimestamp(session.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}