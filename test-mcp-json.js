import { spawn } from 'child_process';

async function testMCPServer() {
    console.log('🔧 Testing MCP Server JSON Response...\n');
    
    return new Promise((resolve, reject) => {
        // Start the MCP server
        const serverProcess = spawn('node', ['dist/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdoutData = '';
        let stderrData = '';
        
        // Collect stdout (should only contain JSON)
        serverProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });
        
        // Collect stderr (should contain log messages)
        serverProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        
        // Send an initialize request
        const initializeRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                    name: "test",
                    version: "1.0"
                }
            }
        };
        
        setTimeout(() => {
            console.log('📤 Sending initialize request...');
            serverProcess.stdin.write(JSON.stringify(initializeRequest) + '\n');
            
            setTimeout(() => {
                console.log('⏹️  Stopping server...\n');
                serverProcess.kill('SIGTERM');
                
                console.log('📊 RESULTS:\n');
                
                console.log('🟢 STDERR (Log Messages):');
                console.log(stderrData || '(no stderr output)');
                console.log('\n🔵 STDOUT (JSON Protocol):');
                console.log(stdoutData || '(no stdout output)');
                
                // Analyze the results
                console.log('\n📋 ANALYSIS:');
                
                const hasLogPollution = stdoutData.includes('[') && !stdoutData.startsWith('{');
                const hasProperLogging = stderrData.includes('CONFIG') || stderrData.includes('INFO');
                
                if (hasLogPollution) {
                    console.log('❌ STDOUT contains log pollution! This will break Claude Desktop.');
                    console.log('   Found non-JSON content in stdout:');
                    console.log('   ' + stdoutData.split('\n')[0]);
                } else {
                    console.log('✅ STDOUT is clean - no log pollution detected');
                }
                
                if (hasProperLogging) {
                    console.log('✅ Logging properly redirected to STDERR');
                } else {
                    console.log('⚠️  No log messages detected in STDERR');
                }
                
                // Try to parse JSON from stdout
                try {
                    if (stdoutData.trim()) {
                        const lines = stdoutData.trim().split('\n');
                        for (const line of lines) {
                            if (line.trim()) {
                                JSON.parse(line);
                                console.log('✅ Valid JSON response found in STDOUT');
                                break;
                            }
                        }
                    }
                } catch (error) {
                    console.log('❌ Invalid JSON in STDOUT:', error.message);
                }
                
                console.log('\n🎯 CONCLUSION:');
                if (!hasLogPollution && hasProperLogging) {
                    console.log('✅ MCP server is ready for Claude Desktop!');
                    console.log('   All log messages go to STDERR, JSON protocol on STDOUT');
                } else {
                    console.log('❌ MCP server needs fixes before Claude Desktop will work');
                }
                
                resolve();
            }, 2000);
        }, 1000);
        
        serverProcess.on('error', (error) => {
            console.error('Server error:', error);
            reject(error);
        });
    });
}

testMCPServer().catch(console.error); 