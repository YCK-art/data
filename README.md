# AfterWon - AI 데이터 분석 플랫폼

Julius.ai를 뛰어넘는 자연어 데이터 분석 플랫폼입니다.

## 🚀 주요 기능

- **파일 업로드**: CSV, Excel 파일 드래그 앤 드롭 업로드
- **AI 분석**: GPT-4o mini를 활용한 자연어 데이터 분석
- **인터랙티브 차트**: Plotly.js 기반 인터랙티브 차트 생성
- **실시간 통신**: WebSocket을 통한 실시간 분석 진행상황 표시
- **채팅 UI**: 직관적인 채팅 기반 인터페이스

## 📋 사전 준비

### 필수 요구사항
- Python 3.8+
- Node.js 18+
- OpenAI API Key

## 🏗️ 설치 및 실행

### 1. OpenAI API 키 설정

```bash
# 백엔드 디렉토리의 .env 파일 편집
cd afterwon-backend
```

`.env` 파일에서 다음 라인 수정:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 2. 백엔드 서버 시작

```bash
# 백엔드 디렉토리에서
cd afterwon-backend

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python run_server.py
```

서버가 다음 주소에서 실행됩니다:
- **API 서버**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8000/ws/analysis

### 3. 프론트엔드 서버 시작

새 터미널에서:

```bash
# 프론트엔드 디렉토리에서
cd afterwon-frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드가 다음 주소에서 실행됩니다:
- **웹 앱**: http://localhost:3000

## 📊 사용 방법

1. **파일 업로드**
   - 웹 인터페이스에서 CSV/Excel 파일을 드래그 앤 드롭
   - 파일 정보가 자동으로 표시됨

2. **데이터 분석**
   - 채팅창에 자연어로 질문 입력
   - 예: "매출 트렌드를 보여주세요", "지역별 성과를 분석해주세요"

3. **결과 확인**
   - AI 인사이트와 인터랙티브 차트 확인
   - 차트 다운로드 및 상호작용 가능

## 🔧 API 엔드포인트

### 파일 관련
- `POST /api/files/upload` - 파일 업로드
- `GET /api/files/{id}/preview` - 파일 미리보기

### 분석 관련  
- `POST /api/analysis/request` - 데이터 분석 요청
- `WS /ws/analysis` - 실시간 분석 진행상황

### 시스템
- `GET /health` - 서버 상태 확인
- `GET /` - API 정보

## 🐛 문제 해결

### 일반적인 문제들

1. **OpenAI API 에러**
   ```
   .env 파일의 OPENAI_API_KEY가 올바르게 설정되었는지 확인
   ```

2. **파일 업로드 실패**
   ```
   파일 크기 (50MB 이하) 및 형식 (CSV, Excel) 확인
   ```

3. **CORS 에러**
   ```
   백엔드 서버가 8000번 포트에서 실행 중인지 확인
   ```

4. **프론트엔드 스타일 안보임**
   ```bash
   # 브라우저 캐시 강제 새로고침
   Ctrl+Shift+R (Windows/Linux) 또는 Cmd+Shift+R (Mac)
   ```

### 개발자 디버깅

```bash
# 백엔드 로그 확인
tail -f logs/app.log

# API 테스트 (Swagger UI)
open http://localhost:8000/docs

# WebSocket 연결 테스트
wscat -c ws://localhost:8000/ws/analysis
```

## 🏗️ 프로젝트 구조

```
afterwon-backend/
├── app/
│   ├── api/           # API 라우터
│   ├── services/      # 비즈니스 로직
│   ├── models/        # 데이터 모델
│   ├── core/          # 설정 및 유틸
│   └── main.py        # FastAPI 앱
├── uploads/           # 업로드된 파일
├── requirements.txt   # Python 의존성
├── .env              # 환경 변수
└── run_server.py     # 서버 실행 스크립트

afterwon-frontend/
├── src/
│   ├── components/    # React 컴포넌트
│   ├── hooks/         # 커스텀 훅
│   ├── services/      # API 클라이언트
│   └── app/           # Next.js 앱 라우터
├── package.json       # Node.js 의존성
└── tailwind.config.js # Tailwind CSS 설정
```

## 🎯 다음 단계

- [ ] 데이터베이스 연동 (파일 메타데이터 저장)
- [ ] 사용자 인증 시스템
- [ ] 다양한 차트 타입 지원 확장
- [ ] 분석 결과 히스토리 저장
- [ ] 대용량 파일 처리 최적화

---

**Note**: OpenAI API 키 없이도 기본적인 UI/UX는 확인 가능하나, 실제 AI 분석 기능을 사용하려면 유효한 API 키가 필요합니다.