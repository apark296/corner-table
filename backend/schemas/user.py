# schemas/user.py

# imports
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    coins: int

class UserPublic(UserBase):
    id: int
    coins: int
    is_studying: bool

class ActiveSession(BaseModel):
    session_id: int
    table_id: int
    start_time: datetime

class UserState(UserBase):
    is_studying: bool
    active_session: Optional[ActiveSession]

class UserCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    coins: int

class UserDeactivateResponse(BaseModel):
    status: str
