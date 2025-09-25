'use client'

import { useState, useEffect } from 'react'
import { FiSearch, FiPlus, FiFolder, FiClock } from 'react-icons/fi'
import ProjectDetail from './ProjectDetail'
import ProjectModal from './ProjectModal'
import { firestoreService, Project } from '@/services/firestore'
import { User } from 'firebase/auth'
import { useLanguage } from '@/contexts/LanguageContext'

const getSortOptions = (t: (key: string) => string) => [
  { value: 'updated', label: t('projects.recentlyUpdated') },
  { value: 'created', label: t('projects.dateCreated') },
  { value: 'name', label: t('projects.name') },
  { value: 'starred', label: t('projects.starred') }
]

interface ProjectsProps {
  user: User | null
  onStartChat?: (message: string) => void
  onFileUpload?: (file: any) => void
  isLoading?: boolean
  hasFile?: boolean
}

export default function Projects({ user, onStartChat, onFileUpload, isLoading, hasFile }: ProjectsProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Load user projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) {
        setProjects([])
        setLoadingProjects(false)
        return
      }

      try {
        setLoadingProjects(true)
        const userProjects = await firestoreService.getUserProjects(user.uid)
        setProjects(userProjects)
      } catch (error) {
        console.error('Failed to load projects:', error)
        setProjects([])
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [user])

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
  }

  const handleStartChat = (message: string) => {
    // This is for when we want to start a regular chat from projects page
    // (not used currently as project chats are handled internally)
    if (onStartChat) {
      onStartChat(message)
    }
  }

  const handleCreateProject = async (title: string, description: string, category: string) => {
    if (!user) return

    try {
      await firestoreService.createProject(user.uid, title, description || `${category} 프로젝트`)
      // Reload projects
      const userProjects = await firestoreService.getUserProjects(user.uid)
      setProjects(userProjects)
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project. Please try again.')
    }
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return t('common.today')
    if (diffInDays === 1) return t('common.yesterday')
    if (diffInDays < 30) return t('projects.daysAgo', { days: diffInDays })
    if (diffInDays < 365) return t('projects.monthsAgo', { months: Math.floor(diffInDays / 30) })
    return t('projects.yearsAgo', { years: Math.floor(diffInDays / 365) })
  }

  // 프로젝트가 선택된 경우 상세 화면 표시
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        user={user}
        onBack={handleBackToProjects}
        onStartChat={handleStartChat}
        onFileUpload={onFileUpload}
        isLoading={isLoading}
        hasFile={hasFile}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 pt-12 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">{t('projects.title')}</h1>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-sm font-medium"
            >
              <FiPlus className="w-4 h-4" />
              {t('projects.newProject')}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={t('projects.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl leading-5 text-white placeholder-slate-400 focus:outline-none focus:bg-slate-700 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400 font-medium">
              {t('projects.projectsCount', { count: filteredProjects.length })}
            </div>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-700 transition-all duration-200"
              >
                {t('projects.sortBy')}
                <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-700 border border-slate-600/50 rounded-xl shadow-xl backdrop-blur-sm z-10 overflow-hidden">
                  {getSortOptions(t).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value)
                        setIsDropdownOpen(false)
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm hover:bg-slate-600/50 transition-colors duration-150 ${
                        sortBy === option.value ? 'bg-slate-600 text-white' : 'text-slate-300'
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

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {loadingProjects ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400">{t('projects.loadingProjects')}</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-300 cursor-pointer group flex flex-col h-72"
                  >
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-600/50 rounded-lg group-hover:bg-slate-600 transition-colors duration-200">
                          <FiFolder className="w-5 h-5 text-slate-300" />
                        </div>
                        {project.isStarred && (
                          <div className="p-1">
                            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-600/50 rounded-lg transition-all duration-200">
                        <svg className="w-4 h-4 text-slate-400 hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>

                    {/* Project Title - 한 줄로 제한 */}
                    <h3
                      className="text-lg font-semibold text-white mb-3 group-hover:text-slate-100 transition-colors duration-200"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {project.title}
                    </h3>

                    {/* Project Description - 3줄로 제한 */}
                    <div className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-200 flex-1 overflow-hidden">
                      <p
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {project.description}
                      </p>
                    </div>

                    {/* Project Footer - 항상 하단에 고정 */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors duration-200 pt-2 mt-2 border-t border-slate-600/30">
                      <FiClock className="w-3 h-3" />
                      <span className="font-medium">{t('projects.updated')} {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreateProject={handleCreateProject}
      />
    </div>
  )
}