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

## Running with Docker (recommended)

From the project root:
```bash
docker compose up --build
```

API will be at `http://localhost:8000` and interactive docs at `http://localhost:8000/docs`.

## Running locally

1. Create virtual environment and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Make sure PostgreSQL is running with a `corner_table` database, then:
   ```bash
   uvicorn main:app --reload
   ```
   Set `DATABASE_URL` env var if your Postgres credentials differ from the default (`postgres/postgres`).
