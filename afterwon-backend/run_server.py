#!/usr/bin/env python3
"""
AfterWon Backend Server 실행 스크립트
"""

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print("🚀 AfterWon Backend Server Starting...")
    print(f"📍 Server URL: http://localhost:{settings.PORT}")
    print(f"📖 API Docs: http://localhost:{settings.PORT}/docs")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    if settings.OPENAI_API_KEY:
        print(f"✅ OpenAI API 키가 설정되었습니다: {settings.OPENAI_API_KEY[:20]}...")
    else:
        print("❌ OpenAI API 키가 설정되지 않았습니다! .env 파일을 확인하세요.")
        print("📁 OPENAI_API_KEY=your_api_key_here")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )