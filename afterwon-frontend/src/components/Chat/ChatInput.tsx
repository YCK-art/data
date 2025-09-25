'use client'

import { useState, KeyboardEvent, useRef, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onFileUpload?: (file: File) => void
  isLoading: boolean
  disabled?: boolean
  hasFile?: boolean
  placeholder?: string
}

export default function ChatInput({ onSendMessage, onFileUpload, isLoading, disabled, hasFile, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!input.trim() || isLoading || disabled) return
    onSendMessage(input) // trim() 제거하여 줄바꿈 보존
    setInput('')

    // 전송 후 텍스트 영역 높이를 기본값으로 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px'
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // File upload functionality
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !onFileUpload) return
    const file = acceptedFiles[0]
    await onFileUpload(file)
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isLoading,
    noClick: true,
    noKeyboard: true
  })

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileUpload) {
      onFileUpload(file)
    }
    // 파일 업로드 후 input 초기화
    if (e.target) {
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Main Input Area - Claude Style */}
      <div 
        {...getRootProps()}
        className={`relative transition-all duration-200 ${
          isDragActive ? 'ring-2 ring-blue-400 ring-offset-2' : ''
        }`}
      >
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".csv,.xls,.xlsx"
          className="hidden"
        />
        
        <div className="relative flex items-center bg-slate-700 border border-slate-600 rounded-2xl shadow-sm hover:border-slate-500 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all min-h-[48px]">
          {/* Plus Button */}
          {onFileUpload && (
            <button
              onClick={handleFileSelect}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center justify-center w-12 h-12 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              title="파일 업로드"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
          
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || (!hasFile ? "파일을 업로드하고 데이터에 대해 질문해보세요..." : "데이터에 대해 질문해보세요...")}
            className="flex-1 py-0 px-0 bg-transparent border-none resize-none focus:outline-none text-white placeholder:text-slate-400 text-base leading-6 flex items-center"
            rows={1}
            disabled={isLoading}
            style={{
              height: '48px',
              minHeight: '48px',
              maxHeight: '120px',
              paddingTop: '12px',
              paddingBottom: '12px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '48px';
              const newHeight = Math.max(48, Math.min(target.scrollHeight, 120));
              target.style.height = newHeight + 'px';
            }}
          />
          
          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 flex items-center justify-center w-12 h-12 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            title="메시지 전송"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Drag overlay */}
        {isDragActive && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-300 rounded-2xl flex items-center justify-center z-10">
            <div className="text-blue-600 font-medium">파일을 여기에 드롭하세요</div>
          </div>
        )}
      </div>
      
      {/* Helper text */}
      <div className="text-xs text-slate-400 text-center">
        {!hasFile ? (
          "CSV, Excel 파일을 업로드하거나 드래그해서 분석을 시작하세요"
        ) : (
          "Enter로 전송 • Shift+Enter로 줄바꿈"
        )}
      </div>
    </div>
  )
}