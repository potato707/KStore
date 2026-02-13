# KStore Database Backup System

## 📦 Backup Configuration

### Automatic Backups
- **Frequency**: Every hour (at minute 0)
- **Location**: `/root/KStore_Backups/`
- **Script**: `/root/KStore/backup-database.sh`
- **Log file**: `/var/log/kstore-backup.log`

### Backup Types

#### 1. Hourly Backups
- **Location**: `/root/KStore_Backups/hourly/`
- **Retention**: Last 48 backups (2 days)
- **Naming**: `kstore_data_YYYYMMDD_HHMMSS.tar.gz`

#### 2. Daily Backups
- **Location**: `/root/KStore_Backups/daily/`
- **Retention**: Last 30 backups (1 month)
- **Naming**: `kstore_data_YYYYMMDD.tar.gz`
- **Created**: Automatically at midnight from hourly backup

## 🔧 Manual Operations

### Run backup manually
```bash
/root/KStore/backup-database.sh
```

### View backup log
```bash
tail -f /var/log/kstore-backup.log
```

### List all backups
```bash
# Hourly backups
ls -lh /root/KStore_Backups/hourly/

# Daily backups
ls -lh /root/KStore_Backups/daily/

# All backups with size
du -sh /root/KStore_Backups/*
```

### Restore from backup
```bash
# 1. Stop the application
systemctl stop kstore.service

# 2. Backup current data (just in case)
mv /root/KStore/data /root/KStore/data_old

# 3. Extract backup (replace TIMESTAMP with actual backup file)
tar -xzf /root/KStore_Backups/hourly/kstore_data_TIMESTAMP.tar.gz -C /root/KStore

# 4. Restart application
systemctl start kstore.service

# 5. Verify data
ls -la /root/KStore/data/
```

### Clean old backups manually
```bash
# Remove backups older than 7 days
find /root/KStore_Backups/hourly/ -name "*.tar.gz" -mtime +7 -delete

# Remove backups older than 60 days from daily
find /root/KStore_Backups/daily/ -name "*.tar.gz" -mtime +60 -delete
```

## 📊 Backup Contents
Each backup contains:
- `data/products.json` - All products
- `data/invoices.json` - All invoices
- `data/settings.json` - Application settings

## 🔐 Security Notes
- Backups are stored on the same server at `/root/KStore_Backups/`
- Only root user has access
- Backups are compressed (tar.gz)
- Integrity is verified after each backup

## ⚙️ Cron Schedule
```
0 * * * * /root/KStore/backup-database.sh >> /var/log/kstore-backup.log 2>&1
```
This runs every hour at minute 0 (e.g., 14:00, 15:00, 16:00, etc.)

## 📋 Backup Script Features
✅ Automatic hourly backups  
✅ Daily backup at midnight  
✅ Automatic rotation (keeps last 48 hourly, 30 daily)  
✅ Backup integrity verification  
✅ Compressed archives (tar.gz)  
✅ Detailed logging  
✅ Size reporting  

## 🚨 Troubleshooting

### Check if cron job is running
```bash
crontab -l | grep backup-database
```

### Check backup log
```bash
tail -50 /var/log/kstore-backup.log
```

### Test backup script
```bash
/root/KStore/backup-database.sh
```

### Check disk space
```bash
df -h /root
```

### View cron job logs
```bash
grep CRON /var/log/syslog | grep backup-database | tail -20
```
