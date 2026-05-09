@echo off
echo =================================
echo   마이의 일본어 카라오케 앱
echo   GitHub 업로드 시작!
echo =================================
echo.

echo [1/6] 임시 폴더 준비 중...
set TEMP_DIR=%USERPROFILE%\Desktop\mai-karaoke-temp
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

echo [2/6] 파일 복사 중... (node_modules 제외)
set SRC=%~dp0
robocopy "%SRC%" "%TEMP_DIR%" /E /XD node_modules .git .next /XF *.log
echo     완료!

echo.
echo [3/6] Git 초기화 중...
cd /d "%TEMP_DIR%"
git init -b main
git config user.email "sugoii77@gmail.com"
git config user.name "sugoii77-rgb"

echo.
echo [4/6] 파일 추가 중...
git add .

echo.
echo [5/6] 커밋 중...
git commit -m "마이의 일본어 카라오케 앱 - 초기 배포"

echo.
echo [6/6] GitHub에 업로드 중...
git remote add origin https://github.com/sugoii77-rgb/mai-japanese-karaoke.git
git push -u origin main

echo.
echo =================================
echo   완료! Vercel이 자동 배포 시작!
echo   임시 폴더 정리 중...
echo =================================
cd /d "%USERPROFILE%"
rmdir /s /q "%TEMP_DIR%"
echo   정리 완료!
pause
