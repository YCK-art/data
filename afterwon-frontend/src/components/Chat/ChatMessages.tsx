import { RefObject, useState } from 'react'
import PlotlyChart from '../Chart/PlotlyChart'
import FollowUpQuestions from './FollowUpQuestions'
import DataTable from '../Table/DataTable'
import CodeExecution from './CodeExecution'
import { FaFileCsv, FaFilePdf, FaFileExcel } from 'react-icons/fa'
import { User } from 'firebase/auth'
import Image from 'next/image'
import { useTypewriter } from '@/hooks/useTypewriter'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

// 테이블 파싱 함수
const parseTable = (lines: string[], startIndex: number) => {
  const tableLines = []
  let endIndex = startIndex

  // 테이블 라인들 수집
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('|') && line.endsWith('|')) {
      tableLines.push(line)
      endIndex = i
    } else {
      break
    }
  }

  if (tableLines.length < 2) return null

  // 헤더와 구분선 파싱
  const headerLine = tableLines[0]
  const separatorLine = tableLines[1]
  const dataLines = tableLines.slice(2)

  // 헤더 파싱
  const headers = headerLine
    .split('|')
    .slice(1, -1) // 첫 번째와 마지막 빈 요소 제거
    .map(cell => cell.trim())

  // 데이터 행 파싱
  const rows = dataLines.map(line =>
    line
      .split('|')
      .slice(1, -1) // 첫 번째와 마지막 빈 요소 제거
      .map(cell => cell.trim())
  )

  return {
    headers,
    rows,
    endIndex
  }
}

// 개선된 마크다운 렌더링 함수
const formatMessage = (content: string) => {
  // console.log('🚀 formatMessage received content:', content) // 디버깅

  // 줄바꿈 처리 (두 번의 줄바꿈을 단락으로, 한 번의 줄바꿈을 br로)
  const paragraphs = content.split('\n\n')

  return paragraphs.map((paragraph, pIndex) => {
    // console.log(`📄 Processing paragraph ${pIndex}:`, paragraph) // 디버깅

    // 각 단락 내에서 줄바꿈 처리
    const lines = paragraph.split('\n')
    const elements: JSX.Element[] = []

    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      // 빈 줄이나 공백만 있는 줄은 건너뛰기
      if (!line.trim()) {
        i++
        continue
      }

      // 테이블 체크
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableData = parseTable(lines, i)
        if (tableData) {
          elements.push(
            <div key={`table-${i}`} className="my-4 overflow-x-auto">
              <table className="min-w-full bg-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-700">
                  <tr>
                    {tableData.headers.map((header, hIndex) => (
                      <th
                        key={hIndex}
                        className="px-4 py-3 text-left text-sm font-semibold text-slate-200 border-b border-slate-600"
                      >
                        {formatInlineMarkdown(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rIndex) => (
                    <tr
                      key={rIndex}
                      className={rIndex % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}
                    >
                      {row.map((cell, cIndex) => (
                        <td
                          key={cIndex}
                          className="px-4 py-3 text-sm text-slate-300 border-b border-slate-700"
                        >
                          {formatInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          i = tableData.endIndex + 1
          continue
        }
      }

      // 리스트 항목 체크
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listContent = line.trim().substring(2)
        elements.push(
          <div key={i} className="flex items-start mb-1">
            <span className="mr-2 text-blue-500">•</span>
            <span>{formatInlineMarkdown(listContent)}</span>
          </div>
        )
        i++
        continue
      }

      // 번호 리스트 체크
      const numberListMatch = line.trim().match(/^(\d+)\.\s(.+)/)
      if (numberListMatch) {
        elements.push(
          <div key={i} className="flex items-start mb-1">
            <span className="mr-2 text-blue-500 font-semibold">{numberListMatch[1]}.</span>
            <span>{formatInlineMarkdown(numberListMatch[2])}</span>
          </div>
        )
        i++
        continue
      }

      // 인용문 체크
      if (line.trim().startsWith('> ')) {
        const quoteContent = line.trim().substring(2)
        elements.push(
          <div key={i} className="border-l-4 border-blue-500 pl-4 my-2 italic text-gray-300 bg-gray-800/30 py-2 rounded-r-lg">
            {formatInlineMarkdown(quoteContent)}
          </div>
        )
        i++
        continue
      }

      // 헤딩 체크
      if (line.trim().startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-lg font-semibold text-white mt-4 mb-2">
            {formatInlineMarkdown(line.trim().substring(4))}
          </h3>
        )
        i++
        continue
      }

      if (line.trim().startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-xl font-semibold text-white mt-4 mb-2">
            {formatInlineMarkdown(line.trim().substring(3))}
          </h2>
        )
        i++
        continue
      }

      if (line.trim().startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-2xl font-bold text-white mt-4 mb-2">
            {formatInlineMarkdown(line.trim().substring(2))}
          </h1>
        )
        i++
        continue
      }

      // 일반 텍스트
      // console.log(`📝 Processing line ${i}:`, line) // 디버깅
      elements.push(
        <span key={i}>
          {formatInlineMarkdown(line)}
          {i < lines.length - 1 && <br />}
        </span>
      )
      i++
    }

    return (
      <div key={pIndex} className={pIndex > 0 ? 'mt-4' : ''}>
        {elements}
      </div>
    )
  })
}

// 텍스트 정리 함수 - JSON 형식 등을 읽기 쉽게 변환 (LaTeX는 별도 처리)
const cleanText = (text: string) => {
  let cleaned = text

  // JSON 형식 괄호 제거
  cleaned = cleaned.replace(/^\s*\{\s*/, '') // 시작 중괄호 제거
  cleaned = cleaned.replace(/\s*\}\s*$/, '') // 끝 중괄호 제거
  cleaned = cleaned.replace(/^\s*\[\s*/, '') // 시작 대괄호 제거
  cleaned = cleaned.replace(/\s*\]\s*$/, '') // 끝 대괄호 제거

  // 불필요한 JSON 키-값 형식 정리
  cleaned = cleaned.replace(/"([^"]+)":\s*"([^"]+)"/g, '$1: $2')
  cleaned = cleaned.replace(/"([^"]+)":\s*([^",}]+)/g, '$1: $2')

  // 연속된 특수문자 정리
  cleaned = cleaned.replace(/\]\s*,\s*\[/g, ', ')
  cleaned = cleaned.replace(/\}\s*,\s*\{/g, ', ')
  cleaned = cleaned.replace(/,,+/g, ',')
  cleaned = cleaned.replace(/\s+,/g, ',')
  cleaned = cleaned.replace(/,\s+/g, ', ')

  // 불필요한 따옴표 제거
  cleaned = cleaned.replace(/^"|"$/g, '')
  cleaned = cleaned.replace(/^'|'$/g, '')

  // 연속된 공백 정리
  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.trim()

  return cleaned
}

