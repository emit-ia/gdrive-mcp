#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Google Drive MCP Server Installation\n');

// Check if we're in the project directory
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n🔨 Building the project...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('\n📋 Setting up environment configuration...');
  
  // Check if .env exists, if not copy from example
  if (!fs.existsSync('.env')) {
    if (fs.existsSync('env.example')) {
      fs.copyFileSync('env.example', '.env');
      console.log('✅ Created .env file from env.example');
    } else {
      console.log('⚠️  No env.example found, please create .env manually');
    }
  } else {
    console.log('✅ .env file already exists');
  }

  console.log('\n🎉 Installation completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Configure your .env file with Google Drive API credentials');
  console.log('2. Follow the SETUP-GUIDE.md for detailed configuration instructions');
  console.log('3. Run "npm start" or "node dist/index.js" to start the server');
  console.log('\n📖 For detailed setup instructions, see SETUP-GUIDE.md');

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  console.log('\n🔧 Try running these commands manually:');
  console.log('  npm install');
  console.log('  npm run build');
  process.exit(1);
} 