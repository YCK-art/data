from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/analysis")
async def websocket_analysis(websocket: WebSocket):
    """분석 진행상황 실시간 전송"""
    await manager.connect(websocket)
    
    try:
        while True:
            # 클라이언트로부터 메시지 대기
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "start_analysis":
                # 분석 시작 알림
                await manager.send_message(json.dumps({
                    "type": "progress",
                    "message": "분석을 시작합니다...",
                    "progress": 0
                }), websocket)
                
                # 분석 진행상황 시뮬레이션
                steps = [
                    "데이터 로딩 중...",
                    "AI 분석 중...",
                    "차트 생성 중...",
                    "결과 준비 중...",
                    "분석 완료!"
                ]
                
                for i, step in enumerate(steps):
                    await asyncio.sleep(1)  # 실제로는 실제 작업 시간
                    await manager.send_message(json.dumps({
                        "type": "progress",
                        "message": step,
                        "progress": (i + 1) / len(steps) * 100
                    }), websocket)
                
                # 완료 메시지
                await manager.send_message(json.dumps({
                    "type": "completed",
                    "message": "분석이 완료되었습니다!"
                }), websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)