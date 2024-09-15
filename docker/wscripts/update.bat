@echo off

docker compose -f "%~dp0/../dev.yml" down --rmi all
cd "%~dp0/../../"
git pull
pause