# schemas/user.py

# imports
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    id: int
    coins: int
    
    class Config:
        orm_mode = True

class UserPublic(UserBase):
    id: int
    coins: int
    is_studying: bool
    
    class Config:
        orm_mode = True

class ActiveSession(BaseModel):
    session_id: int
    table_id: int
    start_time: datetime

class UserState(UserBase):
    is_studying: bool
    active_session: Optional[ActiveSession]

class UserCreateResponse(BaseModel):
    id: int
    name: str
    coins: int

class UserDeactivateResponse(BaseModel):
    status: str