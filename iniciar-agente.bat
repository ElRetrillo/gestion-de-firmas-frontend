@echo off
title Agente Ghost App - Telemetria USB Coquimbo
echo ========================================================
echo   Iniciando Agente de Telemetria de Token USB (Local)
echo   Ilustre Municipalidad de Coquimbo
echo ========================================================
echo.
cd /d "C:\Users\Daniel UCN\gestion-de-firmas\ghost-app"
node main.js
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Hubo un problema al iniciar el agente.
  pause
)
