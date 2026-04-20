@echo off
setlocal

pushd "%~dp0"
call npm.cmd run preview -- --host 0.0.0.0
popd

endlocal
