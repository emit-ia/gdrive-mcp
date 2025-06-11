import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

function setupClaudeConfig() {
    console.log('🔧 Setting up Claude Desktop Configuration...\n');
    
    // Check if all required credentials are present
    const requiredVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET', 
        'GOOGLE_REFRESH_TOKEN',
        'GOOGLE_SERVICE_ACCOUNT_EMAIL',
        'GOOGLE_PRIVATE_KEY'
    ];
    
    console.log('📋 Checking environment variables...');
    const missingVars = [];
    
    for (const varName of requiredVars) {
        const value = process.env[varName];
        if (!value) {
            missingVars.push(varName);
            console.log(`❌ ${varName}: Missing`);
        } else {
            console.log(`✅ ${varName}: Present (${value.length} characters)`);
        }
    }
    
    if (missingVars.length > 0) {
        console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
        console.log('💡 Please ensure your .env file contains all required credentials.');
        return;
    }
    
    console.log('\n✅ All credentials found! Generating Claude Desktop configuration...\n');
    
    // Create the configuration object
    const config = {
        mcpServers: {
            "google-drive-gmail": {
                command: "node",
                args: ["C:\\\\Users\\\\IgorAlmeida\\\\Documents\\\\GitHub\\\\gdrive-mcp\\\\dist\\\\index.js"],
                env: {
                    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
                    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
                    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
                    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
                }
            }
        }
    };
    
    // Write the configuration file
    const configJson = JSON.stringify(config, null, 2);
    const configPath = path.join(__dirname, 'claude_desktop_config_ready.json');
    
    fs.writeFileSync(configPath, configJson);
    
    console.log(`✅ Configuration written to: ${configPath}\n`);
    
    // Display instructions
    console.log('📋 NEXT STEPS:\n');
    console.log('1. 📁 Copy the generated configuration to Claude Desktop:');
    console.log('   Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
    console.log('   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
    console.log('   Linux: ~/.config/claude/claude_desktop_config.json\n');
    
    console.log('2. 🔄 Restart Claude Desktop\n');
    
    console.log('3. ✅ Your MCP server will be available with these tools:');
    console.log('   📁 Google Drive: list_files, get_file, create_file, upload_file, etc.');
    console.log('   📧 Gmail: send_message, list_messages, search_messages, get_profile, etc.');
    console.log('   🔧 Token Management: gmail_check_token_status, gmail_refresh_token\n');
    
    // Show the actual config path for easy copying
    console.log('💡 TIP: You can copy the config file with:');
    console.log(`   copy "${configPath}" "%APPDATA%\\Claude\\claude_desktop_config.json"\n`);
    
    console.log('🎉 Claude Desktop configuration is ready!');
    console.log('📖 For more details, see: HYBRID-AUTH-SETUP.md');
}

setupClaudeConfig(); 