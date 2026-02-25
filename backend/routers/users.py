# routers/users.py

# imports
from fastapi import APIRouter, HTTPException
from database import SessionLocal
from models import User, StudySession, Gift
from schemas.user import (
    UserBase, 
    UserPublic, 
    ActiveSession, 
    UserState, 
    UserCreateResponse, 
    UserDeactivateResponse)

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserCreateResponse)
def create_user(name: str):
    db = SessionLocal()
    try:
        user = User(name=name, coins=0)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    finally:
        db.close()

@router.post("/{user_id}/deactivate", response_model=UserDeactivateResponse)
def deactivate_user(user_id: int): 
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
            ).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        active_session = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.end_time == None
        ).first()
        
        if active_session:
            raise HTTPException(status_code=400, detail="Cannot deactivate user with active session")
        
        user.is_active = False
        db.commit()
        
        return {"status": "deactivated"}
    finally:
        db.close()

@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
            ).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        active_session = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.end_time == None
        ).first()
        
        user.is_studying = active_session is not None
        return user
    finally:
        db.close()

@router.get("/{user_id}/state", response_model=UserState)
def get_user_state(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
            ).first()
        
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
    finally:
        db.close()
    
@router.post("/{user_id}/add-coins")
def add_coins(user_id: int, amount: int):
    db = SessionLocal()
    try:
        if amount <= 0:
            raise HTTPException(400, "Amount must be positive")

        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
            ).first()
        if not user:
            raise HTTPException(404, "User not found")

        user.coins += amount
        db.commit()

        return {
            "user_id": user.id,
            "new_balance": user.coins
        }
    finally:
        db.close()

@router.get("/{user_id}/gifts")
def get_received_gifts(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(404, "User not found")
        
        gifts = db.query(Gift).filter(
            Gift.to_user_id == user_id
        ).order_by(Gift.created_at.desc()).all()
        
        return gifts
    finally:
        db.close()