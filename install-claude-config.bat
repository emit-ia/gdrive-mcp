@echo off
echo.
echo 🔧 Installing Claude Desktop MCP Configuration...
echo.

REM Create the Claude config directory if it doesn't exist
if not exist "%APPDATA%\Claude" (
    echo 📁 Creating Claude config directory...
    mkdir "%APPDATA%\Claude"
)

REM Copy the configuration file
echo 📋 Copying configuration file...
copy "claude_desktop_config_ready.json" "%APPDATA%\Claude\claude_desktop_config.json"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Configuration installed successfully!
    echo.
    echo 📍 Location: %APPDATA%\Claude\claude_desktop_config.json
    echo.
    echo 🔄 NEXT STEPS:
    echo 1. Restart Claude Desktop
    echo 2. Your Google Drive + Gmail MCP server will be available
    echo.
    echo 🎯 Available Tools:
    echo   📁 Google Drive: list_files, get_file, create_file, upload_file
    echo   📧 Gmail: send_message, list_messages, search_messages
    echo   🔧 Token Management: gmail_check_token_status, gmail_refresh_token
    echo.
    echo 🎉 Setup complete!
) else (
    echo.
    echo ❌ Installation failed!
    echo 💡 Try running as administrator or copy manually to:
    echo    %APPDATA%\Claude\claude_desktop_config.json
)

echo.
pause 