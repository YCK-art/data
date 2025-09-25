'use client'

import { useState } from 'react'
import { FaGoogle, FaApple } from 'react-icons/fa'
import { MdEmail, MdClose } from 'react-icons/md'
import { authService } from '@/services/auth'
import { useRouter } from 'next/navigation'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onStartLoading?: () => void
}

export default function LoginModal({ isOpen, onClose, onStartLoading }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const user = await authService.signInWithGoogle()
      if (user) {
        console.log('User signed in:', user)
        // Close modal and start loading screen after successful authentication
        onClose()
        onStartLoading?.()
        // Add a small delay to show the loading screen
        await new Promise(resolve => setTimeout(resolve, 1500))
        router.push('/chat') // Redirect to chat page after successful sign-in
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      alert('Failed to sign in with Google. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl p-12 max-w-lg w-full mx-4 relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MdClose size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-light text-cyan-400 mb-4" style={{fontFamily: 'SpectralLight, serif'}}>
            Sign in or sign up to continue
          </h2>
          <p className="text-gray-600 font-medium" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>What is your work email?</p>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-4 mb-8">
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-cyan-400 text-[#001a2e] py-4 px-6 font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
          >
            <FaGoogle size={20} />
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <button className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-800 py-4 px-6 font-medium hover:bg-gray-200 transition-colors" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
            <FaApple size={20} />
            Continue with Apple
          </button>

          <button className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-800 py-4 px-6 font-medium hover:bg-gray-200 transition-colors" style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}>
            <MdEmail size={20} />
            Continue with email
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <a 
            href="#" 
            className="text-cyan-400 hover:text-cyan-500 transition-colors text-sm underline font-medium"
            style={{fontFamily: 'Arial, sans-serif', fontWeight: 500}}
          >
            Why sign up with my work email?
          </a>
        </div>
      </div>
    </div>
  )
}