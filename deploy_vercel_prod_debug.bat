@echo off
setlocal
pushd "%~dp0"
call npx.cmd vercel@latest --prod --archive=tgz --logs --debug
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
