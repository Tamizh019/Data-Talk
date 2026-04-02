@echo off
echo ==============================================
echo   STARTING RAG PROJECT: BACKEND + FRONTEND
echo ==============================================

:: Start the Backend in a new command window
echo Starting FastAPI Backend...
start "RAG Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Start the Frontend in a new command window
echo Starting Next.js Frontend...
start "RAG Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo - Frontend running at: http://localhost:3000
echo - Backend running at:  http://localhost:8000
echo.
pause
