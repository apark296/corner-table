# routers/sessions.py

# imports
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from database import SessionLocal
from models import User, StudySession
from schemas.session import StartSessionResponse

TOTAL_TABLES = 20

router = APIRouter(tags=["Sessions"])

@router.post("/start-session", response_model=StartSessionResponse)
def start_session(user_id: int, table_id: int):
    db = SessionLocal()
    try:
        if table_id < 1 or table_id > TOTAL_TABLES:
            raise HTTPException(status_code=400, detail="Invalid table ID")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        active_session = db.query(StudySession).filter(
            StudySession.table_id == table_id,
            StudySession.end_time == None
        ).first()
        
        if active_session:
            raise HTTPException(
                status_code=400,
                detail="Table is currently occupied"
            )
        existing_user_session = db.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.end_time == None
        ).first()

        if existing_user_session:
            raise HTTPException(
                status_code=400,
                detail="User already has an active session"
            )
            
        session = StudySession(
            user_id=user_id,
            table_id=table_id
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        return {
            "status": "started",
            "session_id": session.id
        }
    finally:
        db.close()

@router.post("/end-session")
def end_session(session_id: int):
    db = SessionLocal()

    try:
        session = db.query(StudySession).filter(
            StudySession.id == session_id,
            StudySession.end_time == None
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session.end_time = datetime.now(timezone.utc)

        duration_minutes = int(
            (session.end_time - session.start_time).total_seconds() / 60
        )

        session.coins_earned = duration_minutes // 1
        
        user = db.query(User).filter(User.id == session.user_id).first()
        user.coins += session.coins_earned
        
        db.commit()

        return {
            "status": "ended",
            "coins_earned": session.coins_earned
        }
    finally:
        db.close()

@router.get("/sessions")
def list_sessions():
    db = SessionLocal()
    
    try:
        sessions = db.query(StudySession).all()
        
        return [
            {
                "id": s.id,
                "user_id": s.user_id,
                "table_id": s.table_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "coins": s.coins_earned
            }
            for s in sessions
        ]
    finally:
        db.close()

@router.get("/sessions/active")
def active_sessions():
    db = SessionLocal()
    
    try:
        sessions = db.query(StudySession).filter(
            StudySession.end_time == None
        ).all()
        
        return [
            {
                "session_id": s.id,
                "user_id": s.user_id,
                "table_id": s.table_id,
                "start_time": s.start_time
            }
            for s in sessions
        ]
    finally:
        db.close()

@router.post("/sessions/{session_id}/force-end")
def force_end_session(session_id: int):
    db = SessionLocal()
    
    try:
        session = db.query(StudySession).filter(
            StudySession.id == session_id,
            StudySession.end_time == None
        ).first()
        
        if not session: 
            raise HTTPException(status_code=404, detail="Active session not found")
        
        session.end_time = datetime.now(timezone.utc)
        session.coins_earned = 0
        
        db.commit()
        
        return {"status": "force-ended"}
    finally:
        db.close()

@router.get("/tables")
def list_tables():
    db = SessionLocal()
    
    try:
        active_sessions = db.query(StudySession).filter(
            StudySession.end_time == None
        ).all()
        
        occupied_tables = {s.table_id for s in active_sessions}
        
        tables = []
        for table_id in range (1, TOTAL_TABLES + 1):
            tables.append({
                "table_id": table_id,
                "occupied": table_id in occupied_tables
            })
            
        return tables
    finally:
        db.close()