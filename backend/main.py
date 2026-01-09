# main

# imports
from database import engine
from models import Base

Base.metadata.create_all(bind=engine)

from fastapi import FastAPI, HTTPException
from database import SessionLocal
from models import User, StudySession, Gift

from datetime import datetime, timezone

from sqlalchemy.sql import func

# macros
TOTAL_TABLES = 20

app = FastAPI()

#session
@app.post("/start-session")
def start_session(user_id: int, table_id: int):
    db = SessionLocal()
    
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
    
@app.post("/end-session")
def end_session(session_id: int):
    db = SessionLocal()

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
    
@app.get("/sessions")
def list_sessions():
    db = SessionLocal()
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

@app.get("/sessions/active")
def active_sessions():
    db = SessionLocal()
    
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

#gift
@app.post("/gift")
def send_gift(
    from_user_id: int, 
    to_user_id: int, 
    gift_type: str, 
    cost: int = 5
):
    db = SessionLocal()
    
    try:
        sender = db.query(User).filter(User.id == from_user_id).with_for_update().first()
        receiver = db.query(User).filter(User.id == to_user_id).first()

        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="User not found")

        if from_user_id == to_user_id:
            raise HTTPException(status_code=400, detail="Cannot gift yourself")

        if sender.coins < cost:
            raise HTTPException(status_code=400, detail="Not enough coins")

        sender.coins -= cost

        gift = Gift(
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            gift_type=gift_type,
            cost=cost
        )

        db.add(gift)
        db.commit()

        return {
            "status": "gift sent",
            "remaining_coins": sender.coins
        }

    except:
        db.rollback()
        raise

@app.post("/sessions/{session_id}/force-end")
def force_end_session(session_id: int):
    db = SessionLocal()
    
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

# tables    
@app.get("/tables")
def list_tables():
    db = SessionLocal()
    
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

#users
@app.post("/users")
def create_user(name: str):
    db = SessionLocal()
    
    user = User(
        name=name,
        coins=0
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "user_id": user.id,
        "name": user.name,
        "coins": user.coins
    }

@app.get("/users/{user_id}")
def get_user(user_id: int):
    db = SessionLocal()
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    active_session = db.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.end_time == None
    ).first()
    
    return {
        "user_id": user.id,
        "coins": user.coins,
        "is_studying": active_session is not None
    }

@app.get("/users/{user_id}/state")
def get_user_state(user_id: int):
    db = SessionLocal()
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    active_session = db.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.end_time == None
    ).first()
    
    return {
        "user_id": user.id,
        "coins": user.coins,
        "is_studying": active_session is not None,
        "active_session": {
            "session_id": active_session.id,
            "table_id": active_session.table_id,
            "start_time": active_session.start_time
        } if active_session else None
    }
    
@app.post("/users/{user_id}/add-coins")
def add_coins(user_id: int, amount: int):
    db = SessionLocal()

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.coins += amount
    db.commit()

    return {
        "user_id": user.id,
        "new_balance": user.coins
    }

    

# helper functions
def get_user_coins(db, user_id: int):
    sessions = db.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.end_time != None
    ).all()
    
    earned = sum(s.coins_earned for s in sessions)
    
    spent = db.query(Gift).filter(
        Gift.from_user_id == user_id
    ).with_entities(func.sum(Gift.cost)).scalar() or 0
    
    return earned - spent