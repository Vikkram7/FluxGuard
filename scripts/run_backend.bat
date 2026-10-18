@echo off
echo ====================================================
echo Starting FluxGuard PMSM Spring Boot Backend...
echo ====================================================
cd /d %~dp0..\backend
mvn spring-boot:run
