@echo off
rem Lance Mon Emploi du Temps et l'ouvre dans le navigateur (http://localhost:8000)
chcp 65001 >nul
cd /d "%~dp0"

if not exist node_modules (
  echo Installation des dependances du frontend...
  call npm install || goto :erreur
)
echo Compilation du frontend...
call npm run build || goto :erreur

if not exist backend\.venv (
  echo Creation de l'environnement Python...
  python -m venv backend\.venv || goto :erreur
)
echo Verification des dependances Python...
backend\.venv\Scripts\python -m pip install -q -r backend\requirements.txt || goto :erreur

rem Ouvre le navigateur 3 secondes apres le demarrage du serveur
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8000"

echo.
echo  Application : http://localhost:8000
echo  API (doc)   : http://localhost:8000/docs
echo  Fermez cette fenetre (ou Ctrl+C) pour arreter le serveur.
echo.
cd backend
.venv\Scripts\python -m uvicorn app.main:app --port 8000
goto :eof

:erreur
echo.
echo Une erreur est survenue. Lisez le message ci-dessus.
pause
