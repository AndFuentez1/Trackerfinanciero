@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo DESPLIEGUE AUTOMATICO - TRACKER FINANCIERO
echo SISTEMA CONTROLADO - INGENIERO SENIOR
echo ===================================================
echo.

goto :parseMode

:parseMode
set "MODE=%~1"
if "%MODE%"=="" set "MODE=all"
if /I "%MODE%"=="front" goto deployFront
if /I "%MODE%"=="back" goto deployBack
if /I "%MODE%"=="all" goto deployAll

echo Modo de despliegue no valido: %MODE%
echo Uso: DEPLOY_NOW.bat ^[front^|back^|all^
exit /b 1

:deployAll
call :deployFront
call :deployBack
goto :end

:deployFront
echo [FRONT] Desplegando front-end...
cd /d "%~dp0"
if not exist ".git" (
    echo    ❌ No se detecta repositorio Git en la raiz.
    goto :end
)
echo    Instalando dependencias del front...
npm install
if %errorlevel% neq 0 (
    echo    ❌ npm install falló en el front.
    goto :end
)
echo    Ejecutando npm run deploy...
npm run deploy
if %errorlevel% neq 0 (
    echo    ❌ npm run deploy falló en el front.
    goto :end
)
call :commitAndPush "%~dp0" origin main
goto :end

:deployBack
echo [BACK] Desplegando back-end...
if not exist "backend\.git" (
    echo    ⚠ No se detecta repositorio Git en backend. Se omite deploy back.
    goto :end
)
pushd backend >nul 2>&1
set "ROOT_REMOTE="
for /f "delims=" %%R in ('git -C "%~dp0" remote get-url origin 2^>nul') do set "ROOT_REMOTE=%%R"
if not defined ROOT_REMOTE (
    echo    ⚠ No se pudo obtener el remote origin desde la raiz.
) else (
    git remote get-url origin >nul 2>&1
    if %errorlevel% neq 0 (
        echo    ⚠ origin no configurado en backend, agregando desde la raiz...
        git remote add origin "!ROOT_REMOTE!"
    )
)
call :commitAndPush "%CD%" origin main
popd >nul 2>&1
goto :end

:commitAndPush
set "TARGET_DIR=%~1"
set "REMOTE=%~2"
set "BRANCH=%~3"

echo    Carpeta: %TARGET_DIR%
cd /d "%TARGET_DIR%"
for /f "delims=" %%C in ('git status --porcelain') do set "HAS_CHANGES=1"
if defined HAS_CHANGES (
    git add .
    git commit -m "Deploy automatico (Render Ready) - %date% %time%" >nul 2>&1
    if %errorlevel% neq 0 echo    ⚠ No se creó commit o no había cambios nuevos.
) else (
    echo    No hay cambios para commitear.
)
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if /I not "%CURRENT_BRANCH%"=="%BRANCH%" (
    git branch -M %BRANCH%
)
git push -u %REMOTE% %BRANCH%
if %errorlevel% neq 0 (
    echo    ❌ Error al subir %TARGET_DIR% a %REMOTE% %BRANCH%
) else (
    echo    ✅ Push correcto para %TARGET_DIR% a %REMOTE% %BRANCH%
)
set "HAS_CHANGES="
set "CURRENT_BRANCH="
exit /b 0

:end
endlocal
exit /b 0
