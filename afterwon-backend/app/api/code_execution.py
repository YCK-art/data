from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
import sys
import io
import contextlib
import json
import traceback
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # 브라우저 자동 열기 방지
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
import plotly.io as pio
pio.renderers.default = "json"  # Plotly 브라우저 자동 열기 방지
from datetime import datetime

def convert_numpy_types(obj):
    """NumPy 타입을 JSON 직렬화 가능한 Python 타입으로 변환"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif hasattr(obj, 'item'):  # NumPy scalar
        return obj.item()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

router = APIRouter(prefix="/api/code", tags=["code"])

class CodeExecutionRequest(BaseModel):
    code: str
    context: Optional[Dict[str, Any]] = None

class CodeExecutionResponse(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None
    result: Optional[Any] = None
    execution_time: float
    chart_data: Optional[Dict[str, Any]] = None

class CodeStreamRequest(BaseModel):
    query: str
    data_summary: Optional[Dict[str, Any]] = None

class CodeStreamResponse(BaseModel):
    code_chunks: list[str]
    final_result: str

# 안전한 코드 실행을 위한 제한된 글로벌 네임스페이스
SAFE_GLOBALS = {
    '__builtins__': {
        'abs': abs, 'all': all, 'any': any, 'bool': bool, 'dict': dict,
        'enumerate': enumerate, 'float': float, 'int': int, 'len': len,
        'list': list, 'map': map, 'max': max, 'min': min, 'range': range, 'round': round,
        'sorted': sorted, 'str': str, 'sum': sum, 'tuple': tuple, 'zip': zip,
        'print': print, 'type': type, 'isinstance': isinstance, '__import__': __import__,
        'eval': eval  # 수학 표현식 계산을 위해 추가
    },
    'pd': pd,
    'np': np,
    'plt': plt,
    'sns': sns,
    'px': px,
    'go': go,
    'pio': pio,
    'json': json,
    'datetime': datetime
}

def prepare_dataframe_context(context: Dict[str, Any]) -> Dict[str, Any]:
    """컨텍스트에서 데이터프레임을 복원"""
    enhanced_context = context.copy()

    # 데이터프레임 복원
    if 'df' in context and isinstance(context['df'], dict):
        try:
            # 딕셔너리를 데이터프레임으로 변환
            df_dict = context['df']
            if df_dict and len(df_dict) > 0:
                # to_dict('list') 형태의 데이터를 처리
                if isinstance(df_dict, dict) and all(isinstance(v, list) for v in df_dict.values()):
                    df = pd.DataFrame(df_dict)
                    enhanced_context['df'] = df
                    enhanced_context['data'] = df  # 별칭
                    print(f"📊 DataFrame restored: {len(df)} rows, {len(df.columns)} columns")
                else:
                    # 다른 형태의 딕셔너리인 경우 시도
                    df = pd.DataFrame(df_dict)
                    enhanced_context['df'] = df
                    enhanced_context['data'] = df  # 별칭
                    print(f"📊 DataFrame restored (alternative): {len(df)} rows, {len(df.columns)} columns")
            else:
                # 빈 딕셔너리인 경우
                enhanced_context['df'] = pd.DataFrame()
                enhanced_context['data'] = pd.DataFrame()
                print("📊 Empty DataFrame provided")
        except Exception as e:
            print(f"DataFrame restoration error: {e}")
            print(f"DataFrame dict type: {type(context.get('df'))}")
            print(f"DataFrame dict contents (first 100 chars): {str(context.get('df'))[:100]}")
            enhanced_context['df'] = pd.DataFrame()
            enhanced_context['data'] = pd.DataFrame()
    else:
        # df가 없는 경우 빈 데이터프레임 생성
        enhanced_context['df'] = pd.DataFrame()
        enhanced_context['data'] = pd.DataFrame()

    return enhanced_context

@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Python 코드를 안전하게 실행합니다.
    """
    try:
        start_time = datetime.now()

        # 출력 캡처를 위한 StringIO 객체
        output_buffer = io.StringIO()
        error_buffer = io.StringIO()

        # 실행 컨텍스트 준비
        local_vars = {}
        if request.context:
            # 데이터프레임 복원 및 컨텍스트 준비
            enhanced_context = prepare_dataframe_context(request.context)
            local_vars.update(enhanced_context)

        # 코드 실행
        with contextlib.redirect_stdout(output_buffer), contextlib.redirect_stderr(error_buffer):
            try:
                # exec을 사용하여 코드 실행
                exec(request.code, SAFE_GLOBALS, local_vars)

                # 결과 추출 (마지막 변수나 표현식 결과)
                result = None
                chart_data = None

                if local_vars:
                    # chart_json 변수가 있으면 차트 데이터로 사용
                    if 'chart_json' in local_vars:
                        try:
                            import json
                            chart_json_str = local_vars['chart_json']
                            if isinstance(chart_json_str, str):
                                chart_data = json.loads(chart_json_str)
                            else:
                                chart_data = chart_json_str
                            # 차트 데이터도 NumPy 타입 변환 적용
                            chart_data = convert_numpy_types(chart_data)
                            print("🎨 차트 데이터가 추출되었습니다!")
                        except Exception as e:
                            print(f"⚠️ 차트 데이터 처리 오류: {e}")

                    # 마지막에 정의된 변수 중에서 결과를 찾기
                    for key, value in local_vars.items():
                        if not key.startswith('_') and key not in ['pd', 'np', 'plt', 'sns', 'px', 'go', 'json', 'datetime', 'chart_json', 'fig']:
                            # NumPy 타입을 Python 기본 타입으로 변환
                            result = convert_numpy_types(value)

                output = output_buffer.getvalue()
                error_output = error_buffer.getvalue()

                # 출력이 없으면 기본 메시지 제공
                if not output.strip() and not error_output:
                    output = "코드가 성공적으로 실행되었습니다."

                end_time = datetime.now()
                execution_time = (end_time - start_time).total_seconds()

                # 응답 데이터 구성
                response_data = {
                    "success": True,
                    "output": output,
                    "error": error_output if error_output else None,
                    "result": str(convert_numpy_types(result)) if result is not None else None,
                    "execution_time": execution_time
                }

                # 차트 데이터가 있으면 추가
                if chart_data:
                    response_data["chart_data"] = chart_data

                # 전체 응답 데이터에 NumPy 타입 변환 적용
                response_data = convert_numpy_types(response_data)

                return CodeExecutionResponse(**response_data)

            except Exception as e:
                error_output = error_buffer.getvalue()
                error_message = f"{str(e)}\n{traceback.format_exc()}"

                end_time = datetime.now()
                execution_time = (end_time - start_time).total_seconds()

                return CodeExecutionResponse(
                    success=False,
                    output=output_buffer.getvalue(),
                    error=error_message,
                    result=None,
                    execution_time=execution_time
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"코드 실행 중 오류가 발생했습니다: {str(e)}")

