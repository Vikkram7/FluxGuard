@echo off
echo ====================================================
echo Starting FluxGuard PMSM React Dashboard...
echo ====================================================
cd /d %~dp0..\frontend
npm.cmd run dev
