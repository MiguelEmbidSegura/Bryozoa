@echo off
setlocal
pushd "%~dp0"
call npx.cmd vercel@latest %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
