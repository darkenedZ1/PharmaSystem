@echo off
title SmartBiz Pro - Starting...
echo ========================================
echo   SmartBiz Pro Development Server
echo ========================================
echo.

echo [1/3] Starting PostgreSQL...
net start postgresql-x64-17 >nul 2>&1
echo PostgreSQL: OK

echo [2/3] Starting API server...
start "SmartBiz API :3001" cmd /k "set DATABASE_URL=postgresql://postgres:password@localhost:5432/pharmacy_saas && set REDIS_URL=redis://localhost:6379 && set JWT_SECRET=pharma-saas-dev-secret-key-2024-do-not-use-in-production && set JWT_EXPIRES_IN=15m && set JWT_REFRESH_EXPIRES_IN=30d && set API_PORT=3001 && set NODE_ENV=development && set ENCRYPTION_KEY=0123456789abcdef0123456789abcdef && set META_WHATSAPP_TOKEN=dev-token && set META_WHATSAPP_PHONE_ID=dev-phone-id && set META_WHATSAPP_VERIFY_TOKEN=dev-verify && set NEXT_PUBLIC_APP_URL=http://localhost:3000 && cd /d D:\Softwares\Pharmacy\apps\api && node dist\apps\api\src\main.js"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Web app...
start "SmartBiz Web :3000" cmd /k "set NEXT_PUBLIC_API_URL=http://localhost:3001&& set NEXT_PUBLIC_APP_URL=http://localhost:3000&& set PATH=C:\Program Files\nodejs;C:\Users\7eesh\AppData\Roaming\npm;%PATH%&& cd /d D:\Softwares\Pharmacy\apps\web&& pnpm exec next dev"

echo.
echo ========================================
echo   SmartBiz Pro is starting!
echo   Web: http://localhost:3000
echo   API: http://localhost:3001
echo   Docs: http://localhost:3001/api/docs
echo   
echo   Login: admin@demo.com / Admin@123
echo ========================================
start http://localhost:3000
