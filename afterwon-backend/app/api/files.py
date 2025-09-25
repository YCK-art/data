from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.file_service import FileService
from ..models.file import FileUploadResponse
from ..core.config import settings

router = APIRouter(prefix="/api/files", tags=["files"])
file_service = FileService()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """파일 업로드 및 파싱"""
    
    # 파일 크기 체크
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"파일 크기가 너무 큽니다. 최대 {settings.MAX_FILE_SIZE//1024//1024}MB까지 허용됩니다."
        )
    
    # 파일 형식 체크
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. CSV, Excel 파일만 업로드 가능합니다."
        )
    
    try:
        file_data = await file_service.save_and_parse_file(content, file.filename)
        return FileUploadResponse(**file_data)
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"파일 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{file_id}/preview")
async def get_file_preview(file_id: str, filename: str):
    """파일 미리보기"""
    df = file_service.get_dataframe(file_id, filename)
    
    if df is None:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    return {
        "columns": df.columns.tolist(),
        "row_count": len(df),
        "preview": df.head(10).to_dict('records')
    }