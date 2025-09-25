from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    file_size: int
    columns: list[str]
    row_count: int
    preview: list[dict]  # Keep as list for backward compatibility
    eda: Optional[Dict[str, Any]] = None  # Add optional EDA data
    uploaded_at: datetime

class AnalysisRequest(BaseModel):
    file_id: str
    question: str
    chart_type: Optional[str] = None

class AnalysisResponse(BaseModel):
    analysis_id: str
    insights: list[str]
    chart_data: Dict[str, Any]
    summary: str
    follow_up_questions: Optional[list[str]] = None