@router.post("/generate-analysis", response_model=CodeStreamResponse)
async def generate_analysis_code(request: CodeStreamRequest):
    """
    사용자의 질문에 대해 단계별 분석 코드를 생성합니다.
    """
    try:
        # 질문 분석 및 코드 생성 로직
        code_chunks = []

        # 데이터 로드 및 기본 정보
        if "평균" in request.query or "average" in request.query.lower():
            code_chunks.extend([
                "# 데이터 분석 시작",
                "import pandas as pd",
                "import numpy as np",
                "",
                "# 샘플 데이터 또는 업로드된 데이터 사용",
                "# data = pd.read_csv('your_file.csv')",
                "",
                "# 평균 계산"
            ])

            if request.data_summary:
                # 실제 데이터가 있는 경우
                code_chunks.extend([
                    f"# 데이터 요약: {request.data_summary}",
                    "numerical_columns = data.select_dtypes(include=[np.number]).columns",
                    "averages = data[numerical_columns].mean()",
                    "print('각 열의 평균:')",
                    "for col, avg in averages.items():",
                    "    print(f'{col}: {avg:.2f}')"
                ])
            else:
                # 예시 데이터 사용
                code_chunks.extend([
                    "# 예시 데이터로 평균 계산",
                    "sample_data = [842, 1349, 1165, 837, 1268, 851, 1845, 543, 679, 171, 791]",
                    "average = sum(sample_data) / len(sample_data)",
                    "print(f'평균: {average:.1f}')",
                    "",
                    "# NumPy를 사용한 계산",
                    "np_average = np.mean(sample_data)",
                    "print(f'NumPy 평균: {np_average:.1f}')"
                ])

        final_result = "분석이 완료되었습니다."

        return CodeStreamResponse(
            code_chunks=code_chunks,
            final_result=final_result
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"코드 생성 중 오류가 발생했습니다: {str(e)}")

@router.get("/health")
async def health_check():
    """
    코드 실행 서비스 상태 확인
    """
    return {"status": "healthy", "service": "code_execution"}