@echo off
echo ===================================================
echo 🚀 DESPLIEGUE AUTOMATICO - TRACKER FINANCIERO
echo 👨‍💻 SISTEMA CONTROLADO - INGENIERO SENIOR
echo ===================================================
echo.

cd backend

echo [1/4] Verificando repositorio local...
if not exist .git (
    echo    Inicializando Git...
    git init
    git add .
    git commit -m "Initial commit"
)

echo.
echo [2/4] Verificando repositorio remoto...
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo    ⚠️ ALERTA: No hay repositorio remoto configurado.
    echo.
    echo    Para desplegar en RENDER (Gratuito), primero debes subir tu codigo a GitHub.
    echo    1. Crea un repositorio vacio en https://github.com/new
    echo    2. Copia la URL del repositorio (termina en .git)
    echo.
    set /p REPO_URL="Pegue la URL de GitHub aqui y presione Enter: "
    
    if "%REPO_URL%"=="" (
        echo    ❌ Error: No ingresaste ninguna URL. Abortando.
        pause
        exit /b
    )
    
    git remote add origin %REPO_URL%
    git branch -M main
    echo    ✅ Repositorio configurado exitosamente.
)

echo.
echo [3/4] Guardando cambios locales...
git add .
git commit -m "Deploy automatico (Render Ready) - %date% %time%" >nul 2>&1

echo.
echo [4/4] Enviando código a GitHub...
echo    ⏳ Esto subira tu codigo para que Render lo detecte...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo    ❌ ERROR AL SUBIR CODIGO.
    echo    Verifica tus credenciales de GitHub o que la repo este vacia.
) else (
    echo.
    echo    ✅ ¡CODIGO EN LA NUBE!
    echo    Siguiente paso: Conectar este repositorio en Render.com
)

echo.
echo ===================================================
pause
