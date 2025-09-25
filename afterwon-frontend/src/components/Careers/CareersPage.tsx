'use client'

import { useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'

interface JobListing {
  id: string
  title: string
  type: 'Full time' | 'Part time' | 'Contract'
  category: 'ENGINEERING' | 'OTHER'
  location: string
  workType: 'On-site' | 'Remote' | 'Hybrid'
  salary: string
  equity: string
}

const jobListings: JobListing[] = [
  {
    id: '1',
    title: 'Founding Engineer',
    type: 'Full time',
    category: 'ENGINEERING',
    location: 'Seoul, KR',
    workType: 'On-site',
    salary: '$300k-$1M',
    equity: '0.15%-0.5%'
  }
]

export default function CareersPage() {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'ENGINEERING' | 'OTHER'>('ALL')

  const filteredJobs = selectedCategory === 'ALL'
    ? jobListings
    : jobListings.filter(job => job.category === selectedCategory)

  const engineeringJobs = jobListings.filter(job => job.category === 'ENGINEERING')
  const otherJobs = jobListings.filter(job => job.category === 'OTHER')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2e] via-[#001122] to-[#000814]">
      {/* Toolbar - Same as Landing Page */}
      <nav className="relative z-10 border-b border-cyan-400/20">
        {/* Vertical Lines in Toolbar */}
        <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative h-full">
            {/* Left line */}
            <div className="absolute left-4 sm:left-6 lg:left-8 top-0 bottom-0 w-px bg-cyan-400/20"></div>
            {/* Right line */}
            <div className="absolute right-4 sm:right-6 lg:right-8 top-0 bottom-0 w-px bg-cyan-400/20"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-16">
            {/* Logo - moved inward */}
            <div className="flex items-center ml-8 sm:ml-10 lg:ml-12">
              <a href="/" className="flex-shrink-0 flex items-center gap-1">
                <img
                  src="/image/logo.png"
                  alt="Afterwon Logo"
                  className="w-11 h-11 object-contain"
                />
                <span className="text-xl font-bold text-white" style={{fontFamily: 'SpectralLight, serif'}}>Afterwon</span>
              </a>
            </div>

            {/* Navigation Links - Desktop */}
            <div className="hidden min-[1000px]:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {/* Use cases dropdown */}
                <div className="relative group">
                  <span className="text-white hover:text-cyan-100 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                    Use cases
                    <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>

                  {/* Dropdown Menu */}
                  <div className="absolute top-full left-0 mt-1 w-48 bg-gradient-to-br from-[#001a2e] via-[#001122] to-[#000814] rounded-lg shadow-xl border border-cyan-400/20 backdrop-blur-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
                    <div className="py-2">
                      <a
                        href="/#usecase"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = '/#usecase'
                        }}
                        className="block px-4 py-3 text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:backdrop-blur-sm text-sm transition-all duration-200 rounded-md mx-1"
                        style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                      >
                        Finance
                      </a>
                      <a
                        href="/#usecase"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = '/#usecase'
                        }}
                        className="block px-4 py-3 text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:backdrop-blur-sm text-sm transition-all duration-200 rounded-md mx-1"
                        style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                      >
                        Marketing
                      </a>
                      <a
                        href="/#usecase"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = '/#usecase'
                        }}
                        className="block px-4 py-3 text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:backdrop-blur-sm text-sm transition-all duration-200 rounded-md mx-1"
                        style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                      >
                        Product Team
                      </a>
                      <a
                        href="/#usecase"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = '/#usecase'
                        }}
                        className="block px-4 py-3 text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:backdrop-blur-sm text-sm transition-all duration-200 rounded-md mx-1"
                        style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                      >
                        Consulting
                      </a>
                      <a
                        href="/#usecase"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = '/#usecase'
                        }}
                        className="block px-4 py-3 text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:backdrop-blur-sm text-sm transition-all duration-200 rounded-md mx-1"
                        style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                      >
                        Research
                      </a>
                    </div>
                  </div>
                </div>

                <a href="/careers" className="text-cyan-400 px-3 py-2 rounded-md text-sm font-medium" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                  Careers
                </a>
                <a href="/#enterprise" className="text-white hover:text-cyan-100 px-3 py-2 rounded-md text-sm font-medium transition-colors" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                  Enterprise sales
                </a>
              </div>
            </div>

            {/* Desktop Get Started Button */}
            <div className="hidden min-[1000px]:flex items-center space-x-4 mr-8 sm:mr-10 lg:mr-12">
              <button className="bg-black hover:bg-gray-900 text-white px-6 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 group">
                <FiArrowUpRight size={16} className="transition-transform duration-200 group-hover:rotate-45" />
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Vertical Lines */}
      <div className="absolute top-16 left-0 right-0 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-0 w-px h-screen bg-cyan-400/20"></div>
          <div className="absolute right-4 sm:right-6 lg:right-8 top-0 w-px h-screen bg-cyan-400/20"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="ml-8 sm:ml-10 lg:ml-12 mr-8 sm:mr-10 lg:mr-12">
          {/* Header */}
          <div className="mb-16">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-light text-cyan-400 mb-4" style={{fontFamily: 'SpectralLight, serif'}}>
                Open roles
              </h1>
              <h2 className="text-3xl md:text-4xl font-light text-white mb-3 leading-tight" style={{fontFamily: 'SpectralLight, serif'}}>
                Shape the future of data.
              </h2>
              <h2 className="text-3xl md:text-4xl font-light text-white leading-tight" style={{fontFamily: 'SpectralLight, serif'}}>
                Build AI that transforms decisions.
              </h2>
            </div>
          </div>

          {/* Engineering Section */}
          <div className="mb-16">
            <h3 className="text-lg font-medium text-gray-400 mb-8 tracking-wide" style={{fontFamily: 'Arial, sans-serif'}}>
              ENGINEERING
            </h3>
            <div className="space-y-6">
              {engineeringJobs.map((job) => (
                <div key={job.id} className="bg-white/5 backdrop-blur-sm border border-cyan-400/20 rounded-lg p-6 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300 group relative overflow-hidden">
                  {/* Shine effect */}
                  <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-out"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <h4 className="text-xl font-medium text-white" style={{fontFamily: 'Arial, sans-serif'}}>
                          {job.title}
                        </h4>
                        <span className="px-3 py-1 bg-cyan-400/20 text-cyan-100 text-sm rounded-full" style={{fontFamily: 'Arial, sans-serif'}}>
                          {job.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-gray-300 text-sm" style={{fontFamily: 'Arial, sans-serif'}}>
                        <div className="flex items-center gap-1">
                          <span className="text-lg">🇰🇷</span>
                          <span>{job.location}</span>
                        </div>
                        <span>•</span>
                        <span>{job.workType}</span>
                        <span>•</span>
                        <span>{job.salary}</span>
                        <span>•</span>
                        <span>{job.equity}</span>
                      </div>
                    </div>
                    <button className="bg-gray-800 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-lg transition-all duration-300 text-sm relative z-10" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                      Apply now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-400 mb-8 tracking-wide" style={{fontFamily: 'Arial, sans-serif'}}>
              OTHER
            </h3>
            <div className="space-y-6">
              {otherJobs.map((job) => (
                <div key={job.id} className="bg-white/5 backdrop-blur-sm border border-cyan-400/20 rounded-lg p-6 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300 group relative overflow-hidden">
                  {/* Shine effect */}
                  <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-out"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <h4 className="text-xl font-medium text-white" style={{fontFamily: 'Arial, sans-serif'}}>
                          {job.title}
                        </h4>
                        <span className="px-3 py-1 bg-cyan-400/20 text-cyan-100 text-sm rounded-full" style={{fontFamily: 'Arial, sans-serif'}}>
                          {job.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-gray-300 text-sm" style={{fontFamily: 'Arial, sans-serif'}}>
                        <div className="flex items-center gap-1">
                          <span className="text-lg">🇰🇷</span>
                          <span>{job.location}</span>
                        </div>
                        <span>•</span>
                        <span>{job.workType}</span>
                        <span>•</span>
                        <span>{job.salary}</span>
                        <span>•</span>
                        <span>{job.equity}</span>
                      </div>
                    </div>
                    <button className="bg-gray-800 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-lg transition-all duration-300 text-sm relative z-10" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                      Apply now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}