// 수학 수식 렌더링 함수
const renderMathContent = (text: string) => {
  try {
    // LaTeX 블록 수식 (\[...\]) 찾기
    const latexBlockRegex = /\\\[([^\]]+)\\\]/g
    // 블록 수식 ($$...$$) 찾기
    const blockMathRegex = /\$\$([^$]+)\$\$/g
    // 인라인 수식 ($...$) 찾기 (블록 수식이 아닌 경우)
    const inlineMathRegex = /(?<!\$)\$([^$\n]+)\$(?!\$)/g

    const parts = []
    let lastIndex = 0
    let match

    // LaTeX 블록 수식 처리
    const latexBlockMatches = []
    while ((match = latexBlockRegex.exec(text)) !== null) {
      latexBlockMatches.push({
        type: 'block',
        content: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length
      })
    }

    // 일반 블록 수식 처리
    const blockMatches = []
    while ((match = blockMathRegex.exec(text)) !== null) {
      blockMatches.push({
        type: 'block',
        content: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length
      })
    }

    // 인라인 수식 처리 (블록 수식과 겹치지 않는 것만)
    const inlineMatches = []
    while ((match = inlineMathRegex.exec(text)) !== null) {
      const isInBlock = [...latexBlockMatches, ...blockMatches].some(block =>
        match.index >= block.start && match.index < block.end
      )
      if (!isInBlock) {
        inlineMatches.push({
          type: 'inline',
          content: match[1].trim(),
          start: match.index,
          end: match.index + match[0].length
        })
      }
    }

    // 모든 수식을 시작 위치 순으로 정렬
    const allMatches = [...latexBlockMatches, ...blockMatches, ...inlineMatches].sort((a, b) => a.start - b.start)

    // 텍스트 조각과 수식 조각을 순서대로 배치
    allMatches.forEach((mathMatch, index) => {
      // 이전 조각과 현재 수식 사이의 텍스트
      if (lastIndex < mathMatch.start) {
        const textPart = text.slice(lastIndex, mathMatch.start)
        if (textPart.trim()) {
          parts.push({
            type: 'text',
            content: textPart,
            key: `text-${index}`
          })
        }
      }

      // 수식 조각
      parts.push({
        type: mathMatch.type,
        content: mathMatch.content,
        key: `math-${index}`
      })

      lastIndex = mathMatch.end
    })

    // 마지막 텍스트 조각
    if (lastIndex < text.length) {
      const textPart = text.slice(lastIndex)
      if (textPart.trim()) {
        parts.push({
          type: 'text',
          content: textPart,
          key: `text-final`
        })
      }
    }

    // 수식이 없으면 일반 텍스트로 반환
    if (parts.length === 0) {
      return text
    }

    // JSX 요소로 변환
    return parts.map(part => {
      if (part.type === 'block') {
        return (
          <div key={part.key} className="my-2">
            <BlockMath math={part.content} />
          </div>
        )
      } else if (part.type === 'inline') {
        return <InlineMath key={part.key} math={part.content} />
      } else {
        return <span key={part.key}>{part.content}</span>
      }
    })
  } catch (error) {
    console.warn('Math rendering error:', error)
    return text
  }
}

