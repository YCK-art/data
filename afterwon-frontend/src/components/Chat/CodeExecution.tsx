'use client'

import { useState, useEffect } from 'react'
import { useTypewriter } from '@/hooks/useTypewriter'

interface CodeExecutionProps {
  codeChunks: string[]
  isExecuting: boolean
  onComplete?: () => void
}

export default function CodeExecution({ codeChunks, isExecuting, onComplete }: CodeExecutionProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // 코드 청크가 업데이트될 때마다 표시되는 라인 업데이트
  useEffect(() => {
    if (codeChunks.length > displayedLines.length) {
      const newLines = codeChunks.slice(displayedLines.length)
      setDisplayedLines(prev => [...prev, ...newLines])
    }
  }, [codeChunks, displayedLines.length])

  // 실행이 완료되면 onComplete 호출
  useEffect(() => {
    if (!isExecuting && codeChunks.length > 0 && !isCompleted) {
      setIsCompleted(true)
      if (onComplete) {
        onComplete()
      }
    }
  }, [isExecuting, codeChunks.length, isCompleted, onComplete])

  const getCurrentDisplayCode = () => {
    return displayedLines.join('\n')
  }

  const handleCopyCode = async () => {
    try {
      const codeText = displayedLines.join('\n')
      await navigator.clipboard.writeText(codeText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // 2초 후 원래 아이콘으로
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const highlightPythonTokens = (code: string) => {
    const tokens = []
    let i = 0

    while (i < code.length) {
      const char = code[i]

      // Multi-line strings (triple quotes)
      if ((char === '"' && code.slice(i, i + 3) === '"""') ||
          (char === "'" && code.slice(i, i + 3) === "'''")) {
        const quote = code.slice(i, i + 3)
        let str = quote
        i += 3

        // Find the closing triple quote
        while (i < code.length) {
          if (code.slice(i, i + 3) === quote) {
            str += quote
            i += 3
            break
          }
          str += code[i]
          i++
        }
        tokens.push({ type: 'string', value: str })
        continue
      }

      // Single/double quoted strings
      if (char === '"' || char === "'") {
        const quote = char
        let str = quote
        i++

        while (i < code.length) {
          if (code[i] === quote) {
            str += code[i++]
            break
          }
          if (code[i] === '\\' && i + 1 < code.length) {
            str += code[i] + code[i + 1]
            i += 2
          } else if (code[i] === '\n') {
            // String not properly closed, treat as incomplete
            break
          } else {
            str += code[i]
            i++
          }
        }
        tokens.push({ type: 'string', value: str })
        continue
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = ''
        while (i < code.length && /[\d.]/.test(code[i])) {
          num += code[i++]
        }
        tokens.push({ type: 'number', value: num })
        continue
      }

      // Keywords and identifiers
      if (/[a-zA-Z_]/.test(char)) {
        let word = ''
        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
          word += code[i++]
        }

        const keywords = [
          'print', 'sum', 'eval', 'len', 'range', 'for', 'if', 'else', 'def', 'class',
          'import', 'from', 'as', 'in', 'and', 'or', 'not', 'True', 'False', 'None',
          'return', 'while', 'break', 'continue', 'try', 'except', 'finally', 'with',
          'yield', 'lambda', 'global', 'nonlocal', 'async', 'await', 'pass', 'raise',
          'assert', 'del', 'elif', 'is'
        ]
        const builtins = [
          'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'bytes',
          'pd', 'np', 'px', 'go', 'plt', 'json', 'plotly', 'df'
        ]

        if (keywords.includes(word)) {
          tokens.push({ type: 'keyword', value: word })
        } else if (builtins.includes(word)) {
          tokens.push({ type: 'builtin', value: word })
        } else {
          // Check if next non-space char is =
          let j = i
          while (j < code.length && /\s/.test(code[j])) j++
          if (j < code.length && code[j] === '=') {
            tokens.push({ type: 'variable', value: word })
          } else {
            tokens.push({ type: 'identifier', value: word })
          }
        }
        continue
      }

      // Comments
      if (char === '#') {
        let comment = ''
        while (i < code.length && code[i] !== '\n') {
          comment += code[i++]
        }
        tokens.push({ type: 'comment', value: comment })
        continue
      }

      // Other characters
      tokens.push({ type: 'other', value: char })
      i++
    }

    return tokens
  }

  const renderHighlightedLine = (line: string, isTyping: boolean = false) => {
    if (!line.trim()) return <span>&nbsp;</span>

    const tokens = highlightPythonTokens(line)
    return (
      <>
        {tokens.map((token, index) => {
          const className = {
            keyword: 'text-purple-400 font-medium',
            builtin: 'text-blue-400',
            string: 'text-green-400',
            number: 'text-orange-400',
            variable: 'text-yellow-300',
            identifier: 'text-slate-300',
            comment: 'text-gray-500 italic',
            other: 'text-slate-300'
          }[token.type] || 'text-slate-300'

          return (
            <span key={index} className={className}>
              {token.value}
            </span>
          )
        })}
      </>
    )
  }

  if (!isExecuting && codeChunks.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 mt-4 shadow-xl relative">
      {/* Header with Python logo and action buttons */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 rounded-t-xl border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-yellow-400 rounded-md flex items-center justify-center">
              <span className="text-xs font-bold text-white">Py</span>
            </div>
            <span className="text-white font-semibold text-sm">Python</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCode}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
            title="코드 복사"
          >
            {isCopied ? (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Code Display with size limits and scroll */}
      <div className="p-6 bg-gray-900 max-h-96 overflow-auto">
        <div className="font-mono text-sm leading-relaxed max-w-full overflow-x-auto">
          <div className="min-w-max">
            {displayedLines.map((line, lineIndex) => {
              const lineNumber = lineIndex + 1
              const isLastLine = lineIndex === displayedLines.length - 1
              const showCursor = isExecuting && !isCompleted && isLastLine

              return (
                <div key={lineIndex} className="flex hover:bg-gray-800/30 rounded">
                  <span className="text-gray-500 mr-6 select-none w-8 text-right text-xs font-medium py-0.5 flex-shrink-0">
                    {line.trim() ? lineNumber : ''}
                  </span>
                  <div className="flex-1 py-0.5 min-w-0 break-words">
                    <span className="whitespace-pre-wrap">{renderHighlightedLine(line)}</span>
                    {showCursor && (
                      <span className="bg-blue-400 text-blue-400 ml-0.5 animate-pulse">|</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}