# razvoj
Gentleman Store Razvoj

## FTP Watcher

Automatski upload WordPress child tema fajlova na staging server kroz FTP.

### Instalacija

```bash
npm install
```

### Konfiguracija

Watcher direktno koristi konfiguraciju iz `.vscode/sftp.json` fajla:
- `host` - FTP server hostname ili IP adresa
- `port` - FTP port (default: 21)
- `protocol` - Protokol: "ftp" ili "ftps"
- `username` - FTP korisničko ime
- `password` - FTP lozinka
- `remotePath` - Remote putanja gdje se tema uploaduje

**Primjer konfiguracije u `.vscode/sftp.json`:**
```json
{
  "host": "147.93.49.19",
  "protocol": "ftp",
  "port": 21,
  "username": "u725377976.aleksa99",
  "password": "your_password",
  "remotePath": "/home/u725377976/domains/gentlemanstore.rs/public_html/razvoj/wp-content/themes/"
}
```

**Napomena:** 
- Password može biti u `.vscode/sftp.json` fajlu ili u `.env` fajlu kao `FTP_PASSWORD`
- Watcher prati `hub-child` direktorij i uploaduje sve promjene na server
- Fajlovi se uploaduju u `{remotePath}hub-child/` na serveru

### Korišćenje

Pokreni watcher komandom:

```bash
npm run ftp:watch
```

Watcher će automatski:
- Pratiti promjene u `hub-child` direktoriju
- Uploadovati nove i promijenjene fajlove
- Obrisati fajlove kada se obrišu lokalno
- Kreirati direktorije kada su potrebni

### Zaustavljanje

Pritisni `Ctrl+C` za zaustavljanje watchera.
