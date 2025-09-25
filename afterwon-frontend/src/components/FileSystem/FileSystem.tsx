'use client'

import { useState, useRef, useEffect } from 'react'
import { User } from 'firebase/auth'
import { firestoreService, FileMetadata } from '@/services/firestore'

interface FileSystemProps {
  user: User | null
}

interface FileItem {
  id: string
  name: string
  size: string
  uploadDate: string
  type: 'csv' | 'excel' | 'image' | 'other'
  selected: boolean
  fileUrl?: string
  originalSize: number
  uploadedAt: Date
}

export default function FileSystem({ user }: FileSystemProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 파일 타입 결정 함수
  const getFileType = (fileName: string, fileType: string): 'csv' | 'excel' | 'image' | 'other' => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (extension === 'csv') return 'csv'
    if (extension === 'xlsx' || extension === 'xls') return 'excel'
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(extension || '')) return 'image'
    
    return 'other'
  }

  // 파일 크기 포맷팅 함수
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 날짜 포맷팅 함수
  const formatUploadDate = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  // Firebase에서 사용자 파일 불러오기
  const loadUserFiles = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      console.log('📁 Loading user files from Firebase...')
      const fileMetadata = await firestoreService.getUserFiles(user.uid)
      console.log('📁 Loaded files:', fileMetadata)
      
      const convertedFiles: FileItem[] = fileMetadata.map(file => ({
        id: file.id || '',
        name: file.fileName,
        size: formatFileSize(file.fileSize),
        uploadDate: formatUploadDate(file.uploadedAt.toDate ? file.uploadedAt.toDate() : new Date(file.uploadedAt)),
        type: getFileType(file.fileName, file.fileType),
        selected: false,
        fileUrl: file.fileUrl,
        originalSize: file.fileSize,
        uploadedAt: file.uploadedAt.toDate ? file.uploadedAt.toDate() : new Date(file.uploadedAt)
      }))
      
      setFiles(convertedFiles)
      console.log('✅ Files converted and set:', convertedFiles)
    } catch (error) {
      console.error('❌ Failed to load user files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 파일 불러오기
  useEffect(() => {
    loadUserFiles()
  }, [user])

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const target = event.target as HTMLElement
        if (!target.closest('.relative')) {
          setOpenMenuId(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv':
      case 'excel':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 0v12h12V4H4z" clipRule="evenodd" />
            <path d="M6 6h8v2H6V6zM6 10h8v2H6v-2zM6 14h4v2H6v-2z" />
          </svg>
        )
      case 'image':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const handleFileSelect = (fileId: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, selected: !file.selected } : file
    ))
  }

  const handleSelectAll = () => {
    const allSelected = files.every(file => file.selected)
    setFiles(prev => prev.map(file => ({ ...file, selected: !allSelected })))
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && user) {
      setLoading(true)
      try {
        // 각 파일을 Firebase에 업로드
        for (const file of Array.from(droppedFiles)) {
          console.log('📤 Uploading dropped file:', file.name)
          await firestoreService.uploadFile(user.uid, file)
        }
        
        // 업로드 완료 후 파일 목록 새로고침
        await loadUserFiles()
        console.log('✅ Dropped files uploaded and list refreshed')
      } catch (error) {
        console.error('❌ Failed to upload dropped files:', error)
        setLoading(false)
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && user) {
      setLoading(true)
      try {
        // 각 파일을 Firebase에 업로드
        for (const file of Array.from(selectedFiles)) {
          console.log('📤 Uploading file:', file.name)
          await firestoreService.uploadFile(user.uid, file)
        }
        
        // 업로드 완료 후 파일 목록 새로고침
        await loadUserFiles()
        console.log('✅ Files uploaded and list refreshed')
      } catch (error) {
        console.error('❌ Failed to upload files:', error)
        setLoading(false)
      }
    }
    
    // 파일 입력 초기화
    if (e.target) {
      e.target.value = ''
    }
  }

  // 선택된 파일 삭제
  const handleDeleteSelected = async () => {
    const selectedFiles = files.filter(file => file.selected)

    if (selectedFiles.length === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.length} file(s)? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setLoading(true)
      console.log('🗑️ Deleting selected files:', selectedFiles.length)

      // Firebase Storage와 Firestore에서 파일들 삭제
      const filesToDelete = selectedFiles.map(file => ({
        id: file.id,
        fileUrl: file.fileUrl || ''
      }))

      await firestoreService.deleteFiles(filesToDelete)

      // 파일 목록 새로고침
      await loadUserFiles()
      console.log('✅ Selected files deleted and list refreshed')
    } catch (error) {
      console.error('❌ Failed to delete selected files:', error)
      alert('Failed to delete files. Please try again.')
      setLoading(false)
    }
  }

  // 개별 파일 삭제
  const handleDeleteFile = async (fileId: string, fileName: string, fileUrl?: string) => {
    if (!fileUrl) {
      alert('File URL not found. Cannot delete file.')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setLoading(true)
      console.log('🗑️ Deleting file:', { fileId, fileName })

      // Firebase Storage와 Firestore에서 파일 삭제
      await firestoreService.deleteFile(fileId, fileUrl)

      // 파일 목록 새로고침
      await loadUserFiles()
      console.log('✅ File deleted and list refreshed')
    } catch (error) {
      console.error('❌ Failed to delete file:', error)
      alert('Failed to delete file. Please try again.')
      setLoading(false)
    }
  }

  const selectedCount = files.filter(file => file.selected).length
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="p-6 pb-4 pt-12">
          <h1 className="text-2xl font-bold mb-2">My Files</h1>
          <p className="text-gray-400 text-sm">
            All files that have been uploaded to Afterwon, and created by Afterwon.
          </p>
        </div>

        {/* Upload Area */}
        <div className="px-6 mb-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-400 bg-blue-400/10'
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium mb-2">Drag files to upload or click to select</p>
            <p className="text-sm text-gray-400">CSV, Excel, PNG, JPG files supported</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg"
        />
      </div>

        {/* Controls */}
        <div className="px-6 mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            disabled={selectedCount === 0}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download ({selectedCount})</span>
          </button>

          <button
            disabled={selectedCount === 0 || loading}
            onClick={handleDeleteSelected}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete ({selectedCount})</span>
          </button>

          <button
            disabled={selectedCount === 0}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat with files ({selectedCount})</span>
          </button>
        </div>
      </div>

        {/* File Table */}
        <div className="flex-1 px-6 overflow-hidden">
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 bg-gray-800 text-sm font-medium text-gray-300">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={files.length > 0 && files.every(file => file.selected)}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Upload Date</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span>Loading files...</span>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'No files found matching your search.' : 'No files uploaded yet.'}
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-700 hover:bg-gray-800 transition-colors ${
                    file.selected ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={file.selected}
                      onChange={() => handleFileSelect(file.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div className="col-span-6 flex items-center space-x-3">
                    {getFileIcon(file.type)}
                    <span className="text-sm text-gray-300 truncate">{file.name}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-400">{file.size}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-400">{file.uploadDate}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end relative">
                    <button
                      className="p-1 hover:bg-gray-700 rounded"
                      onClick={() => setOpenMenuId(openMenuId === file.id ? null : file.id)}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === file.id && (
                      <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                        <button
                          onClick={() => {
                            handleDeleteFile(file.id, file.name, file.fileUrl)
                            setOpenMenuId(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}