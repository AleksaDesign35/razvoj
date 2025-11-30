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

async function testUpload() {
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
    
    // Test different paths
    const basePath = ftpConfig.remotePath || '/public_html/razvoj/wp-content/themes/';
    const testPath = basePath.endsWith('/') ? basePath + 'hub-child' : basePath + '/hub-child';
    
    console.log(`📁 Base path from config: ${basePath}`);
    console.log(`📁 Test path (base + hub-child): ${testPath}\n`);
    
    // Create test file
    const testFileName = 'TEST-UPLOAD-' + Date.now() + '.txt';
    const testFilePath = path.join(__dirname, testFileName);
    fs.writeFileSync(testFilePath, `Test upload at ${new Date().toISOString()}\nPath: ${testPath}/${testFileName}`);
    
    console.log(`📝 Created test file: ${testFileName}`);
    console.log(`📤 Uploading to: ${testPath}/${testFileName}\n`);
    
    // Try to upload
    try {
      await client.ensureDir(testPath);
      console.log(`✅ Directory exists/created: ${testPath}`);
      
      const remoteFile = `${testPath}/${testFileName}`;
      await client.uploadFrom(testFilePath, remoteFile);
      console.log(`✅ File uploaded successfully!`);
      console.log(`   Remote path: ${remoteFile}\n`);
      
      // Verify file exists
      console.log('🔍 Verifying upload...');
      await client.cd(testPath);
      const files = await client.list();
      const uploadedFile = files.find(f => f.name === testFileName);
      
      if (uploadedFile) {
        console.log(`✅ File found in directory!`);
        console.log(`   Name: ${uploadedFile.name}`);
        console.log(`   Size: ${uploadedFile.size} bytes`);
        console.log(`   Date: ${uploadedFile.rawModifiedAt || 'N/A'}\n`);
      } else {
        console.log(`⚠️  File not found in directory listing\n`);
      }
      
      // Try to read the file back
      try {
        const downloadPath = path.join(__dirname, 'DOWNLOADED-' + testFileName);
        await client.downloadTo(downloadPath, remoteFile);
        const content = fs.readFileSync(downloadPath, 'utf8');
        console.log(`✅ File can be downloaded back!`);
        console.log(`   Content: ${content.trim()}\n`);
        fs.unlinkSync(downloadPath);
      } catch (error) {
        console.log(`❌ Could not download file back: ${error.message}\n`);
      }
      
      // Try to delete test file
      try {
        await client.remove(remoteFile);
        console.log(`🗑️  Test file deleted from server\n`);
      } catch (error) {
        console.log(`⚠️  Could not delete test file: ${error.message}\n`);
      }
      
    } catch (error) {
      console.error(`❌ Upload failed: ${error.message}`);
      console.error(error);
    }
    
    // Clean up local test file
    try {
      fs.unlinkSync(testFilePath);
    } catch (e) {}
    
    // Test current working directory
    console.log('\n📂 Current working directory:');
    const pwd = await client.pwd();
    console.log(`   ${pwd}\n`);
    
    // List what's in the themes directory
    console.log('📋 Contents of themes directory:');
    try {
      await client.cd(basePath);
      const themesList = await client.list();
      themesList.forEach(item => {
        console.log(`   ${item.isDirectory ? '📁' : '📄'} ${item.name}`);
      });
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // List what's in hub-child directory
    console.log('\n📋 Contents of hub-child directory:');
    try {
      await client.cd(testPath);
      const hubChildList = await client.list();
      if (hubChildList.length === 0) {
        console.log('   (empty)');
      } else {
        hubChildList.forEach(item => {
          console.log(`   ${item.isDirectory ? '📁' : '📄'} ${item.name}`);
        });
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    client.close();
    console.log('\n🔌 Disconnected from FTP server');
  }
}

testUpload();

