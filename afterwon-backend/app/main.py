from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from .api import files, analysis, websocket, chat, code_execution
from .core.config import settings
import json
import numpy as np
from typing import Any

# NumPy JSON Encoder - 근본적 해결책
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif hasattr(obj, 'item'):  # NumPy scalar
            return obj.item()
        return super().default(obj)

# 전역 NumPy/pandas 타입 변환 함수
def convert_numpy_types_global(obj: Any) -> Any:
    """전역적으로 NumPy/pandas 타입을 JSON 직렬화 가능한 타입으로 변환"""
    import pandas as pd
    from datetime import datetime

    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (pd.Timestamp, pd.Timedelta)):
        return str(obj)  # Timestamp를 문자열로 변환
    elif isinstance(obj, datetime):
        return obj.isoformat()  # datetime을 ISO 형식 문자열로 변환
    elif isinstance(obj, pd.Series):
        return obj.tolist()  # Series를 리스트로 변환
    elif hasattr(obj, '__array__'):  # pandas 관련 배열 타입들
        try:
            return obj.tolist()
        except:
            return str(obj)
    elif hasattr(obj, 'item'):  # NumPy scalar
        return obj.item()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types_global(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types_global(item) for item in obj]
    else:
        # 마지막 fallback: JSON 직렬화 테스트
        try:
            json.dumps(obj)
            return obj
        except (TypeError, ValueError):
            # JSON 직렬화 실패시 문자열로 변환
            return str(obj)

app = FastAPI(
    title="AfterWon API",
    description="Julius.ai를 뛰어넘는 자연어 데이터 분석 플랫폼",
    version="1.0.0"
)

# NumPy 타입 자동 변환 미들웨어
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import json

class NumpyJSONMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # JSON 응답인 경우에만 처리
        if isinstance(response, JSONResponse) and hasattr(response, 'body'):
            try:
                # 기존 응답 데이터 파싱
                response_data = json.loads(response.body.decode())
                # NumPy 타입 변환
                converted_data = convert_numpy_types_global(response_data)
                # 새로운 응답 생성
                return JSONResponse(
                    content=converted_data,
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
            except:
                # 변환 실패시 원본 응답 반환
                pass

        return response

# NumPy 타입 변환 미들웨어 적용
app.add_middleware(NumpyJSONMiddleware)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"],  # 프론트엔드 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(files.router)
app.include_router(analysis.router)
app.include_router(websocket.router)
app.include_router(chat.router)
app.include_router(code_execution.router)

@app.get("/")
async def root():
    return {
        "message": "AfterWon API Server",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )