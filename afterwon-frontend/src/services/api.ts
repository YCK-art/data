const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface FileUploadResponse {
  file_id: string
  filename: string
  file_size: number
  columns: string[]
  row_count: number
  preview: any[]
  uploaded_at: string
}

export interface AnalysisRequest {
  file_id: string
  question: string
  chart_type?: string
}

export interface AnalysisResponse {
  analysis_id: string
  insights: string[]
  chart_data: any
  summary: string
  follow_up_questions?: string[]
}

export interface GeneralQuestionResponse {
  answer: string
}

export interface ChatTitleResponse {
  title: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface UnifiedQuestionRequest {
  question: string
  file_id?: string | null
  conversation_history?: ConversationMessage[]
}

export interface UnifiedQuestionResponse {
  answer: string
  codeExecution?: {
    codeChunks: string[]
    isExecuting: boolean
    result?: string
  }
  insights?: string[]
  followUpQuestions?: string[]
  chartData?: any
  fileInfo?: {
    filename: string
    fileSize: number
    fileType: string
    file_id: string
  }
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || '파일 업로드 실패')
    }

    return response.json()
  }

  async getFilePreview(fileId: string, filename: string) {
    return this.request(`/api/files/${fileId}/preview?filename=${encodeURIComponent(filename)}`)
  }

  async analyzeData(request: AnalysisRequest): Promise<AnalysisResponse> {
    return this.request('/api/analysis/request', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async askGeneralQuestion(question: string): Promise<GeneralQuestionResponse> {
    return this.request('/api/chat/question', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  }

  async generateChatTitle(message: string): Promise<ChatTitleResponse> {
    return this.request('/api/chat/generate-title', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  async askUnifiedQuestion(request: UnifiedQuestionRequest): Promise<UnifiedQuestionResponse> {
    return this.request('/api/chat/unified-question', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // 스트리밍 API 메서드
  async askUnifiedQuestionStream(
    request: UnifiedQuestionRequest,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/unified-question-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('스트리밍을 지원하지 않는 브라우저입니다.')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete?.()
          break
        }

        // 새로운 데이터를 버퍼에 추가
        buffer += decoder.decode(value, { stream: true })

        // 완성된 줄들을 처리
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 마지막 불완전한 줄은 버퍼에 보관

        for (const line of lines) {
          if (line.trim() === '') continue

          // SSE 형식에서 "data: " 접두사 제거
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6)
            try {
              const chunk = JSON.parse(jsonStr)
              onChunk(chunk)
            } catch (parseError) {
              console.warn('JSON 파싱 오류:', parseError, 'Raw data:', jsonStr)
            }
          }
        }
      }
    } catch (error) {
      console.error('스트리밍 오류:', error)
      onError?.(error as Error)
    }
  }

  async healthCheck() {
    return this.request('/health')
  }

  // WebSocket connection for real-time analysis
  createAnalysisWebSocket(): WebSocket {
    const wsUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000'
    return new WebSocket(`${wsUrl}/ws/analysis`)
  }
}

export const apiService = new ApiService()