const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

// Load FTP config from .vscode/sftp.json
const configPath = path.join(__dirname, '..', '.vscode', 'sftp.json');
let ftpConfig = {};

try {
  ftpConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('❌ Error: Could not read .vscode/sftp.json:', error.message);
  process.exit(1);
}

async function debugFTP() {
  const client = new ftp.Client();
  
  try {
    console.log('🔌 Connecting to FTP server...');
    console.log(`   Host: ${ftpConfig.host}:${ftpConfig.port || 21}`);
    console.log(`   Username: ${ftpConfig.username}`);
    console.log(`   Protocol: ${ftpConfig.protocol || 'ftp'}\n`);
    
    const connectionConfig = {
      host: ftpConfig.host,
      port: ftpConfig.port || 21,
      user: ftpConfig.username,
      password: ftpConfig.password,
      secure: ftpConfig.protocol === 'ftps' || false,
      passive: true,
      keepalive: 10000
    };
    
    await client.access(connectionConfig);
    console.log('✅ Connected successfully!\n');
    
    // Get current working directory
    const currentDir = await client.pwd();
    console.log(`📂 Current directory: ${currentDir}\n`);
    
    // List root directory
    console.log('📋 Listing root directory (/):');
    console.log('─────────────────────────────────────────');
    try {
      await client.cd('/');
      const rootList = await client.list();
      rootList.forEach(item => {
        const type = item.isDirectory ? '📁 DIR ' : '📄 FILE';
        const size = item.isDirectory ? '' : ` (${item.size} bytes)`;
        console.log(`${type}  ${item.name}${size}`);
      });
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n─────────────────────────────────────────');
    
    // Try to navigate to the expected path
    const expectedPaths = [
      '/',
      '/files',
      '/files/domains',
      '/files/domains/gentlemanstore.rs',
      '/files/domains/gentlemanstore.rs/public_html',
      '/files/domains/gentlemanstore.rs/public_html/razvoj',
      '/files/domains/gentlemanstore.rs/public_html/razvoj/wp-content',
      '/files/domains/gentlemanstore.rs/public_html/razvoj/wp-content/themes',
      '/home/u725377976',
      '/home/u725377976/domains',
      '/home/u725377976/domains/gentlemanstore.rs',
      '/home/u725377976/domains/gentlemanstore.rs/public_html',
      '/home/u725377976/domains/gentlemanstore.rs/public_html/razvoj',
      '/home/u725377976/domains/gentlemanstore.rs/public_html/razvoj/wp-content',
      '/home/u725377976/domains/gentlemanstore.rs/public_html/razvoj/wp-content/themes',
      'domains',
      'domains/gentlemanstore.rs',
      'domains/gentlemanstore.rs/public_html',
      'domains/gentlemanstore.rs/public_html/razvoj',
      'domains/gentlemanstore.rs/public_html/razvoj/wp-content',
      'domains/gentlemanstore.rs/public_html/razvoj/wp-content/themes'
    ];
    
    console.log('\n🔍 Testing different paths:');
    console.log('─────────────────────────────────────────');
    
    for (const testPath of expectedPaths) {
      try {
        await client.cd(testPath);
        const dir = await client.pwd();
        const list = await client.list();
        const dirs = list.filter(item => item.isDirectory).map(item => item.name);
        const files = list.filter(item => !item.isDirectory).map(item => item.name);
        
        console.log(`\n✅ Path exists: ${testPath}`);
        console.log(`   Full path: ${dir}`);
        console.log(`   Directories (${dirs.length}): ${dirs.slice(0, 5).join(', ')}${dirs.length > 5 ? '...' : ''}`);
        console.log(`   Files (${files.length}): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        
        // Check if hub-child exists
        if (dirs.includes('hub-child')) {
          console.log(`   ⭐ hub-child directory FOUND!`);
        }
        if (dirs.includes('hub')) {
          console.log(`   📦 hub directory found`);
        }
        
        // Go back to root for next test
        await client.cd('/');
      } catch (error) {
        console.log(`\n❌ Path not accessible: ${testPath}`);
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Check what remotePath from config points to
    console.log('\n\n📋 Testing remotePath from config:');
    console.log('─────────────────────────────────────────');
    const configRemotePath = ftpConfig.remotePath || '';
    console.log(`Config remotePath: ${configRemotePath}`);
    
    try {
      await client.cd(configRemotePath);
      const dir = await client.pwd();
      const list = await client.list();
      console.log(`✅ Config path is accessible!`);
      console.log(`   Full path: ${dir}`);
      console.log(`   Items: ${list.length}`);
      list.slice(0, 10).forEach(item => {
        console.log(`   ${item.isDirectory ? '📁' : '📄'} ${item.name}`);
      });
    } catch (error) {
      console.log(`❌ Config remotePath is NOT accessible`);
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n\n✅ Debug complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    client.close();
    console.log('\n🔌 Disconnected from FTP server');
  }
}

// Run the debug
debugFTP();

