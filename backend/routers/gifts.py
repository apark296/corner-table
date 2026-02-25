# routers.gifts.py

# imports
from fastapi import APIRouter, HTTPException
from database import SessionLocal
from models import User, Gift
from schemas.gift import GiftCreateRequest, GiftCreateResponse, GiftResponse
from typing import List

router = APIRouter()

@router.post("/gift", response_model=GiftCreateResponse)
def send_gift(payload: GiftCreateRequest, cost: int = 5):
    db = SessionLocal()
    
    try:
        sender = db.query(User).filter(
            User.id == payload.from_user_id
            ).with_for_update().first()
        receiver = db.query(User).filter(
            User.id == payload.to_user_id
            ).first()

        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="User not found")

        if payload.from_user_id == payload.to_user_id:
            raise HTTPException(status_code=400, detail="Cannot gift yourself")

        if sender.coins < cost:
            raise HTTPException(status_code=400, detail="Not enough coins")

        sender.coins -= cost

        gift = Gift(
            from_user_id=payload.from_user_id,
            to_user_id=payload.to_user_id,
            gift_type=payload.gift_type,
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
    
    finally:
        db.close()

@router.get("/gifts/received/{user_id}", response_model=List[GiftResponse])
def get_received_gifts(user_id: int):
    db = SessionLocal()
    try:
        gifts = (
            db.query(Gift)
            .filter(Gift.to_user_id == user_id)
            .order_by(Gift.created_at.desc())
            .all()
        )
        
        return gifts
    finally: db.close()