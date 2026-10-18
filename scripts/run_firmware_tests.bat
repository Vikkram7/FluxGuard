@echo off
echo ====================================================
echo Building and Running C Firmware Host Test Suite...
echo ====================================================
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d %~dp0..\firmware
cmake -B build
cmake --build build --config Release
.\build\test_firmware_core.exe
