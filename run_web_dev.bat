@echo off
setlocal

pushd "%~dp0"
call npm.cmd run dev
popd

endlocal
