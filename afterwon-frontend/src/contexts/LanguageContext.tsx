'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'ko' | 'en' | 'ja'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 번역 데이터
const translations = {
  ko: {
    // 공통
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    'common.cancel': '취소',
    'common.confirm': '확인',
    'common.save': '저장',
    'common.edit': '편집',
    'common.delete': '삭제',
    'common.share': '공유',
    'common.copy': '복사',
    'common.search': '검색',
    'common.filter': '필터',
    'common.sort': '정렬',
    'common.upload': '업로드',
    'common.download': '다운로드',
    'common.back': '뒤로',
    'common.next': '다음',
    'common.previous': '이전',
    'common.close': '닫기',
    'common.open': '열기',
    'common.new': '새로 만들기',
    'common.today': '오늘',
    'common.yesterday': '어제',
    'common.settings': '설정',

    // 인증
    'auth.login': '로그인',
    'auth.logout': '로그아웃',
    'auth.signup': '회원가입',
    'auth.email': '이메일',
    'auth.password': '비밀번호',
    'auth.welcomeMessage': '안녕하세요! 데이터를 업로드하고 분석해보세요. CSV나 Excel 파일을 지원합니다. 파일 없이도 질문을 하실 수 있습니다.',

    // 네비게이션
    'nav.newChat': '새 채팅',
    'nav.chatSearch': '채팅 검색',
    'nav.projects': '프로젝트',
    'nav.fileSystem': '파일 시스템',
    'nav.appConnector': '앱 커넥터',
    'nav.dashboard': '대시보드',
    'nav.recentItems': '최근 항목',
    'nav.projectChat': '프로젝트 채팅',
    'nav.projectChatSubtitle': '프로젝트 내 채팅',

    // 채팅
    'chat.noHistory': '채팅 기록이 없습니다',
    'chat.typeMessage': '파일을 업로드하고 데이터에 대해 질문해보세요...',
    'chat.fileUploaded': '파일이 성공적으로 업로드되었습니다!',
    'chat.askQuestion': '이제 데이터에 대해 질문해보세요.',
    'chat.uploadError': '파일 업로드 중 오류가 발생했습니다',
    'chat.analysisError': '분석 중 오류가 발생했습니다',
    'chat.fileNotFound': '이 채팅에서 사용된 파일이 더 이상 서버에 존재하지 않습니다. 새로운 파일을 업로드해주세요.',
    'chat.expandChart': '차트 확대',
    'chat.closeChart': '차트 닫기',

    // 채팅 검색
    'chatSearch.title': '내 채팅 기록',
    'chatSearch.newChat': '새 채팅',
    'chatSearch.searchPlaceholder': '대화 내용 검색',
    'chatSearch.totalChats': 'Afterwon의 채팅 {count}개',
    'chatSearch.all': '전체',
    'chatSearch.noResults': '검색 결과가 없습니다.',
    'chatSearch.noHistory': '채팅 기록이 없습니다.',
    'chatSearch.newChatTitle': '새 채팅',
    'chatSearch.justNow': '방금 전',
    'chatSearch.minutesAgo': '{minutes}분 전',
    'chatSearch.hoursAgo': '{hours}시간 전',
    'chatSearch.yesterday': '어제',
    'chatSearch.daysAgo': '{days}일 전',

    // 프로젝트
    'projects.title': '프로젝트',
    'projects.newProject': '새 프로젝트',
    'projects.searchPlaceholder': '프로젝트 검색...',
    'projects.projectsCount': '{count}개 프로젝트',
    'projects.sortBy': '정렬 기준',
    'projects.recentlyUpdated': '최근 업데이트',
    'projects.dateCreated': '생성일',
    'projects.name': '이름',
    'projects.starred': '즐겨찾기',
    'projects.updated': '업데이트됨',
    'projects.daysAgo': '{days}일 전',
    'projects.monthsAgo': '{months}개월 전',
    'projects.yearsAgo': '{years}년 전',
    'projects.loadingProjects': '프로젝트 로딩 중...',
    'projects.loadingConversations': '대화 로딩 중...',
    'projects.startNewChat': '{projectName}에서 새 채팅 시작',
    'projects.backToProjects': '프로젝트로 돌아가기',
    'projects.share': '공유',

    // 파일 시스템
    'fileSystem.title': '파일 시스템',
    'fileSystem.uploading': '업로드 중...',
    'fileSystem.processing': '처리 중...',

    // 설정
    'settings.title': '설정',
    'settings.language': '언어',
    'settings.interfaceLanguage': '인터페이스 언어',
    'settings.korean': '한국어',
    'settings.english': 'English',
    'settings.japanese': '日本語',
    'settings.account': '계정',
    'settings.profile': '프로필',
    'settings.appearance': '외관',
    'settings.notifications': '알림',
    'settings.privacy': '개인정보',
    'settings.billing': '결제',
    'settings.features': '기능',
    'settings.help': '도움말',
    'settings.about': '정보',
    'settings.name': '성명',
    'settings.jobQuestion': '귀하의 업무를 가장 잘 설명하는 것은 무엇입니까?',
    'settings.jobPlaceholder': '직무를 선택해 주세요',
    'settings.saving': '저장 중...',
    'settings.preferencesQuestion': 'Afterwon이 응답할 때 고려해야 할 개인 선호 사항은 무엇인가요?',
    'settings.preferencesSubtitle': '설정한 기본 설정은 Afterwon의 가이드라인 내에서 모든 대화에 적용됩니다.',
    'settings.preferencesLink': '기본 설정에 대한 자세한 정보 알아보기',
    'settings.preferencesPlaceholder': '예시: 설명을 간단명료하게 유지',
    'settings.responseLanguage': '응답 언어',
    'settings.responseLanguageDesc': 'Afterwon이 응답할 때 사용할 기본 언어를 설정합니다. (채팅 응답 언어와는 별개)',
    'settings.selectContent': '설정을 선택해주세요',
    'settings.accountContent': '계정 설정 내용',
    'settings.privacyContent': '개인정보 설정 내용',
    'settings.billingContent': '결제 설정 내용',
    'settings.featuresContent': '기능 설정 내용',
    'settings.beta': '베타',
    'settings.job.developer': '개발자',
    'settings.job.designer': '디자이너',
    'settings.job.planner': '기획자',
    'settings.job.marketer': '마케터',
    'settings.job.analyst': '분석가',
    'settings.job.sales': '영업',
    'settings.job.management': '경영',
    'settings.job.other': '기타',

    // 대시보드
    'dashboard.title': '대시보드',
    'dashboard.description': '데이터 분석 결과를 시각적으로 표현하는 대시보드입니다.',
    'dashboard.chartAnalysis': '차트 분석',
    'dashboard.chartAnalysisDesc': '생성된 차트들을 한눈에 확인하고 관리할 수 있습니다.',
    'dashboard.dataStatistics': '데이터 통계',
    'dashboard.dataStatisticsDesc': '업로드된 파일들의 통계와 분석 현황을 보여줍니다.',
    'dashboard.usageStats': '사용 현황',
    'dashboard.usageStatsDesc': '시스템 사용 패턴과 활동 내역을 추적합니다.',
    'dashboard.underDevelopment': '🚧 대시보드 기능은 개발 중입니다',

    // 프로필
    'profile.pro': 'Pro 요금제',
    'profile.upgrade': '요금제 업그레이드',
    'profile.learnMore': '자세히 알아보기',
    'profile.help': '도움 받기',

    // 에러 메시지
    'error.general': '알 수 없는 오류가 발생했습니다.',
    'error.network': '네트워크 오류가 발생했습니다.',
    'error.fileUpload': '파일 업로드에 실패했습니다.',
    'error.unauthorized': '인증이 필요합니다.',

    // 메뉴 액션
    'menu.rename': '이름 변경',
    'menu.share': '공유하기',
    'menu.delete': '삭제하기',
  },

  en: {
    // 공통
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.share': 'Share',
    'common.copy': 'Copy',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.upload': 'Upload',
    'common.download': 'Download',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.new': 'New',
    'common.today': 'Today',
    'common.yesterday': 'Yesterday',
    'common.settings': 'Settings',

    // 인증
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.welcomeMessage': 'Hello! Upload and analyze your data. We support CSV and Excel files. You can also ask questions without uploading files.',

    // 네비게이션
    'nav.newChat': 'New Chat',
    'nav.chatSearch': 'Chat Search',
    'nav.projects': 'Projects',
    'nav.fileSystem': 'File System',
    'nav.appConnector': 'App Connector',
    'nav.dashboard': 'Dashboard',
    'nav.recentItems': 'Recent Items',
    'nav.projectChat': 'Project Chat',
    'nav.projectChatSubtitle': 'Chat within project',

    // 채팅
    'chat.noHistory': 'No chat history',
    'chat.typeMessage': 'Upload a file and ask questions about your data...',
    'chat.fileUploaded': 'File uploaded successfully!',
    'chat.askQuestion': 'Now you can ask questions about your data.',
    'chat.uploadError': 'Error occurred during file upload',
    'chat.analysisError': 'Error occurred during analysis',
    'chat.fileNotFound': 'The file used in this chat no longer exists on the server. Please upload a new file.',
    'chat.expandChart': 'Expand Chart',
    'chat.closeChart': 'Close Chart',

    // 채팅 검색
    'chatSearch.title': 'My Chat History',
    'chatSearch.newChat': 'New Chat',
    'chatSearch.searchPlaceholder': 'Search conversations',
    'chatSearch.totalChats': '{count} Afterwon chats',
    'chatSearch.all': 'All',
    'chatSearch.noResults': 'No search results found.',
    'chatSearch.noHistory': 'No chat history.',
    'chatSearch.newChatTitle': 'New Chat',
    'chatSearch.justNow': 'Just now',
    'chatSearch.minutesAgo': '{minutes} minutes ago',
    'chatSearch.hoursAgo': '{hours} hours ago',
    'chatSearch.yesterday': 'Yesterday',
    'chatSearch.daysAgo': '{days} days ago',

    // 프로젝트
    'projects.title': 'Projects',
    'projects.newProject': 'New project',
    'projects.searchPlaceholder': 'Search projects...',
    'projects.projectsCount': '{count} projects',
    'projects.sortBy': 'Sort by',
    'projects.recentlyUpdated': 'Recently updated',
    'projects.dateCreated': 'Date created',
    'projects.name': 'Name',
    'projects.starred': 'Starred',
    'projects.updated': 'Updated',
    'projects.daysAgo': '{days} days ago',
    'projects.monthsAgo': '{months} months ago',
    'projects.yearsAgo': '{years} years ago',
    'projects.loadingProjects': 'Loading projects...',
    'projects.loadingConversations': 'Loading conversations...',
    'projects.startNewChat': 'Start a new chat in {projectName}',
    'projects.backToProjects': 'Back to projects',
    'projects.share': 'Share',

    // 파일 시스템
    'fileSystem.title': 'File System',
    'fileSystem.uploading': 'Uploading...',
    'fileSystem.processing': 'Processing...',

    // 설정
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.interfaceLanguage': 'Interface Language',
    'settings.korean': '한국어',
    'settings.english': 'English',
    'settings.japanese': '日本語',
    'settings.account': 'Account',
    'settings.profile': 'Profile',
    'settings.appearance': 'Appearance',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.billing': 'Billing',
    'settings.features': 'Features',
    'settings.help': 'Help',
    'settings.about': 'About',
    'settings.name': 'Name',
    'settings.jobQuestion': 'What best describes your work?',
    'settings.jobPlaceholder': 'Please select your job',
    'settings.saving': 'Saving...',
    'settings.preferencesQuestion': 'What personal preferences should Afterwon consider when responding?',
    'settings.preferencesSubtitle': 'Your custom preferences will be applied to all conversations within Afterwon\'s guidelines.',
    'settings.preferencesLink': 'Learn more about custom preferences',
    'settings.preferencesPlaceholder': 'Example: Keep explanations brief and clear',
    'settings.responseLanguage': 'Response Language',
    'settings.responseLanguageDesc': 'Set the default language for Afterwon responses. (Separate from chat response language)',
    'settings.selectContent': 'Please select a setting',
    'settings.accountContent': 'Account settings content',
    'settings.privacyContent': 'Privacy settings content',
    'settings.billingContent': 'Billing settings content',
    'settings.featuresContent': 'Features settings content',
    'settings.beta': 'Beta',
    'settings.job.developer': 'Developer',
    'settings.job.designer': 'Designer',
    'settings.job.planner': 'Planner',
    'settings.job.marketer': 'Marketer',
    'settings.job.analyst': 'Analyst',
    'settings.job.sales': 'Sales',
    'settings.job.management': 'Management',
    'settings.job.other': 'Other',

    // 대시보드
    'dashboard.title': 'Dashboard',
    'dashboard.description': 'A dashboard that visually presents data analysis results.',
    'dashboard.chartAnalysis': 'Chart Analysis',
    'dashboard.chartAnalysisDesc': 'View and manage generated charts at a glance.',
    'dashboard.dataStatistics': 'Data Statistics',
    'dashboard.dataStatisticsDesc': 'Shows statistics and analysis status of uploaded files.',
    'dashboard.usageStats': 'Usage Statistics',
    'dashboard.usageStatsDesc': 'Track system usage patterns and activity history.',
    'dashboard.underDevelopment': '🚧 Dashboard features are under development',

    // 프로필
    'profile.pro': 'Pro Plan',
    'profile.upgrade': 'Upgrade Plan',
    'profile.learnMore': 'Learn More',
    'profile.help': 'Get Help',

    // 에러 메시지
    'error.general': 'An unknown error occurred.',
    'error.network': 'A network error occurred.',
    'error.fileUpload': 'File upload failed.',
    'error.unauthorized': 'Authentication required.',

    // 메뉴 액션
    'menu.rename': 'Rename',
    'menu.share': 'Share',
    'menu.delete': 'Delete',
  },

  ja: {
    // 공통
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.cancel': 'キャンセル',
    'common.confirm': '確認',
    'common.save': '保存',
    'common.edit': '編集',
    'common.delete': '削除',
    'common.share': '共有',
    'common.copy': 'コピー',
    'common.search': '検索',
    'common.filter': 'フィルター',
    'common.sort': '並び替え',
    'common.upload': 'アップロード',
    'common.download': 'ダウンロード',
    'common.back': '戻る',
    'common.next': '次へ',
    'common.previous': '前へ',
    'common.close': '閉じる',
    'common.open': '開く',
    'common.new': '新規作成',
    'common.today': '今日',
    'common.yesterday': '昨日',
    'common.settings': '設定',

    // 인증
    'auth.login': 'ログイン',
    'auth.logout': 'ログアウト',
    'auth.signup': 'サインアップ',
    'auth.email': 'メール',
    'auth.password': 'パスワード',
    'auth.welcomeMessage': 'こんにちは！データをアップロードして分析してください。CSVやExcelファイルをサポートしています。ファイルなしでも質問できます。',

    // 네비게이션
    'nav.newChat': '新しいチャット',
    'nav.chatSearch': 'チャット検索',
    'nav.projects': 'プロジェクト',
    'nav.fileSystem': 'ファイルシステム',
    'nav.appConnector': 'アプリコネクター',
    'nav.dashboard': 'ダッシュボード',
    'nav.recentItems': '最近の項目',
    'nav.projectChat': 'プロジェクトチャット',
    'nav.projectChatSubtitle': 'プロジェクト内チャット',

    // 채팅
    'chat.noHistory': 'チャット履歴がありません',
    'chat.typeMessage': 'ファイルをアップロードしてデータについて質問してください...',
    'chat.fileUploaded': 'ファイルが正常にアップロードされました！',
    'chat.askQuestion': 'データについて質問してください。',
    'chat.uploadError': 'ファイルアップロード中にエラーが発生しました',
    'chat.analysisError': '分析中にエラーが発生しました',
    'chat.fileNotFound': 'このチャットで使用されたファイルはサーバーに存在しません。新しいファイルをアップロードしてください。',
    'chat.expandChart': 'チャート拡大',
    'chat.closeChart': 'チャートを閉じる',

    // 채팅 검색
    'chatSearch.title': 'マイチャット履歴',
    'chatSearch.newChat': '新しいチャット',
    'chatSearch.searchPlaceholder': '会話内容を検索',
    'chatSearch.totalChats': 'Afterwonのチャット{count}個',
    'chatSearch.all': '全て',
    'chatSearch.noResults': '検索結果がありません。',
    'chatSearch.noHistory': 'チャット履歴がありません。',
    'chatSearch.newChatTitle': '新しいチャット',
    'chatSearch.justNow': 'たった今',
    'chatSearch.minutesAgo': '{minutes}分前',
    'chatSearch.hoursAgo': '{hours}時間前',
    'chatSearch.yesterday': '昨日',
    'chatSearch.daysAgo': '{days}日前',

    // 프로젝트
    'projects.title': 'プロジェクト',
    'projects.newProject': '新しいプロジェクト',
    'projects.searchPlaceholder': 'プロジェクトを検索...',
    'projects.projectsCount': '{count}個のプロジェクト',
    'projects.sortBy': '並び替え',
    'projects.recentlyUpdated': '最近更新',
    'projects.dateCreated': '作成日',
    'projects.name': '名前',
    'projects.starred': 'お気に入り',
    'projects.updated': '更新済み',
    'projects.daysAgo': '{days}日前',
    'projects.monthsAgo': '{months}ヶ月前',
    'projects.yearsAgo': '{years}年前',
    'projects.loadingProjects': 'プロジェクト読み込み中...',
    'projects.loadingConversations': '会話読み込み中...',
    'projects.startNewChat': '{projectName}で新しいチャットを開始',
    'projects.backToProjects': 'プロジェクトに戻る',
    'projects.share': '共有',

    // 파일 시스템
    'fileSystem.title': 'ファイルシステム',
    'fileSystem.uploading': 'アップロード中...',
    'fileSystem.processing': '処理中...',

    // 설정
    'settings.title': '設定',
    'settings.language': '言語',
    'settings.interfaceLanguage': 'インターフェース言語',
    'settings.korean': '한국어',
    'settings.english': 'English',
    'settings.japanese': '日本語',
    'settings.account': 'アカウント',
    'settings.profile': 'プロフィール',
    'settings.appearance': '外観',
    'settings.notifications': '通知',
    'settings.privacy': 'プライバシー',
    'settings.billing': '請求',
    'settings.features': '機能',
    'settings.help': 'ヘルプ',
    'settings.about': '情報',
    'settings.name': '氏名',
    'settings.jobQuestion': 'あなたの仕事を最もよく表すものは何ですか？',
    'settings.jobPlaceholder': '職種を選択してください',
    'settings.saving': '保存中...',
    'settings.preferencesQuestion': 'Afterwonが応答する際に考慮すべき個人的な好みは何ですか？',
    'settings.preferencesSubtitle': '設定したカスタム設定は、Afterwonのガイドライン内ですべての会話に適用されます。',
    'settings.preferencesLink': 'カスタム設定について詳しく学ぶ',
    'settings.preferencesPlaceholder': '例：説明を簡潔明瞭に保つ',
    'settings.responseLanguage': '応答言語',
    'settings.responseLanguageDesc': 'Afterwon応答のデフォルト言語を設定します。（チャット応答言語とは別）',
    'settings.selectContent': '設定を選択してください',
    'settings.accountContent': 'アカウント設定内容',
    'settings.privacyContent': 'プライバシー設定内容',
    'settings.billingContent': '請求設定内容',
    'settings.featuresContent': '機能設定内容',
    'settings.beta': 'ベータ',
    'settings.job.developer': '開発者',
    'settings.job.designer': 'デザイナー',
    'settings.job.planner': '企画者',
    'settings.job.marketer': 'マーケター',
    'settings.job.analyst': 'アナリスト',
    'settings.job.sales': '営業',
    'settings.job.management': '経営',
    'settings.job.other': 'その他',

    // 대시보드
    'dashboard.title': 'ダッシュボード',
    'dashboard.description': 'データ分析結果を視覚的に表現するダッシュボードです。',
    'dashboard.chartAnalysis': 'チャート分析',
    'dashboard.chartAnalysisDesc': '生成されたチャートを一目で確認・管理できます。',
    'dashboard.dataStatistics': 'データ統計',
    'dashboard.dataStatisticsDesc': 'アップロードされたファイルの統計と分析状況を表示します。',
    'dashboard.usageStats': '使用状況',
    'dashboard.usageStatsDesc': 'システム使用パターンとアクティビティ履歴を追跡します。',
    'dashboard.underDevelopment': '🚧 ダッシュボード機能は開発中です',

    // 프로필
    'profile.pro': 'Proプラン',
    'profile.upgrade': 'プランをアップグレード',
    'profile.learnMore': '詳細を見る',
    'profile.help': 'ヘルプを受ける',

    // 에러 메시지
    'error.general': '不明なエラーが発生しました。',
    'error.network': 'ネットワークエラーが発生しました。',
    'error.fileUpload': 'ファイルアップロードに失敗しました。',
    'error.unauthorized': '認証が必要です。',

    // 메뉴 액션
    'menu.rename': '名前変更',
    'menu.share': '共有',
    'menu.delete': '削除',
  }
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('interfaceLanguage') as Language
      return saved || 'ko'
    }
    return 'ko'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('interfaceLanguage', lang)
    }
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key] || key

    if (params) {
      return Object.entries(params).reduce((text, [param, value]) => {
        return text.replace(`{${param}}`, String(value))
      }, translation)
    }

    return translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}