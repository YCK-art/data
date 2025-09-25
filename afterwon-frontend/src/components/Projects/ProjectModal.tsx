'use client'

import { useState } from 'react'
import { FiX, FiSettings, FiDollarSign, FiBookOpen, FiEdit, FiUsers, FiNavigation } from 'react-icons/fi'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateProject: (title: string, description: string, category: string) => void
}

const projectCategories = [
  { id: 'investment', label: '투자', icon: FiDollarSign, color: 'text-green-500' },
  { id: 'education', label: '숙제', icon: FiBookOpen, color: 'text-blue-500' },
  { id: 'writing', label: '글쓰기', icon: FiEdit, color: 'text-purple-500' },
  { id: 'health', label: '건강', icon: FiUsers, color: 'text-red-500' },
  { id: 'travel', label: '여행', icon: FiNavigation, color: 'text-yellow-500' }
]

export default function ProjectModal({ isOpen, onClose, onCreateProject }: ProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    const categoryLabel = projectCategories.find(cat => cat.id === selectedCategory)?.label || ''
    onCreateProject(projectName.trim(), '', categoryLabel)

    // Reset form
    setProjectName('')
    setSelectedCategory('')
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg mx-auto shadow-2xl border border-slate-600">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <h2 className="text-xl font-semibold text-white">프로젝트 이름</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200">
              <FiSettings className="w-5 h-5 text-slate-300" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200"
            >
              <FiX className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Project Name Input */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiEdit className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Stripe 매출 데이터 분석"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-slate-600 rounded-xl bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                autoFocus
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-8">
            <div className="flex gap-2 justify-between">
              {projectCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-900/50'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-700'
                  }`}
                >
                  <category.icon className={`w-5 h-5 ${category.color}`} />
                  <span className={`font-medium text-sm ${
                    selectedCategory === category.id ? 'text-blue-300' : 'text-slate-300'
                  }`}>
                    {category.label}
                  </span>
                </button>
              ))}
            </div>
          </div>


          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!projectName.trim()}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                projectName.trim()
                  ? 'bg-white text-slate-800 hover:bg-gray-100 shadow-sm'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              프로젝트 만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}