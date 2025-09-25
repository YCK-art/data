from fastapi import APIRouter, HTTPException
import uuid
from ..services.file_service import FileService
from ..services.ai_service import AIService
from ..services.chart_service import ChartService
from ..models.file import AnalysisRequest, AnalysisResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

file_service = FileService()
ai_service = AIService()
chart_service = ChartService()

@router.post("/request", response_model=AnalysisResponse)
async def analyze_data(request: AnalysisRequest):
    """데이터 분석 요청"""
    
    # 파일 데이터 로드
    try:
        print(f"🔍 Looking for file_id: {request.file_id}")
        print(f"📋 Available files in metadata: {list(file_service.file_metadata.keys())}")
        
        df = file_service.get_dataframe(request.file_id)
        
        if df is None:
            print(f"❌ File not found in metadata or file doesn't exist for file_id: {request.file_id}")
            raise HTTPException(status_code=404, detail=f"파일을 찾을 수 없습니다. file_id: {request.file_id}")
        
        # 파일 메타데이터에서 EDA 정보 가져오기
        eda_data = None
        if request.file_id in file_service.file_metadata:
            # 파일을 다시 로드하여 EDA 수행 (실제로는 캐싱 필요)
            from ..services.file_service import FileService
            temp_service = FileService()
            eda_data = temp_service._perform_eda(df)
        
        # AI 분석 (EDA 데이터 포함)
        analysis_result = await ai_service.analyze_data(df, request.question, eda_data)
        
        # Check if this is a chart recommendation request
        chart_columns = analysis_result.get("chart_columns", {})
        if (chart_columns.get("x") == "recommendation_request" and 
            chart_columns.get("y") == "recommendation_request"):
            
            # Generate chart recommendations instead of creating a chart
            recommendations = chart_service.get_chart_recommendations(df, request.question)
            
            return {
                "analysis_id": str(uuid.uuid4()),
                "insights": [recommendations["suggested_message"]],
                "chart_data": None,
                "follow_up_questions": [
                    f"{rec['korean_name']}로 분석해주세요" 
                    for rec in recommendations["recommendations"][:3]
                ],
                "data_summary": recommendations["data_summary"],
                "recommendations": recommendations["recommendations"]
            }
        
        # 차트 생성
        analysis_result["question"] = request.question  # Add question for chart service context
        print(f"🎨 Sending to chart_service:")
        print(f"   Chart Type: {analysis_result.get('chart_type')}")
        print(f"   Chart Columns: {analysis_result.get('chart_columns')}")
        chart_data = chart_service.generate_plotly_chart(df, analysis_result)
        
        # 응답 생성
        response = AnalysisResponse(
            analysis_id=str(uuid.uuid4()),
            insights=analysis_result.get("insights", ["분석을 완료했습니다."]),
            chart_data=chart_data,
            summary=analysis_result.get("summary", "데이터 분석 결과입니다."),
            follow_up_questions=analysis_result.get("follow_up_questions", [])
        )
        
        return response
        
    except Exception as e:
        import traceback
        print(f"❌ Error in analysis: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"분석 중 오류가 발생했습니다: {str(e)}"
        )