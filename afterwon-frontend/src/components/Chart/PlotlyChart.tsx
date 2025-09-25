'use client'

import { useEffect, useRef, useState } from 'react'
import { FiEdit2, FiDownload, FiMaximize2 } from 'react-icons/fi'

declare global {
  interface Window {
    Plotly: any;
  }
}

interface PlotlyChartProps {
  data: any
  height?: number
  onTitleChange?: (newTitle: string) => void
  onChartExpand?: (chartData: any, title: string) => void
  showTitleEditor?: boolean
  showControls?: boolean
}

export default function PlotlyChart({ data, height = 520, onTitleChange, onChartExpand, showTitleEditor = true, showControls = true }: PlotlyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')

  // HTML 태그를 제거하고 깔끔한 텍스트만 추출하는 함수
  const stripHtmlTags = (html: string): string => {
    if (!html) return ''

    // HTML 태그를 제거하고 실제 텍스트만 추출
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const cleanText = tempDiv.textContent || tempDiv.innerText || ''

    // 추가적으로 연속된 공백을 하나로 정리
    return cleanText.replace(/\s+/g, ' ').trim()
  }

  // 차트 제목 생성 로직 개선
  const generateBetterTitle = (plotData: any[], layoutData: any) => {
    if (layoutData?.title?.text) {
      // HTML 태그가 포함된 제목에서 깔끔한 텍스트만 추출
      return stripHtmlTags(layoutData.title.text)
    }

    if (!plotData || plotData.length === 0) return '데이터 시각화'

    const trace = plotData[0]
    const chartType = trace.type || 'scatter'
    
    // 차트 타입별 제목 생성
    switch (chartType) {
      case 'bar':
        if (trace.x && trace.y) {
          const xLabel = trace.name || (Array.isArray(trace.x) ? '카테고리' : 'X축')
          const yLabel = Array.isArray(trace.y) ? '수량' : 'Y축'
          return `${xLabel}별 ${yLabel} 분석`
        }
        return '막대 차트 분석'
      
      case 'pie':
        if (trace.labels) {
          return `${trace.name || '항목'}별 구성 비율`
        }
        return '구성 비율 분석'
      
      case 'line':
      case 'scatter':
        if (trace.x && trace.y) {
          const xLabel = trace.name || 'X값'
          const yLabel = Array.isArray(trace.y) ? 'Y값' : 'Y축'
          return `${xLabel}과 ${yLabel}의 상관관계`
        }
        return '추세 분석'
      
      case 'histogram':
        return `${trace.name || '데이터'} 분포 분석`
      
      case 'box':
        return `${trace.name || '데이터'} 박스 플롯 분석`

      case 'choropleth':
        if (trace.locations && trace.z) {
          return `${trace.name || '지역'}별 ${trace.colorbar?.title?.text || '수치'} 분포`
        }
        return '지역별 분포 지도'

      case 'scattergeo':
        return `${trace.name || '지역'} 지도 분석`

      default:
        if (trace.name) {
          return `${trace.name} 데이터 분석`
        }
        return '데이터 시각화 분석'
    }
  }

  // 제목 수정 기능
  const handleTitleEdit = () => {
    // HTML 태그가 포함된 제목이라면 깔끔하게 정리해서 편집 필드에 표시
    const cleanTitle = stripHtmlTags(currentTitle)
    setEditTitle(cleanTitle)
    setIsEditing(true)
  }

  const handleTitleSave = () => {
    const trimmedTitle = editTitle.trim()
    if (trimmedTitle && trimmedTitle !== stripHtmlTags(currentTitle)) {
      setCurrentTitle(trimmedTitle)
      if (onTitleChange) {
        onTitleChange(trimmedTitle)
      }
      // Plotly 차트 제목 업데이트
      if (window.Plotly && chartRef.current && data) {
        const newLayout = {
          ...data.layout,
          title: {
            ...data.layout?.title,
            text: trimmedTitle,
            font: { size: 16, color: '#1f2937' },
            x: 0.02,
            xanchor: 'left'
          }
        }
        window.Plotly.relayout(chartRef.current, newLayout)
      }
    }
    setIsEditing(false)
  }

  const handleTitleCancel = () => {
    const cleanTitle = stripHtmlTags(currentTitle)
    setEditTitle(cleanTitle)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleTitleCancel()
    }
  }

  const handleBlur = () => {
    // 입력 필드에서 포커스가 나갈 때 저장
    handleTitleSave()
  }

  const handleZoom = () => {
    if (onChartExpand && data) {
      // 확대 모드로 전환
      const title = stripHtmlTags(currentTitle) || '차트'
      onChartExpand(data, title)
    } else if (window.Plotly && chartRef.current) {
      // 일반 확대/축소 초기화
      window.Plotly.relayout(chartRef.current, {
        'xaxis.autorange': true,
        'yaxis.autorange': true
      })
    }
  }

  const handleDownload = () => {
    if (window.Plotly && chartRef.current) {
      const filename = currentTitle ? currentTitle.replace(/[^a-z0-9]/gi, '_') : 'chart'
      window.Plotly.downloadImage(chartRef.current, {
        format: 'png',
        width: 1200,
        height: 800,
        filename: filename
      })
    }
  }

  useEffect(() => {
    const loadPlotly = async () => {
      if (typeof window !== 'undefined' && !window.Plotly) {
        try {
          const Plotly = await import('plotly.js-dist-min')
          window.Plotly = Plotly
        } catch (error) {
          console.error('Failed to load Plotly:', error)
          return
        }
      }

      if (window.Plotly && chartRef.current && data) {
        try {
          // Clear any existing chart
          window.Plotly.purge(chartRef.current)
          
          // Improve hover behavior for bar charts
          const plotData = data.data || []
          
          // 개선된 제목 생성
          const generatedTitle = generateBetterTitle(plotData, data.layout)
          if (!currentTitle) {
            setCurrentTitle(generatedTitle)
          }
          
          const layoutConfig = {
            ...data.layout,
            title: {
              text: currentTitle || generatedTitle,
              font: { size: 16, color: '#1f2937' },
              x: 0.02,
              xanchor: 'left'
            },
            hovermode: 'x unified', // Show tooltip for all traces at the same x position
            hoverlabel: {
              bgcolor: 'rgba(0,0,0,0.8)',
              bordercolor: 'rgba(0,0,0,0.8)',
              font: { color: 'white', size: 12 }
            },
            // Disable zoom and pan in axes
            xaxis: {
              ...data.layout?.xaxis,
              fixedrange: true,  // Prevent zooming on x-axis
            },
            yaxis: {
              ...data.layout?.yaxis,
              fixedrange: true,  // Prevent zooming on y-axis
            },
            // Disable dragmode
            dragmode: false,
          }
          
          // Enhance hover behavior for bar charts specifically
          const enhancedData = plotData.map(trace => {
            if (trace.type === 'bar') {
              return {
                ...trace,
                hoverlabel: {
                  bgcolor: 'rgba(0,0,0,0.8)',
                  bordercolor: 'rgba(0,0,0,0.8)',
                  font: { color: 'white' }
                }
              }
            }
            return trace
          })

          // Create new plot
          await window.Plotly.newPlot(
            chartRef.current,
            enhancedData,
            layoutConfig,
            {
              responsive: true,
              displayModeBar: false,  // Hide default toolbar (we have our custom buttons)
              scrollZoom: false,      // Disable zoom with mouse wheel
              doubleClick: false,     // Disable double click actions
              showTips: false,        // Disable hover tooltips on axes
              staticPlot: false,      // Keep interactivity but limit it
              dragMode: false,        // Disable drag to zoom/pan
              // Disable all zoom/pan interactions
              modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
              // Keep only hover
              editable: false
            }
          )
        } catch (error) {
          console.error('Error rendering chart:', error)
        }
      }
    }

    loadPlotly()
  }, [data])

  if (!data) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>차트를 생성할 수 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
      {/* Chart Title Editor - 조건부 렌더링 */}
      {showTitleEditor && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 group">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleBlur}
                className="flex-1 text-lg font-semibold text-gray-800 bg-transparent border-none outline-none"
                autoFocus
                placeholder="차트 제목을 입력하세요"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-800 flex-1">
                {stripHtmlTags(currentTitle) || '차트 제목'}
              </h3>
            )}
            <button
              onClick={handleTitleEdit}
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-md transition-all"
              title="제목 수정 (Enter: 저장, Esc: 취소)"
            >
              <FiEdit2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={chartRef}
        style={{ height, width: '100%' }}
        className="plotly-chart-container"
      />

      {/* Floating Chart Controls - 조건부 렌더링 */}
      {data && showControls && (
        <div className="absolute top-16 right-4 flex gap-2 z-20">
          <button
            onClick={handleZoom}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
            title="차트 확대/축소 초기화"
          >
            <FiMaximize2 className="w-4 h-4 text-gray-600 hover:text-gray-800" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
            title="차트 다운로드 (PNG)"
          >
            <FiDownload className="w-4 h-4 text-gray-600 hover:text-gray-800" />
          </button>
        </div>
      )}
    </div>
  )
}