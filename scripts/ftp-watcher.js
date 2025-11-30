
const chokidar = require('chokidar');
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

// Load FTP config from .vscode/sftp.json
const configPath = path.join(__dirname, '..', '.vscode', 'sftp.json');
let ftpConfig = {};

if (!fs.existsSync(configPath)) {
  console.error('❌ Error: .vscode/sftp.json file not found!');
  console.log('💡 Please create .vscode/sftp.json with your FTP configuration');
  process.exit(1);
}

try {
  ftpConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Debug: Show what we read from config (without showing password)
  // Debug output removed - will show in connect()
} catch (error) {
  console.error('❌ Error: Could not read .vscode/sftp.json:', error.message);
  process.exit(1);
}

// Check if protocol is FTP
if (ftpConfig.protocol && ftpConfig.protocol.toLowerCase() !== 'ftp') {
  console.warn(`⚠️  Warning: Protocol is set to "${ftpConfig.protocol}" but watcher expects FTP`);
  console.warn('💡 If you need SFTP support, please use SFTP-specific watcher');
}

// Get ignore patterns from config
const defaultIgnore = [
  'node_modules/**',
  '.git/**',
  '.DS_Store',
  '*.log',
  '.vscode/**'
];

const ignorePatterns = ftpConfig.ignore ? 
  ftpConfig.ignore.map(p => p.replace(/^\*\*\//, '')) : defaultIgnore;

class FTPWatcher {
  constructor() {
    this.client = new ftp.Client();
    this.isConnected = false;
    this.uploadQueue = [];
    this.isUploading = false;
    this.connectionRetries = 0;
    this.maxConnectionRetries = 5;
    
    // Get local and remote paths from config
    this.localPath = 'hub-child';
    this.localBasePath = path.resolve(__dirname, '..', this.localPath);
    
    // Remote path - add hub-child to the remote path
    this.remoteBasePath = (ftpConfig.remotePath || '/public_html/razvoj/wp-content/themes/');
    if (!this.remoteBasePath.endsWith('/')) {
      this.remoteBasePath += '/';
    }
    this.remoteBasePath += this.localPath;
    
    // Connect to FTP server
    this.connect();
    
    // Setup file watcher
    this.setupWatcher();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.disconnect());
    process.on('SIGTERM', () => this.disconnect());
  }

  async connect() {
    try {
      console.log('🔌 Connecting to FTP server...');
      
      const password = String(ftpConfig.password || '').trim();
      const username = String(ftpConfig.username || '').trim();
      
      // Debug info (bez prikazivanja passworda)
      console.log(`📝 Connecting with:`);
      console.log(`   Username: "${username}" (length: ${username.length})`);
      console.log(`   Password: ${password ? `***${password.length} chars***` : 'NOT SET'}`);
      console.log(`   Host: ${ftpConfig.host}:${ftpConfig.port || 21}`);
      
      const connectionConfig = {
        host: ftpConfig.host,
        port: ftpConfig.port || 21,
        user: username,
        password: password,
        secure: ftpConfig.protocol === 'ftps' || false,
        secureOptions: {},
        // FTP connection options
        passive: true, // Use passive mode (required for most FTP servers)
        keepalive: 10000
      };
      
      await this.client.access(connectionConfig);
      this.isConnected = true;
      this.connectionRetries = 0;
      console.log('✅ Connected to FTP server successfully!');
      
      // Process any queued uploads
      this.processQueue();
    } catch (error) {
      this.connectionRetries++;
      
      console.error('❌ Failed to connect to FTP server:', error.message);
      
      // Don't retry on authentication errors
      if (error.message.includes('authentication') || 
          error.message.includes('password') || 
          error.message.includes('Auth') ||
          error.code === 530) {
        console.error('💡 Check your FTP credentials (username/password)');
        console.error('💡 Make sure password is set in .vscode/sftp.json');
        process.exit(1);
      }
      
      // Check retry limit
      if (this.connectionRetries >= this.maxConnectionRetries) {
        console.error(`\n❌ Failed to connect after ${this.maxConnectionRetries} attempts`);
        console.error('💡 Please check:');
        console.error('   - FTP server is accessible');
        console.error('   - Host and port are correct');
        console.error('   - Firewall/network settings allow connection');
        console.error('   - Server credentials are correct');
        process.exit(1);
      }
      
      console.log(`⚠️  Retrying connection (${this.connectionRetries}/${this.maxConnectionRetries}) in 5 seconds...`);
      setTimeout(() => this.connect(), 5000);
    }
  }

  setupWatcher() {
    console.log(`👀 Watching directory: ${this.localBasePath}`);
    
    const watcher = chokidar.watch(this.localBasePath, {
      ignored: (filePath) => {
        const relativePath = path.relative(this.localBasePath, filePath);
        return ignorePatterns.some(pattern => {
          // Simple glob pattern matching
          const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
          return regex.test(relativePath);
        });
      },
      persistent: true,
      ignoreInitial: true, // Don't upload all files on startup, only watch for changes
      awaitWriteFinish: {
        stabilityThreshold: 1000, // Wait 1 second for file to be fully written
        pollInterval: 200
      }
    });

    watcher
      .on('add', (filePath) => this.handleFileChange(filePath, 'add'))
      .on('change', (filePath) => this.handleFileChange(filePath, 'change'))
      .on('unlink', (filePath) => this.handleFileDelete(filePath))
      .on('addDir', (dirPath) => this.handleDirAdd(dirPath))
      .on('unlinkDir', (dirPath) => this.handleDirDelete(dirPath))
      .on('error', (error) => console.error('❌ Watcher error:', error))
      .on('ready', () => {
        console.log('✅ File watcher is ready!');
        console.log('📝 Watching for file changes...\n');
      });
  }

  async handleFileChange(filePath, eventType) {
    const relativePath = path.relative(this.localBasePath, filePath);
    console.log(`📝 File ${eventType}: ${relativePath}`);
    
    this.queueUpload(filePath, relativePath, 'file');
  }

  async handleFileDelete(filePath) {
    const relativePath = path.relative(this.localBasePath, filePath);
    console.log(`🗑️  File deleted: ${relativePath}`);
    
    this.queueDelete(relativePath, 'file');
  }

  async handleDirAdd(dirPath) {
    const relativePath = path.relative(this.localBasePath, dirPath);
    console.log(`📁 Directory added: ${relativePath}`);
    
    this.queueUpload(dirPath, relativePath, 'directory');
  }

  async handleDirDelete(dirPath) {
    const relativePath = path.relative(this.localBasePath, dirPath);
    console.log(`🗑️  Directory deleted: ${relativePath}`);
    
    this.queueDelete(relativePath, 'directory');
  }

  queueUpload(localPath, relativePath, type) {
    // Remove existing queue entry for this path
    this.uploadQueue = this.uploadQueue.filter(
      item => item.relativePath !== relativePath
    );
    
    // Add new upload to queue
    this.uploadQueue.push({
      localPath,
      relativePath,
      type,
      action: 'upload'
    });
    
    // Process queue if connected
    if (this.isConnected) {
      this.processQueue();
    }
  }

  queueDelete(relativePath, type) {
    // Remove any upload entries for this path
    this.uploadQueue = this.uploadQueue.filter(
      item => item.relativePath !== relativePath
    );
    
    // Add delete to queue
    this.uploadQueue.push({
      relativePath,
      type,
      action: 'delete'
    });
    
    // Process queue if connected
    if (this.isConnected) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }
    
    this.isUploading = true;
    
    while (this.uploadQueue.length > 0) {
      const item = this.uploadQueue.shift();
      
      try {
        // Ensure we're connected
        if (!this.isConnected) {
          console.log('⚠️  Reconnecting...');
          await this.connect();
        }
        
        if (item.action === 'upload') {
          await this.uploadFile(item.localPath, item.relativePath, item.type);
        } else if (item.action === 'delete') {
          await this.deleteFile(item.relativePath, item.type);
        }
      } catch (error) {
        console.error(`❌ Error processing ${item.relativePath}:`, error.message);
        
        // Reconnect if connection lost
        if (error.message.includes('not connected') || 
            error.message.includes('Connection lost') ||
            error.code === 'ECONNRESET') {
          this.isConnected = false;
          // Re-queue the item for retry after reconnection
          this.uploadQueue.unshift(item); // Add back to front of queue
          await this.connect();
        } else {
          // For other errors, re-queue but limit retries
          if (!item.retryCount) item.retryCount = 0;
          if (item.retryCount < 3) {
            item.retryCount++;
            this.uploadQueue.push(item);
            console.log(`   Will retry (${item.retryCount}/3)...`);
          } else {
            console.error(`   Max retries reached, skipping ${item.relativePath}`);
          }
        }
      }
    }
    
    this.isUploading = false;
  }

  async uploadFile(localPath, relativePath, type) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    
    // Verify local file exists (for files)
    if (type === 'file' && !fs.existsSync(localPath)) {
      throw new Error(`Local file does not exist: ${localPath}`);
    }
    
    try {
      const remotePath = path.posix.join(this.remoteBasePath, relativePath).replace(/\\/g, '/');
      const remoteDir = path.posix.dirname(remotePath);
      
      if (type === 'file') {
        // Ensure remote directory exists
        try {
          await this.client.ensureDir(remoteDir);
        } catch (mkdirError) {
          // Ignore if directory already exists or other non-critical errors
          if (!mkdirError.message.includes('exists') && 
              !mkdirError.message.includes('already') &&
              mkdirError.code !== 550) {
            throw mkdirError;
          }
        }
        
        // Remove existing file if it exists (to ensure clean overwrite)
        try {
          await this.client.remove(remotePath);
        } catch (removeError) {
          // Ignore if file doesn't exist (that's fine, we'll create it)
          if (removeError.code !== 550 && !removeError.message.includes('not found')) {
            // Only log if it's a different error
            console.warn(`   Warning: Could not remove existing file: ${removeError.message}`);
          }
        }
        
        // Upload file (this will create/overwrite the file)
        await this.client.uploadFrom(localPath, remotePath);
        
        // Verify upload by checking file size
        try {
          await this.client.cd(remoteDir);
          const files = await this.client.list();
          const uploaded = files.find(f => f.name === path.basename(remotePath));
          if (uploaded) {
            const localStats = fs.statSync(localPath);
            if (uploaded.size === localStats.size) {
              console.log(`✅ Uploaded: ${relativePath} (${uploaded.size} bytes)`);
              console.log(`   → Remote: ${remotePath}`);
            } else {
              console.warn(`⚠️  Uploaded but size mismatch: ${relativePath} (local: ${localStats.size}, remote: ${uploaded.size})`);
            }
          } else {
            console.log(`✅ Uploaded: ${relativePath}`);
            console.log(`   → Remote: ${remotePath}`);
          }
        } catch (verifyError) {
          // Verification failed but upload might have succeeded
          console.log(`✅ Uploaded: ${relativePath}`);
          console.log(`   → Remote: ${remotePath}`);
        }
      } else if (type === 'directory') {
        // For directories, ensure it exists
        try {
          await this.client.ensureDir(remotePath);
          console.log(`✅ Created directory: ${relativePath}`);
        } catch (mkdirError) {
          // Ignore if directory already exists
          if (!mkdirError.message.includes('exists') && 
              !mkdirError.message.includes('already') &&
              mkdirError.code !== 550) {
            throw mkdirError;
          }
        }
      }
    } catch (error) {
      // Check if connection was lost
      if (error.message.includes('not connected') || 
          error.code === 'ECONNRESET' ||
          error.message.includes('Connection closed')) {
        this.isConnected = false;
        throw new Error('Connection lost, will reconnect');
      }
      console.error(`❌ Failed to upload ${relativePath}:`, error.message);
      throw error;
    }
  }

  async deleteFile(relativePath, type) {
    if (!this.isConnected) {
      return;
    }
    
    try {
      const remotePath = path.posix.join(this.remoteBasePath, relativePath).replace(/\\/g, '/');
      
      if (type === 'file') {
        await this.client.remove(remotePath);
        console.log(`✅ Deleted: ${relativePath}`);
      } else if (type === 'directory') {
        // For directories, remove recursively by removing files first
        try {
          await this.client.removeDir(remotePath);
          console.log(`✅ Deleted directory: ${relativePath}`);
        } catch (error) {
          // Directory might not be empty, try to remove files first
          console.warn(`⚠️  Could not delete directory ${relativePath}:`, error.message);
        }
      }
    } catch (error) {
      if (error.message.includes('not connected') || error.code === 'ECONNRESET') {
        this.isConnected = false;
        return;
      }
      console.error(`❌ Failed to delete ${relativePath}:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    console.log('\n🛑 Disconnecting from FTP server...');
    try {
      this.client.close();
      console.log('✅ Disconnected successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error disconnecting:', error.message);
      process.exit(1);
    }
  }
}

// Validate configuration
if (!ftpConfig.username) {
  console.error('❌ Error: FTP username must be configured in .vscode/sftp.json');
  process.exit(1);
}

const password = ftpConfig.password;
if (!password) {
  console.error('❌ Error: FTP password must be configured');
  console.log('💡 Please either:');
  console.log('   1. Add "password" field to .vscode/sftp.json');
  process.exit(1);
}

// Start the watcher
console.log('🚀 Starting FTP Watcher...');
console.log(`📡 Host: ${ftpConfig.host}:${ftpConfig.port || 21}`);
console.log(`👤 Username: ${ftpConfig.username}`);
const remotePath = ftpConfig.remotePath || '/public_html/razvoj/wp-content/themes/';
console.log(`📁 Remote: ${remotePath}hub-child/ (fajlovi će se dodati u postojeći direktorij)`);
console.log(`👀 Watching: ${path.resolve(__dirname, '..', 'hub-child')}`);
console.log(`💡 Svi fajlovi iz hub-child/ će se uploadovati u ${remotePath}hub-child/ na serveru\n`);

const watcher = new FTPWatcher();