// 인라인 마크다운 처리 함수 (볼드, 이탤릭, 코드 등) - 수학 수식 포함
const formatInlineMarkdown = (text: string) => {
  // console.log('📝 formatInlineMarkdown received:', JSON.stringify(text)) // 디버깅

  // 수학 수식이 있는지 확인하고 먼저 처리
  const mathResult = renderMathContent(text)

  // 수학 수식이 렌더링된 경우 (JSX 배열이 반환된 경우)
  if (Array.isArray(mathResult)) {
    return mathResult.map((element, index) => {
      // 이미 JSX 요소인 경우 그대로 반환
      if (typeof element !== 'string') {
        return element
      }

      // 문자열인 경우 마크다운 처리 후 텍스트 정리
      return processMarkdownText(element, `math-text-${index}`)
    })
  }

  // 수학 수식이 없는 경우 일반 마크다운 처리
  return processMarkdownText(text, 'text')
}

// 마크다운 텍스트 처리 헬퍼 함수
const processMarkdownText = (text: string, keyPrefix: string) => {
  console.log('🔍 Processing markdown text:', JSON.stringify(text)) // 디버깅용 로그

  // 빈 텍스트나 공백만 있는 텍스트는 조기 반환
  if (!text || !text.trim()) {
    console.log('⚠️ Empty or whitespace-only text, skipping')
    return <span key={`${keyPrefix}-empty`}></span>
  }

  // 더 정확한 마크다운 정규식 - 개행 문자도 포함
  const markdownRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

  let result = []
  let lastIndex = 0
  let match

  while ((match = markdownRegex.exec(text)) !== null) {
    // 매치 이전의 일반 텍스트
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      if (beforeText) {
        result.push(
          <span key={`${keyPrefix}-text-${lastIndex}`}>
            {cleanText(beforeText)}
          </span>
        )
      }
    }

    const matchedText = match[0]
    // console.log('📝 Found markdown:', matchedText) // 디버깅용 로그

    // 볼드 + 이탤릭 (***텍스트***)
    if (matchedText.startsWith('***') && matchedText.endsWith('***')) {
      result.push(
        <strong key={`${keyPrefix}-bold-italic-${match.index}`} className="font-bold italic text-yellow-200">
          {matchedText.slice(3, -3)}
        </strong>
      )
    }
    // 볼드 (**텍스트**)
    else if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      result.push(
        <strong key={`${keyPrefix}-bold-${match.index}`} className="font-bold text-yellow-200">
          {matchedText.slice(2, -2)}
        </strong>
      )
    }
    // 이탤릭 (*텍스트*)
    else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      result.push(
        <em key={`${keyPrefix}-italic-${match.index}`} className="italic text-gray-200">
          {matchedText.slice(1, -1)}
        </em>
      )
    }
    // 인라인 코드 (`코드`)
    else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
      result.push(
        <code key={`${keyPrefix}-code-${match.index}`} className="bg-slate-600 text-slate-200 px-1 py-0.5 rounded text-xs font-mono">
          {matchedText.slice(1, -1)}
        </code>
      )
    }

    lastIndex = match.index + matchedText.length
  }

  // 마지막 남은 텍스트
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      result.push(
        <span key={`${keyPrefix}-text-${lastIndex}`}>
          {cleanText(remainingText)}
        </span>
      )
    }
  }

  // 매치된 것이 없으면 원본 텍스트 반환
  if (result.length === 0) {
    return <span key={`${keyPrefix}-original`}>{cleanText(text)}</span>
  }

  console.log('✅ Processed result length:', result.length) // 디버깅용 로그
  return result
}

