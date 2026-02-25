# schemas/session.py

# imports
from pydantic import BaseModel

class StartSessionResponse(BaseModel):
    status: str
    session_id: int

# class EndSessionResponse(BaseModel):