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

async function uploadFile() {
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
    const localFilePath = path.join(__dirname, '..', 'hub-child', 'index.html');
    
    if (!fs.existsSync(localFilePath)) {
      console.error(`❌ Local file not found: ${localFilePath}`);
      process.exit(1);
    }
    
    const remoteFilePath = `${hubChildPath}/index.html`;
    
    console.log(`📁 Local file: ${localFilePath}`);
    console.log(`📁 Remote file: ${remoteFilePath}\n`);
    
    // Ensure directory exists
    await client.ensureDir(hubChildPath);
    console.log(`✅ Directory ready: ${hubChildPath}\n`);
    
    // Upload file
    console.log('📤 Uploading index.html...');
    await client.uploadFrom(localFilePath, remoteFilePath);
    console.log(`✅ File uploaded successfully!\n`);
    
    // Verify
    await client.cd(hubChildPath);
    const files = await client.list();
    const uploaded = files.find(f => f.name === 'index.html');
    
    if (uploaded) {
      console.log('✅ Verification: File exists on server');
      console.log(`   Size: ${uploaded.size} bytes`);
      console.log(`   Modified: ${uploaded.rawModifiedAt ? new Date(uploaded.rawModifiedAt).toLocaleString() : 'N/A'}\n`);
    }
    
    console.log('✅ Upload complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    client.close();
    console.log('\n🔌 Disconnected from FTP server');
  }
}

uploadFile();

