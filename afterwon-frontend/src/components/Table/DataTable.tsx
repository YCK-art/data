'use client'

import { useState } from 'react'

// Tooltip component for column headers
const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}

interface DataTableProps {
  data: any[]
  columns: string[]
  filename: string
  chartData?: any
}

export default function DataTable({ data, columns, filename }: DataTableProps) {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})
  const [showAllRows, setShowAllRows] = useState(false)

  // 칼럼은 항상 모두 표시
  const visibleColumns = columns

  // 표시할 행 결정 (최대 8개)
  const visibleRows = showAllRows ? data : data.slice(0, 8)
  const hasMoreRows = data.length > 8
  
  // Handle double-click to auto-resize column
  const handleColumnResize = (columnName: string) => {
    // Calculate optimal width based on content
    const maxContentLength = Math.max(
      columnName.length,
      ...data.slice(0, 100).map(row => String(row[columnName] || '').length) // Sample first 100 rows for performance
    )
    const optimalWidth = Math.min(Math.max(maxContentLength * 8 + 32, 180), 400) // 8px per char + padding, min 180px, max 400px

    setColumnWidths(prev => ({
      ...prev,
      [columnName]: optimalWidth
    }))
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No data available
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header with row toggle */}
      {hasMoreRows && (
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-800">
              {showAllRows
                ? `${data.length} rows, ${columns.length} columns`
                : `${visibleRows.length} of ${data.length} rows, ${columns.length} columns`
              }
            </span>
          </div>
          <button
            onClick={() => setShowAllRows(!showAllRows)}
            className="px-4 py-2 text-sm font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          >
            {showAllRows ? 'Show preview' : 'Show all rows'}
          </button>
        </div>
      )}

      {/* Table Content */}
      <div className={`max-h-[500px] ${showAllRows ? 'overflow-auto' : 'overflow-y-auto overflow-x-auto'}`}>
          <table className="w-full">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-center font-semibold text-gray-700 bg-gray-50 sticky top-0 left-0 z-40 border-r border-gray-200 text-xs uppercase tracking-wider w-16">
                  #
                </th>
                {visibleColumns.map((column, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-100 text-xs uppercase tracking-wider relative group sticky top-0 bg-gray-50"
                    style={{
                      width: columnWidths[column] || '220px',
                      minWidth: '180px',
                      maxWidth: '400px'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <Tooltip content={column.length > 15 ? column : ''}>
                        <span className="truncate cursor-help font-medium">
                          {column}
                        </span>
                      </Tooltip>

                      {/* Modern resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                        onDoubleClick={() => handleColumnResize(column)}
                        title="Double-click to auto-resize"
                      >
                        <div className="w-0.5 h-4 bg-gray-300 rounded-full"></div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {visibleRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50 sticky left-0 z-10 border-r border-gray-100 text-sm w-16 text-center">
                    {rowIndex + 1}
                  </td>
                  {visibleColumns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-4 py-3 text-gray-800 border-r border-gray-50 text-sm align-middle text-center"
                      style={{
                        width: columnWidths[column] || '220px',
                        minWidth: '180px',
                        maxWidth: '400px',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word'
                      }}
                    >
                      <div
                        className="max-w-full flex items-center justify-center"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.4'
                        }}
                      >
                        {row[column] !== null && row[column] !== undefined
                          ? <span className="text-gray-900">{String(row[column])}</span>
                          : <span className="text-gray-400 italic font-light">—</span>
                        }
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* Modern Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="font-medium">{filename}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span>{data.length.toLocaleString()} rows{hasMoreRows && !showAllRows ? ` (${visibleRows.length} visible)` : ''}</span>
            <span className="text-gray-400">•</span>
            <span>{columns.length} columns</span>
          </div>
          <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
            Ready
          </div>
        </div>
      </div>
    </div>
  )
}