// File Info Component
const FileInfoCard = ({ fileInfo }: { fileInfo: { filename: string; fileSize: number; fileType: 'csv' | 'excel' } }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: 'csv' | 'excel' | 'pdf', filename?: string) => {
    const extension = filename?.toLowerCase().split('.').pop()
    
    if (extension === 'csv' || fileType === 'csv') {
      return <FaFileCsv className="text-green-500" size={24} />
    } else if (extension === 'xlsx' || extension === 'xls' || fileType === 'excel') {
      return <FaFileExcel className="text-green-600" size={24} />
    } else if (extension === 'pdf') {
      return <FaFilePdf className="text-red-500" size={24} />
    } else {
      return <FaFileCsv className="text-green-500" size={24} /> // Default to CSV
    }
  }

  const getFileTypeLabel = (fileType: 'csv' | 'excel') => {
    return fileType === 'csv' ? 'spreadsheet' : 'spreadsheet'
  }

  return (
    <div className="mt-3 bg-gray-800 rounded-lg p-3 flex items-center gap-3 inline-flex max-w-fit">
      <div className="flex items-center justify-center">
        {getFileIcon(fileInfo.fileType, fileInfo.filename)}
      </div>
      <div className="flex-shrink-0">
        <div className="text-white font-medium text-sm whitespace-nowrap">
          {fileInfo.filename}
        </div>
        <div className="text-gray-400 text-xs whitespace-nowrap">
          {getFileTypeLabel(fileInfo.fileType)} - {formatFileSize(fileInfo.fileSize)}
        </div>
      </div>
    </div>
  )
}

// 타이핑 효과가 적용된 메시지 컴포넌트
const TypewriterMessage = ({
  content,
  insights,
  message,
  isLastMessage,
  messageIndex,
  totalMessages
}: {
  content: string;
  insights?: string[];
  message: Message;
  isLastMessage: boolean;
  messageIndex: number;
  totalMessages: number;
}) => {
  // 모든 텍스트 내용을 하나로 합치기
  const fullContent = [content, ...(insights || [])].join('\n\n')

  // 마지막 메시지이고, 메시지가 2개 이상이며, 메시지가 최근 5초 내에 생성된 경우에만 타이핑 효과 적용
  const isRecentMessage = message.timestamp && (Date.now() - new Date(message.timestamp).getTime() < 5000)
  const shouldType = isLastMessage && totalMessages > 1 && isRecentMessage
  const { displayedText, isTyping } = useTypewriter(fullContent, {
    enabled: shouldType,
    speed: 25, // ChatGPT와 비슷한 속도
    delay: 300
  })

  const textToShow = shouldType ? displayedText : fullContent

  // console.log('🎭 TypewriterMessage textToShow:', textToShow) // 디버깅
  // console.log('🎭 TypewriterMessage shouldType:', shouldType) // 디버깅
  // console.log('🎭 TypewriterMessage isTyping:', isTyping) // 디버깅

  // 내용이 비어있으면 아무것도 렌더링하지 않음
  if (!textToShow || textToShow.trim() === '') {
    return null
  }

  // 로딩 메시지인지 확인 (정확한 로딩 문구만)
  const isLoadingMessage = textToShow === '처리 중...' ||
                          textToShow === '분석을 시작합니다...' ||
                          textToShow === '계산 중입니다...' ||
                          textToShow === '코드를 생성 중입니다...' ||
                          textToShow === '실행 중입니다...' ||
                          textToShow === '질문을 분석하고 있습니다...' ||
                          textToShow === '분석을 시작합니다...'

  return (
    <div className={`text-base leading-relaxed mb-4 ${isLoadingMessage ? 'loading-message' : ''}`}>
      {formatMessage(textToShow)}
      {isTyping && <span className="animate-pulse">|</span>}
    </div>
  )
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean  // 스트리밍 상태 추적
  chartData?: any
  insights?: string[]
  followUpQuestions?: string[]
  fileInfo?: {
    filename: string
    fileSize: number
    fileType: 'csv' | 'excel'
    file_id: string
  }
  tableData?: {
    data: any[]
    columns: string[]
    filename: string
  }
  codeExecution?: {
    codeChunks: string[]
    isExecuting: boolean
    result?: string
    output?: string
  }
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
  onFollowUpClick: (question: string) => void
  onChartExpand?: (chartData: any, title: string) => void
  uploadedFile?: any
  user?: User | null
  onMessageUpdate?: (messageId: string, updates: Partial<Message>) => void
}

