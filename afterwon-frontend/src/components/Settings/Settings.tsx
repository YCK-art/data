'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from 'firebase/auth'
import { userService } from '@/services/userService'
import { useLanguage } from '@/contexts/LanguageContext'

interface SettingsProps {
  user: User | null
}

type SettingsSection = 'profile' | 'language' | 'account' | 'privacy' | 'billing' | 'features'

export default function Settings({ user }: SettingsProps) {
  const { language, setLanguage, t } = useLanguage()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [selectedJob, setSelectedJob] = useState('')
  const [isLoadingJob, setIsLoadingJob] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false)
  const [isInterfaceLanguageDropdownOpen, setIsInterfaceLanguageDropdownOpen] = useState(false)
  const [selectedResponseLanguage, setSelectedResponseLanguage] = useState('')
  const [isResponseLanguageDropdownOpen, setIsResponseLanguageDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const interfaceLanguageRef = useRef<HTMLDivElement>(null)
  const responseLanguageRef = useRef<HTMLDivElement>(null)

  const jobOptions = [
    { key: 'developer', label: t('settings.job.developer') },
    { key: 'designer', label: t('settings.job.designer') },
    { key: 'planner', label: t('settings.job.planner') },
    { key: 'marketer', label: t('settings.job.marketer') },
    { key: 'analyst', label: t('settings.job.analyst') },
    { key: 'sales', label: t('settings.job.sales') },
    { key: 'management', label: t('settings.job.management') },
    { key: 'other', label: t('settings.job.other') }
  ]

  const languageOptions = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' }
  ]

  // 현재 선택된 인터페이스 언어
  const getCurrentLanguageLabel = () => {
    const option = languageOptions.find(opt => opt.code === language)
    return option ? option.label : '한국어'
  }

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsJobDropdownOpen(false)
      }
      if (interfaceLanguageRef.current && !interfaceLanguageRef.current.contains(event.target as Node)) {
        setIsInterfaceLanguageDropdownOpen(false)
      }
      if (responseLanguageRef.current && !responseLanguageRef.current.contains(event.target as Node)) {
        setIsResponseLanguageDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 사용자 직무 정보 로드
  useEffect(() => {
    const loadUserJob = async () => {
      if (user?.uid) {
        try {
          const userProfile = await userService.getUserProfile(user.uid)
          if (userProfile?.job) {
            setSelectedJob(userProfile.job)
          } else {
            setSelectedJob(t('settings.jobPlaceholder'))
          }
        } catch (error) {
          console.error('Failed to load user job:', error)
          setSelectedJob(t('settings.jobPlaceholder'))
        }
      } else {
        setSelectedJob(t('settings.jobPlaceholder'))
      }
    }

    loadUserJob()
  }, [user, t])

  // Initialize response language
  useEffect(() => {
    setSelectedResponseLanguage(t('settings.korean'))
  }, [t])

  // 직무 업데이트 함수
  const updateUserJob = async (job: string) => {
    if (!user?.uid) return

    setIsLoadingJob(true)
    setJobError(null)
    try {
      await userService.updateUserJob(user.uid, job)
      setSelectedJob(job)
      console.log('✅ Job updated successfully:', job)
    } catch (error) {
      console.error('❌ Failed to update job:', error)
      setJobError('직무 업데이트에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoadingJob(false)
    }
  }

  // 사용자 이니셜 추출 함수
  const getUserInitial = (user: User | null): string => {
    if (!user) return '?'
    
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase()
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    
    return '?'
  }

  // 사용자 이름 추출 함수
  const getUserDisplayName = (user: User | null): string => {
    if (!user) return '사용자'
    
    if (user.displayName) {
      return user.displayName
    }
    
    if (user.email) {
      const emailPrefix = user.email.split('@')[0]
      if (user.email.includes('@gmail.com')) {
        const nameParts = emailPrefix.split('.')
        if (nameParts.length > 1) {
          return nameParts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        }
      }
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    }
    
    return '사용자'
  }

  const menuItems = [
    { id: 'profile' as SettingsSection, label: t('settings.profile') },
    { id: 'language' as SettingsSection, label: t('settings.language') },
    { id: 'account' as SettingsSection, label: t('settings.account') },
    { id: 'privacy' as SettingsSection, label: t('settings.privacy') },
    { id: 'billing' as SettingsSection, label: t('settings.billing') },
    { id: 'features' as SettingsSection, label: t('settings.features') }
  ]

  const renderProfileSection = () => (
    <div className="space-y-8">
      {/* 성명 섹션 */}
      <div>
        <label className="block text-white text-sm font-medium mb-4">{t('settings.name')}</label>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">{getUserInitial(user)}</span>
          </div>
          <input
            type="text"
            value={getUserDisplayName(user)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500"
            readOnly
          />
        </div>
      </div>

      {/* 귀하의 업무를 가장 잘 설명하는 것은 무엇입니까? */}
      <div>
        <label className="block text-white text-sm font-medium mb-4">
          {t('settings.jobQuestion')}
        </label>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => !isLoadingJob && setIsJobDropdownOpen(!isJobDropdownOpen)}
            disabled={isLoadingJob}
            className={`w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500 text-left flex items-center justify-between ${isLoadingJob ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={selectedJob === t('settings.jobPlaceholder') ? 'text-gray-400' : 'text-white'}>
              {isLoadingJob ? t('settings.saving') : selectedJob}
            </span>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${isJobDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isJobDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {jobOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    updateUserJob(option.label)
                    setIsJobDropdownOpen(false)
                  }}
                  disabled={isLoadingJob}
                  className={`w-full px-4 py-3 text-left text-white transition-colors first:rounded-t-lg last:rounded-b-lg ${isLoadingJob ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Afterwon이 응답할 때 고려해야 할 개인 선호 사항은 무엇인가요? */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-white text-sm font-medium">
            {t('settings.preferencesQuestion')}
          </label>
          <span className="bg-blue-600 text-blue-100 text-xs px-3 py-1 rounded-full">{t('settings.beta')}</span>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          {t('settings.preferencesSubtitle')} <a href="#" className="text-blue-400 hover:text-blue-300">{t('settings.preferencesLink')}</a>
        </p>
        <textarea
          placeholder={t('settings.preferencesPlaceholder')}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
          rows={4}
        />
      </div>

    </div>
  )

  const renderLanguageSection = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">{t('settings.language')}</h2>
        <div>
          <label className="block text-white text-sm font-medium mb-4">
            {t('settings.interfaceLanguage')}
          </label>
          <div className="relative" ref={interfaceLanguageRef}>
            <button
              onClick={() => setIsInterfaceLanguageDropdownOpen(!isInterfaceLanguageDropdownOpen)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500 text-left flex items-center justify-between"
            >
              <span>{getCurrentLanguageLabel()}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isInterfaceLanguageDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isInterfaceLanguageDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                {languageOptions.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => {
                      setLanguage(option.code as 'ko' | 'en' | 'ja')
                      setIsInterfaceLanguageDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      language === option.code ? 'bg-gray-700' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-white text-sm font-medium mb-4">
          {t('settings.responseLanguage')}
        </label>
        <div className="relative" ref={responseLanguageRef}>
          <button
            onClick={() => setIsResponseLanguageDropdownOpen(!isResponseLanguageDropdownOpen)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500 text-left flex items-center justify-between"
          >
            <span>{selectedResponseLanguage}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isResponseLanguageDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isResponseLanguageDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => {
                    setSelectedResponseLanguage(option.label)
                    setIsResponseLanguageDropdownOpen(false)
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-2">
          {t('settings.responseLanguageDesc')}
        </p>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection()
      case 'language':
        return renderLanguageSection()
      case 'account':
        return <div className="text-white">{t('settings.accountContent')}</div>
      case 'privacy':
        return <div className="text-white">{t('settings.privacyContent')}</div>
      case 'billing':
        return <div className="text-white">{t('settings.billingContent')}</div>
      case 'features':
        return <div className="text-white">{t('settings.featuresContent')}</div>
      default:
        return <div className="text-white">{t('settings.selectContent')}</div>
    }
  }

  return (
    <div className="flex h-full bg-slate-800 text-white">
      {/* 왼쪽 사이드바 메뉴 */}
      <div className="w-64 bg-gray-900 border-r border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-8">{t('settings.title')}</h1>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}