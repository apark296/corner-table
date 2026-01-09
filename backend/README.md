# Corner Table – Backend v1

Backend service for a virtual silent study space inspired by Korean study cafés.

## Features
- User creation and persistent state
- Virtual tables with occupancy validation
- One active study session per user
- Time-based coin economy
- Gift system between users
- Admin/debug endpoints for testing

## Tech Stack
- FastAPI
- PostgreSQL
- SQLAlchemy

## Running locally
1. Create virtual environment
2. Install dependencies:
   pip install -r requirements.txt
3. Run server:
   uvicorn main:app --reload

