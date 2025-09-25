'use client'

import { useState } from 'react'
import { User } from 'firebase/auth'
import Image from 'next/image'

interface AppConnectorProps {
  user: User | null
}

interface ConnectorItem {
  id: string
  name: string
  description: string
  icon: string
  type: 'Integration' | 'MCP' | 'Database' | 'New'
  isNew?: boolean
}

const connectors: ConnectorItem[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Analyze your Google Drive files and folders',
    icon: '/image/googledrive.png',
    type: 'Integration'
  },
  {
    id: 'microsoft-onedrive',
    name: 'Microsoft OneDrive',
    description: 'Analyze your Personal OneDrive files and folders',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg/512px-Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg.png',
    type: 'Integration'
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    description: 'Analyze your SharePoint or OneDrive for Business files',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Microsoft_Office_SharePoint_%282019%E2%80%93present%29.svg/512px-Microsoft_Office_SharePoint_%282019%E2%80%93present%29.svg.png',
    type: 'Integration'
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Analyze your data and manage your campaigns in Google Ads',
    icon: '/image/googleads.svg',
    type: 'Integration'
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    description: 'Analyze your data and manage your campaigns in Meta Ads',
    icon: '/image/meta.svg',
    type: 'Integration'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Connect and analyze your Google Analytics data and insights',
    icon: '/image/googleanalytics.png',
    type: 'Integration'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Summarize, update, and organize Notion pages programmatically within Afterwon',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Notion_app_logo.png/512px-Notion_app_logo.png',
    type: 'MCP'
  }
]

export default function AppConnector({ user }: AppConnectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConnectors = connectors.filter(connector =>
    connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connector.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderConnectorIcon = (connector: ConnectorItem) => {
    if (connector.icon.startsWith('/image/')) {
      return (
        <Image
          src={connector.icon}
          alt={connector.name}
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
        />
      )
    } else if (connector.icon.startsWith('http')) {
      return (
        <img 
          src={connector.icon} 
          alt={connector.name}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            // Fallback to emoji if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      )
    } else {
      return (
        <div className="w-8 h-8 flex items-center justify-center text-2xl">
          {connector.icon}
        </div>
      )
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Integration':
        return 'bg-blue-600 text-blue-100'
      case 'MCP':
        return 'bg-purple-600 text-purple-100'
      case 'Database':
        return 'bg-green-600 text-green-100'
      default:
        return 'bg-gray-600 text-gray-100'
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="p-6 pb-4 pt-12">
          <h1 className="text-2xl font-bold mb-2">Data Connectors & MCPs</h1>
          <p className="text-gray-400 text-sm">
            You can connect Afterwon to your data stores and business tools here
          </p>
        </div>

        {/* Add connectors section */}
        <div className="px-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Add connectors</h2>
          
          {/* Connector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredConnectors.map((connector) => (
              <div
                key={connector.id}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-6 hover:bg-gray-800 transition-all duration-200 cursor-pointer group hover:border-gray-600 h-24 flex items-center"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 p-3 bg-gray-800 rounded-xl">
                      {renderConnectorIcon(connector)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors mb-1">
                        {connector.name}
                      </h3>
                      {connector.description && (
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {connector.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Need another connection section */}
        <div className="px-6 pb-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Need another connection?</h3>
                <p className="text-sm text-gray-400">Let us know what data you'd like to use in Afterwon</p>
              </div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Request connector
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}