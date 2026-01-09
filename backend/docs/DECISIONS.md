# Backend Design Decisions – v1

This document records key architectural decisions made during the initial backend implementation.
The focus of this version was correctness, clarity, and extensibility, not scale or UI.

## Why FastAPI
Chosen for its simplicity, type hints, and automatic OpenAPI documentation, which supports rapid iteration and frontend integration.

## Why PostgreSQL
Used instead of MongoDB to ensure transactional integrity for:
- session lifecycle
- coin economy
- gifting logic

These operations require atomic updates and consistency guarantees.

## Backend as Source of Truth
The frontend is treated as stateless.
All critical state (sessions, coins, table occupancy) is enforced by the backend to prevent abuse and inconsistency.

## Session-Based Coin Economy
Coins are awarded only when a study session ends, based on time spent.
This avoids manipulation and simplifies auditing.
Coins are stored explicitly on the user for efficiency and clarity.

## Single Active Session Constraint
Each user and table can only have one active session at a time.
This mirrors real-world study café constraints and simplifies reasoning about state (occupancy logic, frontend state, future analytics)

## Scope Control in v1
To avoid premature complexity:
- tables are modeled as a fixed range instead of database entities (20 tables)
- rooms and layouts are intentionally omitted
- no real-time or ML logic is included yet

This keeps v1 focused on core behavior and clean data generation.

## Future Extensions
The system is intentionally designed to support:
- rooms and table positioning
- real-life presence
- behavioral data collection
- ML-based analysis of spatial preferences (e.g. corner vs non-corner tables)
