# Corner Table

A virtual silent study space inspired by Korean study cafés. Users book virtual tables, study for a fixed time, and earn coins. The system is designed to generate behavioral data for future ML optimisation.

## Stack
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: React Native (Expo)

## Running locally

**Backend** — from the project root (requires Docker):
```bash
docker compose up --build
```
API runs at `http://localhost:8000/docs`.

**Frontend** — from `frontend/corner-table-app`:
```bash
npm install
npx expo start
```
Press `w` for web or `i` for iOS simulator.
