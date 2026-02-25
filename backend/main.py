# main.py

# imports
from fastapi import FastAPI
from database import engine
from models import Base
from routers import sessions, users, gifts

Base.metadata.create_all(bind=engine)


app = FastAPI()


app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(gifts.router)