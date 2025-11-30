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

async function listFiles() {
  const client = new ftp.Client();
  
  try {
    console.log('🔌 Connecting to FTP server...\n');
    
    await client.access({
      host: ftpConfig.host,
      port: ftpConfig.port || 21,
      user: ftpConfig.username,
      password: ftpConfig.password,
      secure: ftpConfig.protocol === 'ftps' || false,
      passive: true
    });
    
    console.log('✅ Connected successfully!\n');
    
    const basePath = ftpConfig.remotePath || '/public_html/razvoj/wp-content/themes/';
    const hubChildPath = basePath.endsWith('/') ? basePath + 'hub-child' : basePath + '/hub-child';
    
    console.log(`📁 Listing files in: ${hubChildPath}\n`);
    console.log('─────────────────────────────────────────\n');
    
    await client.cd(hubChildPath);
    const files = await client.list();
    
    if (files.length === 0) {
      console.log('   (directory is empty)\n');
    } else {
      files.forEach(item => {
        const size = item.isDirectory ? '' : ` (${item.size} bytes)`;
        const date = item.rawModifiedAt ? new Date(item.rawModifiedAt).toLocaleString() : 'N/A';
        console.log(`${item.isDirectory ? '📁' : '📄'} ${item.name}${size}`);
        if (!item.isDirectory) {
          console.log(`   Modified: ${date}`);
        }
      });
    }
    
    console.log('\n─────────────────────────────────────────\n');
    
    // Check for index.html specifically
    const indexHtml = files.find(f => f.name === 'index.html');
    if (indexHtml) {
      console.log('✅ index.html found!');
      console.log(`   Size: ${indexHtml.size} bytes`);
      console.log(`   Modified: ${indexHtml.rawModifiedAt ? new Date(indexHtml.rawModifiedAt).toLocaleString() : 'N/A'}\n`);
    } else {
      console.log('❌ index.html NOT found in hub-child directory\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    client.close();
    console.log('🔌 Disconnected from FTP server');
  }
}

listFiles();