// Message Actions Component  
const MessageActions = ({ messageId, content, insights, isUserMessage = false, isStreaming = false }: { messageId: string; content: string; insights?: string[]; isUserMessage?: boolean; isStreaming?: boolean }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [likedId, setLikedId] = useState<string | null>(null)
  const [dislikedId, setDislikedId] = useState<string | null>(null)

  const handleCopy = async () => {
    try {
      // Combine content and insights for copying
      let fullContent = content
      if (insights && insights.length > 0) {
        fullContent += '\n\n' + insights.join('\n\n')
      }
      await navigator.clipboard.writeText(fullContent)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleLike = () => {
    setLikedId(likedId === messageId ? null : messageId)
    if (dislikedId === messageId) setDislikedId(null)
  }

  const handleDislike = () => {
    setDislikedId(dislikedId === messageId ? null : messageId)
    if (likedId === messageId) setLikedId(null)
  }

  const handleRefresh = () => {
    // TODO: Implement refresh/regenerate functionality
    console.log('Refresh message:', messageId)
  }

  // 스트리밍 중일 때는 액션 버튼들 숨기기
  if (isStreaming) {
    return null
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-70 hover:opacity-100 transition-opacity">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg hover:bg-gray-700 transition-colors group"
        title="복사"
      >
        {copiedId === messageId ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Only show like, dislike, refresh for assistant messages */}
      {!isUserMessage && (
        <>
          {/* Like Button */}
          <button
            onClick={handleLike}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors group"
            title="좋아요"
          >
            <svg 
              className={`w-4 h-4 transition-colors ${
                likedId === messageId 
                  ? 'text-green-400 fill-current' 
                  : 'text-gray-400 group-hover:text-white'
              }`} 
              fill={likedId === messageId ? "currentColor" : "none"} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          </button>

          {/* Dislike Button */}
          <button
            onClick={handleDislike}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors group"
            title="싫어요"
          >
            <svg 
              className={`w-4 h-4 transition-colors ${
                dislikedId === messageId 
                  ? 'text-red-400 fill-current' 
                  : 'text-gray-400 group-hover:text-white'
              }`} 
              fill={dislikedId === messageId ? "currentColor" : "none"} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.7M10 14v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors group"
            title="다시 생성"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

export default function ChatMessages({ messages, isLoading, messagesEndRef, onFollowUpClick, onChartExpand, uploadedFile, user, onMessageUpdate }: ChatMessagesProps) {
  // 사용자 이니셜 추출 함수
  const getUserInitial = (user: User | null): string => {
    if (!user) return '?'
    
    // displayName이 있으면 첫 글자 사용
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase()
    }
    
    // email에서 @ 앞 첫 글자 사용
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    
    return '?'
  }

  // 사용자 이름 추출 함수
  const getUserDisplayName = (user: User | null): string => {
    if (!user) return '사용자'
    
    // displayName이 있으면 사용
    if (user.displayName) {
      return user.displayName
    }
    
    // email에서 @ 앞 부분 사용
    if (user.email) {
      return user.email.split('@')[0]
    }
    
    return '사용자'
  }
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 h-full text-white">
      <div className="max-w-4xl mx-auto">
      {messages.map((message, index) => (
        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} ${index > 0 ? 'mt-8' : ''}`}>
          <div className={`max-w-[90%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
            {/* Avatar */}
            <div className={`flex items-center mb-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                message.type === 'user' 
                  ? 'text-white' 
                  : 'bg-black'
              }`} style={message.type === 'user' ? { backgroundColor: '#003049' } : {}}>
                {message.type === 'user' ? getUserInitial(user) : (
                  <Image 
                    src="/image/logo.png" 
                    alt="Afterwon Logo" 
                    width={32} 
                    height={32}
                    className="object-contain rounded-full"
                  />
                )}
              </div>
              <span className={`ml-2 text-xs text-slate-400 ${message.type === 'user' ? 'mr-2 order-1' : ''}`}>
                {message.type === 'user' ? getUserDisplayName(user) : 'Afterwon'}
              </span>
            </div>
            
            {/* Message Content */}
            {message.type === 'user' ? (
              <div>
                <div className="rounded-2xl p-4 shadow-sm text-white" style={{ backgroundColor: '#003049' }}>
                  <div className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</div>
                </div>
                {/* Copy Action for User Messages */}
                <div className="flex justify-end mt-2 mb-4">
                  <MessageActions messageId={message.id} content={message.content} isUserMessage={true} />
                </div>
              </div>
            ) : (
              <div className="text-white">
                {/* 1. Code Execution - Show first */}
                {message.codeExecution && (
                  <CodeExecution
                    codeChunks={message.codeExecution.codeChunks}
                    isExecuting={message.codeExecution.isExecuting}
                    onComplete={() => {
                      // 코드 실행 완료 후 답변을 업데이트
                      if (message.codeExecution?.output && onMessageUpdate) {
                        // 계산 결과를 더 자연스러운 답변으로 변환
                        const result = message.codeExecution.result || message.codeExecution.output
                        const answerText = `계산이 완료되었습니다.\n\n${message.codeExecution.output}`

                        onMessageUpdate(message.id, {
                          content: answerText,
                          codeExecution: {
                            ...message.codeExecution,
                            isExecuting: false
                          }
                        })
                      }
                    }}
                  />
                )}

                {/* 2. Chart - Show second */}
                {message.chartData && (
                  <div className="mt-4">
                    <PlotlyChart
                      data={message.chartData}
                      onChartExpand={onChartExpand}
                    />
                  </div>
                )}

                {/* 3. Answer Text - Show third */}
                <div className={message.chartData ? "mt-4" : ""}>
                  <TypewriterMessage
                    content={message.content}
                    insights={message.insights}
                    message={message}
                    isLastMessage={index === messages.length - 1}
                    messageIndex={index}
                    totalMessages={messages.length}
                  />
                </div>

                {/* File Info Card - Show when fileInfo exists */}
                {message.fileInfo && (
                  <FileInfoCard fileInfo={message.fileInfo} />
                )}

                {/* Table Data */}
                {message.tableData && (
                  <div className="mt-4">
                    <DataTable
                      data={message.tableData.data}
                      columns={message.tableData.columns}
                      filename={message.tableData.filename}
                    />
                  </div>
                )}

                {/* Message Actions for Assistant Messages */}
                <div className="mb-4">
                  <MessageActions
                    messageId={message.id}
                    content={message.content}
                    insights={message.insights}
                    isStreaming={message.isStreaming}
                  />
                </div>
              </div>
            )}
            
            {/* Follow-up Questions - Only show for assistant messages and only for the last message */}
            {message.type === 'assistant' &&
             message.followUpQuestions &&
             message.followUpQuestions.length > 0 &&
             message.id === messages[messages.length - 1]?.id &&
             !isLoading && (
              <div className="mt-3">
                <FollowUpQuestions
                  questions={message.followUpQuestions}
                  onQuestionClick={onFollowUpClick}
                  isLoading={false}
                />
              </div>
            )}
            
            
          </div>
        </div>
      ))}
      
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-sm">
                <Image
                  src="/image/logo.png"
                  alt="Afterwon Logo"
                  width={32}
                  height={32}
                  className="object-contain rounded-full"
                />
              </div>
              <span className="ml-2 text-xs text-slate-400">Afterwon</span>
            </div>

            <div className="text-white">
              <span className="text-sm loading-message">
                처리 중...
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} className="h-16" />
      </div>
    </div>
  )
}