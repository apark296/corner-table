# schemas/gift.py

# import
from pydantic import BaseModel, Field
from datetime import datetime

class GiftCreateRequest(BaseModel):
    from_user_id: int = Field(..., example=1)
    to_user_id: int = Field(..., example=2)
    gift_type: str = Field(..., example="coffee")

class GiftCreateResponse(BaseModel):
    status: str
    remaining_coins: int

class GiftResponse(BaseModel):
    id: int
    from_user_id: int
    to_user_id: int
    gift_type: str
    
    class Config:
        orm_mode = True
