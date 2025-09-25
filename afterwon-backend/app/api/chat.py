from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import json
import asyncio
from ..services.ai_service import AIService
from ..services.file_service import FileService

router = APIRouter(prefix="/api/chat", tags=["chat"])

# 서비스 인스턴스 생성
ai_service = AIService()
file_service = FileService()

class ConversationMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None

class UnifiedQuestionRequest(BaseModel):
    question: str
    file_id: Optional[str] = None  # 파일이 있으면 file_id 제공
    conversation_history: Optional[List[ConversationMessage]] = None  # 대화 히스토리

class UnifiedQuestionResponse(BaseModel):
    answer: str
    codeExecution: Optional[Dict[str, Any]] = None
    insights: Optional[List[str]] = None
    followUpQuestions: Optional[List[str]] = None
    chartData: Optional[Any] = None
    fileInfo: Optional[Dict[str, Any]] = None

class GeneralQuestionRequest(BaseModel):
    question: str

class GeneralQuestionResponse(BaseModel):
    answer: str

class ChatTitleRequest(BaseModel):
    message: str

class ChatTitleResponse(BaseModel):
    title: str

@router.post("/unified-question", response_model=UnifiedQuestionResponse)
async def ask_unified_question(request: UnifiedQuestionRequest):
    """
    통합된 질문 처리 - 파일 유무에 관계없이 코드 실행 기반으로 정확한 답변 제공
    """
    try:
        df = None
        file_info = None

        # 파일이 있는 경우 데이터 로드
        if request.file_id:
            try:
                print(f"🔍 Attempting to load file: {request.file_id}")
                df = file_service.get_dataframe(request.file_id)
                file_metadata = file_service.get_file_metadata(request.file_id)

                if df is None:
                    print(f"❌ Failed to load DataFrame for file_id: {request.file_id}")
                    print(f"📋 Available files: {list(file_service.file_metadata.keys())}")
                elif file_metadata is None:
                    print(f"❌ No metadata found for file_id: {request.file_id}")
                else:
                    file_info = {
                        'filename': file_metadata.get('filename', 'Unknown'),
                        'fileSize': file_metadata.get('file_size', 0),
                        'fileType': file_metadata.get('file_type', 'unknown'),
                        'file_id': request.file_id
                    }
                    print(f"📊 Loaded data: {len(df)} rows, {len(df.columns)} columns")
                    print(f"📁 File info: {file_info}")

            except Exception as e:
                print(f"❌ File loading error: {str(e)}")
                import traceback
                print(f"Full traceback: {traceback.format_exc()}")
                # 파일 로드 실패해도 일반 질문으로 처리
                pass

        # 통합 분석 실행 (대화 히스토리 포함)
        result = await ai_service.unified_analysis(request.question, df, file_info, request.conversation_history)

        return UnifiedQuestionResponse(
            answer=result.get('answer', ''),
            codeExecution=result.get('code_execution'),
            insights=result.get('insights'),
            followUpQuestions=result.get('followUpQuestions'),
            chartData=result.get('chartData'),
            fileInfo=file_info
        )

    except Exception as e:
        print(f"Unified question error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"답변 생성 중 오류가 발생했습니다: {str(e)}")

@router.post("/question", response_model=GeneralQuestionResponse)
async def ask_general_question(request: GeneralQuestionRequest):
    """
    파일 없이 일반 질문에 답변합니다. (기존 호환성 유지)
    """
    try:
        # 통합 분석 시스템 사용
        result = await ai_service.unified_analysis(request.question)

        return GeneralQuestionResponse(answer=result.get('answer', ''))

    except Exception as e:
        print(f"General question error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"답변 생성 중 오류가 발생했습니다: {str(e)}")

@router.post("/unified-question-stream")
async def ask_unified_question_stream(request: UnifiedQuestionRequest):
    """
    통합된 질문 처리 - 스트리밍 방식으로 실시간 응답 제공
    """
    async def generate_response():
        try:
            df = None
            file_info = None

            # 파일이 있는 경우 데이터 로드
            if request.file_id:
                try:
                    print(f"🔍 Attempting to load file: {request.file_id}")
                    df = file_service.get_dataframe(request.file_id)
                    file_metadata = file_service.get_file_metadata(request.file_id)

                    if df is None:
                        print(f"❌ Failed to load DataFrame for file_id: {request.file_id}")
                        print(f"📋 Available files: {list(file_service.file_metadata.keys())}")
                    elif file_metadata is None:
                        print(f"❌ No metadata found for file_id: {request.file_id}")
                    else:
                        file_info = {
                            'filename': file_metadata.get('filename', 'Unknown'),
                            'fileSize': file_metadata.get('file_size', 0),
                            'fileType': file_metadata.get('file_type', 'unknown'),
                            'file_id': request.file_id
                        }
                        print(f"📊 Loaded data: {len(df)} rows, {len(df.columns)} columns")
                        print(f"📁 File info: {file_info}")

                except Exception as e:
                    print(f"❌ File loading error: {str(e)}")
                    import traceback
                    print(f"Full traceback: {traceback.format_exc()}")

            # 스트리밍 분석 실행
            print(f"🔄 generate_response에서 unified_analysis_stream 호출 전")
            try:
                # 타임아웃 설정 (180초 = 3분)
                stream_timeout = 180
                start_time = asyncio.get_event_loop().time()

                async for chunk in ai_service.unified_analysis_stream(request.question, df, file_info, request.conversation_history):
                    # 타임아웃 체크
                    if asyncio.get_event_loop().time() - start_time > stream_timeout:
                        print(f"⏰ 스트리밍 타임아웃 (180초 초과)")
                        timeout_chunk = {
                            "type": "error",
                            "content": "응답 시간이 초과되었습니다. 다시 시도해 주세요."
                        }
                        yield f"data: {json.dumps(timeout_chunk, ensure_ascii=False)}\n\n"
                        break

                    print(f"📦 chunk 받음: {chunk.get('type', 'unknown')}")
                    yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                print(f"✅ 모든 chunk 처리 완료")
            except Exception as stream_error:
                print(f"❌ 스트리밍 중 오류: {str(stream_error)}")
                import traceback
                print(f"스트리밍 오류 트레이스백: {traceback.format_exc()}")
                # 오류 메시지를 클라이언트에 전송
                error_chunk = {
                    "type": "error",
                    "content": f"스트리밍 오류: {str(stream_error)}"
                }
                yield f"data: {json.dumps(error_chunk, ensure_ascii=False)}\n\n"

        except Exception as e:
            print(f"Streaming unified question error: {str(e)}")
            error_chunk = {
                "type": "error",
                "content": f"답변 생성 중 오류가 발생했습니다: {str(e)}"
            }
            yield f"data: {json.dumps(error_chunk, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    )

@router.post("/generate-title", response_model=ChatTitleResponse)
async def generate_chat_title(request: ChatTitleRequest):
    """
    사용자의 첫 메시지를 바탕으로 채팅 제목을 생성합니다.
    """
    try:
        # AI 서비스를 통해 채팅 제목 생성
        title = await ai_service.generate_chat_title(request.message)

        return ChatTitleResponse(title=title)

    except Exception as e:
        print(f"Chat title generation error: {str(e)}")
        # 오류 발생 시 기본 제목 반환
        return ChatTitleResponse(title="새 채팅")