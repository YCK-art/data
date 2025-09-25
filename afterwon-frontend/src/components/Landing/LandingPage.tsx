'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiArrowUpRight, FiArrowLeft, FiArrowRight, FiPlay, FiMenu, FiX } from 'react-icons/fi'
import LoginModal from '../Auth/LoginModal'
import LoadingScreen from '../Auth/LoadingScreen'
import { authService } from '@/services/auth'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isLoadingScreenVisible, setIsLoadingScreenVisible] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('Finance')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [progressPercentage, setProgressPercentage] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Sample images for the slider (you can replace with actual image paths)
  const images = [
    '/image/logo.png', // Using existing logo as placeholder
    '/image/logo.png', // You can add more image paths here
    '/image/logo.png',
  ]

  const formats = ['Finance', 'Marketing', 'Product Team', 'Consulting', 'Research']

  // Check for redirect result on page load
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const user = await authService.checkRedirectResult()
        if (user) {
          console.log('User signed in via redirect:', user)
          setIsLoadingScreenVisible(true)
          // Add delay and redirect to chat
          await new Promise(resolve => setTimeout(resolve, 1500))
          router.push('/chat')
        }
      } catch (error) {
        console.error('Redirect result error:', error)
      }
    }

    checkRedirectResult()
  }, [router])

  // Progress bar and auto-slide effect for cards
  useEffect(() => {
    const startProgressAndAutoSlide = () => {
      // Clear existing intervals
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }

      // Reset progress
      setProgressPercentage(0)

      // Progress bar update (every 70ms for smooth animation = 7000ms / 100)
      let progress = 0
      progressIntervalRef.current = setInterval(() => {
        progress += 1
        setProgressPercentage(progress)

        if (progress >= 100) {
          clearInterval(progressIntervalRef.current!)
        }
      }, 70)

      // Auto slide after 7 seconds
      autoSlideIntervalRef.current = setTimeout(() => {
        console.log('Auto-slide triggered')

        // Get current state directly from the ref to avoid stale closure
        setSelectedFormat((currentFormat) => {
          const currentIndex = formats.indexOf(currentFormat)
          const nextIndex = (currentIndex + 1) % formats.length
          const nextFormat = formats[nextIndex]
          console.log(`Moving from ${currentFormat} (index: ${currentIndex}) to ${nextFormat} (index: ${nextIndex})`)

          // Move to next card immediately with the correct index
          setTimeout(() => {
            const moveCard = () => {
              if (scrollContainerRef.current) {
                const container = scrollContainerRef.current.parentElement
                if (container) {
                  const cardWidth = window.innerWidth * 0.85 // 85vw per card
                  const scrollPosition = nextIndex * cardWidth

                  console.log(`Scrolling to position: ${scrollPosition}, cardWidth: ${cardWidth}, nextIndex: ${nextIndex}`)

                  container.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                  })

                  // Verify scroll position after a delay
                  setTimeout(() => {
                    if (Math.abs(container.scrollLeft - scrollPosition) > 10) {
                      console.log('Scroll failed, retrying...')
                      container.scrollTo({
                        left: scrollPosition,
                        behavior: 'auto'
                      })
                    }
                  }, 500)
                } else {
                  console.error('Container not found')
                }
              } else {
                console.log('ScrollContainerRef not ready yet, skipping')
              }
            }

            // Try to move immediately and with delay
            moveCard()
            setTimeout(moveCard, 100)
          }, 50)

          return nextFormat
        })

        // Reset progress
        setProgressPercentage(0)

        // Restart the cycle immediately
        setTimeout(() => startProgressAndAutoSlide(), 200)
      }, 7000)
    }

    // Start auto slide only on client side with a delay to ensure DOM is ready
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          startProgressAndAutoSlide()
        } else {
          // Retry after a longer delay if ref is not ready
          const retryTimer = setTimeout(() => {
            startProgressAndAutoSlide()
          }, 500)
        }
      }, 100)

      return () => clearTimeout(timer)
    }

    // Cleanup on unmount
    return () => {
      if (autoSlideIntervalRef.current) {
        clearTimeout(autoSlideIntervalRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Hero section image auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 3000) // Change image every 3 seconds

    return () => clearInterval(interval)
  }, [images.length])

  const handleGetStartedClick = () => {
    setIsLoginModalOpen(true)
  }

  const handleStartLoading = () => {
    setIsLoadingScreenVisible(!isLoadingScreenVisible)
  }

  const handlePlayVideo = () => {
    setIsVideoPlaying(true)
    // Replace iframe src with autoplay parameter
    if (iframeRef.current) {
      iframeRef.current.src = "https://www.youtube.com/embed/UF8uR6Z6KLc?autoplay=1&enablejsapi=1"
    }
  }

  const handleFormatClick = (format: string) => {
    setSelectedFormat(format)
    const index = formats.indexOf(format)

    // Clear current timers
    if (autoSlideIntervalRef.current) {
      clearTimeout(autoSlideIntervalRef.current)
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    // Reset progress
    setProgressPercentage(0)

    // Move to selected card with enhanced reliability
    const moveToCard = () => {
      if (scrollContainerRef.current && index !== -1) {
        const container = scrollContainerRef.current.parentElement
        if (container) {
          const cardWidth = window.innerWidth * 0.85 // 85vw per card
          const scrollPosition = index * cardWidth

          console.log(`Moving to selected card: ${format}, position: ${scrollPosition}`)

          container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          })

          // Verify scroll position
          setTimeout(() => {
            if (Math.abs(container.scrollLeft - scrollPosition) > 10) {
              console.log('Initial scroll failed, using auto behavior')
              container.scrollTo({
                left: scrollPosition,
                behavior: 'auto'
              })
            }
          }, 300)
        }
      }
    }

    moveToCard()
    setTimeout(moveToCard, 50) // Backup attempt

    // Restart the auto-slide cycle from the new position
    setTimeout(() => {
      // Progress bar update
      let progress = 0
      progressIntervalRef.current = setInterval(() => {
        progress += 1
        setProgressPercentage(progress)

        if (progress >= 100) {
          clearInterval(progressIntervalRef.current!)
        }
      }, 70)

      // Auto slide after 7 seconds - restart the continuous cycle
      autoSlideIntervalRef.current = setTimeout(() => {
        // Move to next format and reset progress simultaneously
        const currentIndex = formats.indexOf(format)
        const nextIndex = (currentIndex + 1) % formats.length
        const nextFormat = formats[nextIndex]

        // Update format and reset progress in same render
        setSelectedFormat(nextFormat)
        setProgressPercentage(0)

        // Force card movement with multiple attempts
        const moveCard = () => {
          if (scrollContainerRef.current) {
            const container = scrollContainerRef.current.parentElement
            if (container) {
              const cardWidth = window.innerWidth * 0.85
              const scrollPosition = nextIndex * cardWidth

              console.log(`Manual scroll to position: ${scrollPosition}, cardWidth: ${cardWidth}, nextIndex: ${nextIndex}`)

              container.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
              })

              // Verify scroll position after a delay
              setTimeout(() => {
                if (Math.abs(container.scrollLeft - scrollPosition) > 10) {
                  console.log('Manual scroll failed, retrying...')
                  container.scrollTo({
                    left: scrollPosition,
                    behavior: 'auto'
                  })
                }
              }, 500)
            }
          }
        }

        // Try to move immediately and with delay
        moveCard()
        setTimeout(moveCard, 100)

        // Continue the infinite cycle by restarting the function
        const startAutoSlide = () => {
          // Clear existing intervals
          if (autoSlideIntervalRef.current) {
            clearTimeout(autoSlideIntervalRef.current)
          }
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }

          // Reset progress
          setProgressPercentage(0)

          // Progress bar update (every 70ms for smooth animation = 7000ms / 100)
          let progress = 0
          progressIntervalRef.current = setInterval(() => {
            progress += 1
            setProgressPercentage(progress)

            if (progress >= 100) {
              clearInterval(progressIntervalRef.current!)
            }
          }, 70)

          // Auto slide after 7 seconds
          autoSlideIntervalRef.current = setTimeout(() => {
            // Move to next format and reset progress simultaneously
            const currentIndex = formats.indexOf(selectedFormat)
            const nextIndex = (currentIndex + 1) % formats.length
            const nextFormat = formats[nextIndex]

            // Update format and reset progress in same render
            setSelectedFormat(nextFormat)
            setProgressPercentage(0)

            // Move to next card
            if (scrollContainerRef.current) {
              const container = scrollContainerRef.current.parentElement
              const cardWidth = window.innerWidth * 0.85
              const scrollPosition = nextIndex * cardWidth

              if (container) {
                container.scrollTo({
                  left: scrollPosition,
                  behavior: 'smooth'
                })
              }
            }

            // Restart the cycle
            setTimeout(() => startAutoSlide(), 200)
          }, 7000)
        }

        setTimeout(() => startAutoSlide(), 200)
      }, 7000)
    }, 300)
  }

  const handlePrevious = () => {
    const currentIndex = formats.indexOf(selectedFormat)
    if (currentIndex > 0) {
      handleFormatClick(formats[currentIndex - 1])
    }
  }

  const handleNext = () => {
    const currentIndex = formats.indexOf(selectedFormat)
    if (currentIndex < formats.length - 1) {
      handleFormatClick(formats[currentIndex + 1])
    }
  }

  return (
    <>
    <div className={`min-h-screen bg-gradient-to-br from-[#001a2e] via-[#001122] to-[#000814] relative ${isLoginModalOpen ? 'blur-sm' : ''}`}>

      {/* Toolbar */}
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
                <Image
                  src="/image/logo.png"
                  alt="Afterwon Logo"
                  width={45}
                  height={45}
                  className="object-contain"
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
                      {formats.map((format) => (
                        <a
                          key={format}
                          href={`#${format.toLowerCase().replace(' ', '-')}`}
                          onClick={(e) => {
                            e.preventDefault()
                            handleFormatClick(format)
                            // Scroll to the format section
                            const section = document.getElementById('usecase')
                            if (section) {
                              section.scrollIntoView({ behavior: 'smooth' })
                            }
                          }}
                          className="block px-4 py-3 text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:backdrop-blur-sm text-sm transition-all duration-200 rounded-md mx-1"
                          style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                        >
                          {format}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <a href="/careers" className="text-white hover:text-cyan-100 px-3 py-2 rounded-md text-sm font-medium transition-colors" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                  Careers
                </a>
                <a href="#enterprise" className="text-white hover:text-cyan-100 px-3 py-2 rounded-md text-sm font-medium transition-colors" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
                  Enterprise sales
                </a>
              </div>
            </div>

            {/* Desktop Get Started Button */}
            <div className="hidden min-[1000px]:flex items-center space-x-4 mr-8 sm:mr-10 lg:mr-12">
              <button
                onClick={handleGetStartedClick}
                className="bg-black hover:bg-gray-900 text-white px-6 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 group"
              >
                <FiArrowUpRight size={16} className="transition-transform duration-200 group-hover:rotate-45" />
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="min-[1000px]:hidden flex items-center mr-8 relative z-70">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-cyan-100 p-2 transition-colors relative z-70"
              >
                {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - New Design */}
        {isMobileMenuOpen && (
          <div className="min-[1000px]:hidden absolute top-full left-0 w-full bg-[#001a2e] border-t border-cyan-400/20 z-60 shadow-lg">
            <div className="px-8 py-6 space-y-4">
              <a 
                href="#usecase" 
                className="block text-white hover:text-cyan-100 py-3 text-lg font-medium transition-colors border-b border-cyan-400/10 last:border-b-0"
                style={{fontFamily: 'NunitoSans, sans-serif', fontWeight: 500}}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Use cases
              </a>
              <a
                href="/careers"
                className="block text-white hover:text-cyan-100 py-3 text-lg font-medium transition-colors border-b border-cyan-400/10 last:border-b-0"
                style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Careers
              </a>
              <a 
                href="#enterprise" 
                className="block text-white hover:text-cyan-100 py-3 text-lg font-medium transition-colors border-b border-cyan-400/10 last:border-b-0"
                style={{fontFamily: 'NunitoSans, sans-serif', fontWeight: 500}}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Enterprise sales
              </a>
              <button
                onClick={() => {
                  handleGetStartedClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-black hover:bg-gray-900 text-white px-6 py-3 text-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 group mt-4"
              >
                <FiArrowUpRight size={20} className="transition-transform duration-200 group-hover:rotate-45" />
                Get Started
              </button>
            </div>
          </div>
        )}
        
        {/* Vertical Lines */}
        <div className="absolute top-16 left-0 right-0 pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Left line from AfterWon logo */}
            <div className="absolute left-4 sm:left-6 lg:left-8 top-0 w-px h-screen bg-cyan-400/20"></div>
            {/* Right line from Get Started button */}
            <div className="absolute right-4 sm:right-6 lg:right-8 top-0 w-px h-screen bg-cyan-400/20"></div>
          </div>
        </div>
      </nav>


      {/* Hero Section */}
      <main className="relative z-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-light text-white mb-6 leading-tight" style={{fontFamily: 'SpectralLight, serif'}}>
            Data Meets Intelligence
          </h1>
          
          <p className="text-xl text-cyan-100 mb-12 max-w-4xl mx-auto leading-relaxed font-medium" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
            Upload your data, ask questions, get instant analysis and visualizations
          </p>

          <div className="flex justify-center gap-4 mb-16">
            <button
              onClick={handleGetStartedClick}
              className="bg-white hover:bg-gray-100 text-[#001a2e] px-6 py-2 text-base font-medium transition-colors duration-200"
              style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
            >
              Start Now
            </button>
            <button className="text-cyan-100 hover:text-white px-6 py-2 text-base font-medium border border-cyan-400/30 hover:border-cyan-400/50 transition-colors duration-200" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
              View More
            </button>
          </div>
        </div>

        {/* Image Slider - Full width touching vertical lines */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Image viewer spanning full width from left line to right line */}
          <div className="absolute left-0 right-0">
            <div className="bg-white aspect-[20/10] flex items-center justify-center relative overflow-hidden shadow-lg group">
              {/* YouTube Video */}
              <iframe
                ref={iframeRef}
                src="https://www.youtube.com/embed/UF8uR6Z6KLc?enablejsapi=1"
                title="YouTube video player"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              
              {/* Custom Play Button Overlay */}
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50 cursor-pointer">
                  <button
                    onClick={handlePlayVideo}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0f4c75] via-[#3282b8] to-[#0f4c75] flex items-center justify-center relative overflow-hidden z-50 cursor-pointer transition-all duration-300 hover:shadow-lg before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-all before:duration-700 hover:before:left-full"
                  >
                    <FiPlay size={20} className="text-white ml-0.5 relative z-10" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Spacer for proper height */}
          <div className="aspect-[20/10] opacity-0"></div>
        </div>
      </main>
    </div>

    {/* File Format Section */}
    <section id="usecase" className="bg-white py-16 md:py-24 relative">
      {/* Vertical Lines for white section */}
      <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative h-full">
          {/* Left line */}
          <div className="absolute left-4 sm:left-6 lg:left-8 top-0 bottom-0 w-px bg-black/20"></div>
          {/* Right line */}
          <div className="absolute right-4 sm:right-6 lg:right-8 top-0 bottom-0 w-px bg-black/20"></div>
        </div>
      </div>
      
      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Tab Control - Responsive positioning */}
        <div className="flex justify-center lg:justify-start mb-16 lg:ml-[100px] xl:ml-[200px] 2xl:ml-[500px] overflow-x-auto px-4">
          <div className="flex gap-2 md:gap-4 min-w-max">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => handleFormatClick(format)}
                className={`relative overflow-hidden px-3 md:px-6 py-2 md:py-3 font-medium text-sm md:text-base transition-all duration-200 whitespace-nowrap ${
                  selectedFormat === format
                    ? 'bg-gray-400 text-white'
                    : 'bg-gray-400 text-white hover:bg-gray-500'
                }`}
                style={{fontFamily: 'Arial, sans-serif'}}
              >
                {/* Animated Progress Background */}
                {selectedFormat === format && progressPercentage > 0 && (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-[#0f4c75] via-[#3282b8] to-[#0f4c75] transition-all duration-75 ease-linear"
                    style={{
                      width: `${progressPercentage}%`,
                      clipPath: `inset(0 ${100 - progressPercentage}% 0 0)`
                    }}
                  />
                )}

                {/* Button Text */}
                <span className="relative z-10 text-white">
                  {format}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Screen Display */}
        <div className="w-full overflow-hidden relative z-20">
          <div
            ref={scrollContainerRef}
            className="flex pb-4"
            style={{
              width: 'calc(85vw * 5)',
              scrollBehavior: 'smooth',
              paddingLeft: '0'
            }}
          >
            {formats.map((format, index) => (
              <div key={`${format}-${index}`} className="flex-shrink-0 w-[85vw] flex justify-center items-center">
                {/* Screen View */}
                <div className="w-[80vw] h-[50vh] md:h-[60vh] lg:h-[65vh] bg-black relative z-30 shadow-2xl border border-gray-300 flex items-center justify-center rounded-lg group">
                  {format === 'Product Team' ? (
                    <>
                      <Image
                        src="/image/product.png"
                        alt="Product Team View"
                        fill
                        className="object-cover"
                      />
                      {/* Transparent text overlay */}
                      <div className="absolute top-4 md:top-8 left-4 md:left-8 bg-gradient-to-br from-[#0f4c75]/20 via-[#3282b8]/30 to-[#0f4c75]/20 backdrop-blur-sm p-4 md:p-8 max-w-xs md:max-w-md">
                        <h3 className="text-black text-xl md:text-3xl font-bold mb-2 md:mb-4 flex items-center gap-2" style={{fontFamily: 'SpectralLight, serif'}}>
                          Product Team
                          <span className="transition-transform duration-200 hover:rotate-45 cursor-pointer">
                            <FiArrowUpRight size={20} className="text-black md:hidden" />
                            <FiArrowUpRight size={24} className="text-black hidden md:block" />
                          </span>
                        </h3>
                        <p className="text-black text-sm md:text-lg leading-relaxed" style={{fontFamily: 'Arial, sans-serif'}}>
                          No More, Mind Buggling Excels to Analyze the Product
                        </p>
                      </div>
                    </>
                  ) : format === 'Finance' ? (
                    <>
                      <Image
                        src="/image/finance.png"
                        alt="Finance View"
                        fill
                        className="object-cover"
                      />
                      {/* Transparent text overlay for Finance */}
                      <div className="absolute top-4 md:top-8 left-4 md:left-8 bg-gradient-to-br from-[#0f4c75]/20 via-[#3282b8]/30 to-[#0f4c75]/20 backdrop-blur-sm p-4 md:p-8 max-w-xs md:max-w-md">
                        <h3 className="text-black text-xl md:text-3xl font-bold mb-2 md:mb-4 flex items-center gap-2" style={{fontFamily: 'SpectralLight, serif'}}>
                          Finance
                          <span className="transition-transform duration-200 hover:rotate-45 cursor-pointer">
                            <FiArrowUpRight size={20} className="text-black md:hidden" />
                            <FiArrowUpRight size={24} className="text-black hidden md:block" />
                          </span>
                        </h3>
                        <p className="text-black text-sm md:text-lg leading-relaxed" style={{fontFamily: 'Arial, sans-serif'}}>
                          Transform Complex Financial Data into Clear, Actionable Insights
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-white text-lg font-medium" style={{fontFamily: 'NunitoSans, sans-serif'}}>
                        {format} View
                      </div>
                      {/* Transparent text overlay for other formats */}
                      <div className="absolute top-4 md:top-8 left-4 md:left-8 bg-gradient-to-br from-[#0f4c75]/20 via-[#3282b8]/30 to-[#0f4c75]/20 backdrop-blur-sm p-4 md:p-8 max-w-xs md:max-w-md">
                        <h3 className="text-black text-xl md:text-3xl font-bold mb-2 md:mb-4 flex items-center gap-2" style={{fontFamily: 'SpectralLight, serif'}}>
                          {format}
                          <span className="transition-transform duration-200 hover:rotate-45 cursor-pointer">
                            <FiArrowUpRight size={20} className="text-black md:hidden" />
                            <FiArrowUpRight size={24} className="text-black hidden md:block" />
                          </span>
                        </h3>
                        <p className="text-black text-sm md:text-lg leading-relaxed" style={{fontFamily: 'Arial, sans-serif'}}>
                          {format === 'Finance' && 'Transform Complex Financial Data into Clear, Actionable Insights'}
                          {format === 'Marketing' && 'Turn Campaign Data into Strategic Marketing Intelligence'}
                          {format === 'Consulting' && 'Deliver Data-Driven Solutions for Strategic Decision Making'}
                          {format === 'Research' && 'Convert Research Data into Compelling Visual Stories'}
                        </p>
                      </div>
                    </>
                  )}
                  
                  {/* Left Navigation Button - hide for Finance */}
                  {format !== 'Finance' && (
                    <div className="absolute left-0 top-0 h-full w-32 flex items-center justify-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={handlePrevious}
                        className="w-12 h-12 bg-white bg-opacity-50 hover:bg-opacity-70 border border-gray-300 flex items-center justify-center transition-all duration-200 ml-4"
                      >
                        <FiArrowLeft size={20} className="text-gray-700" />
                      </button>
                    </div>
                  )}
                  
                  {/* Right Navigation Button - hide for Research */}
                  {format !== 'Research' && (
                    <div className="absolute right-0 top-0 h-full w-32 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={handleNext}
                        className="w-12 h-12 bg-white bg-opacity-50 hover:bg-opacity-70 border border-gray-300 flex items-center justify-center transition-all duration-200 mr-4"
                      >
                        <FiArrowRight size={20} className="text-gray-700" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>
    </section>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onStartLoading={handleStartLoading}
      />
      
      {/* Loading Screen */}
      <LoadingScreen isVisible={isLoadingScreenVisible} />
    </>
  )
}