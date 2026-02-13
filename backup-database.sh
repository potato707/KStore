#!/bin/bash

# KStore Database Backup Script
# Backs up the data directory with timestamp

# Configuration
DATA_DIR="/root/KStore/data"
BACKUP_ROOT="/root/KStore_Backups"
LOCAL_BACKUP_DIR="$BACKUP_ROOT/hourly"
DAILY_BACKUP_DIR="$BACKUP_ROOT/daily"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HOUR=$(date +"%H")
DATE=$(date +"%Y%m%d")

# Create backup directories if they don't exist
mkdir -p "$LOCAL_BACKUP_DIR"
mkdir -p "$DAILY_BACKUP_DIR"

# Create hourly backup
BACKUP_FILE="$LOCAL_BACKUP_DIR/kstore_data_${TIMESTAMP}.tar.gz"
tar -czf "$BACKUP_FILE" -C /root/KStore data/ 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Hourly backup created: $BACKUP_FILE"
    
    # Get backup size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] 📦 Backup size: $SIZE"
else
    echo "[$(date)] ❌ Backup failed!"
    exit 1
fi

# At midnight (00:00), create a daily backup
if [ "$HOUR" = "00" ]; then
    DAILY_BACKUP_FILE="$DAILY_BACKUP_DIR/kstore_data_${DATE}.tar.gz"
    cp "$BACKUP_FILE" "$DAILY_BACKUP_FILE"
    echo "[$(date)] 🌙 Daily backup created: $DAILY_BACKUP_FILE"
fi

# Keep only last 48 hourly backups (2 days)
cd "$LOCAL_BACKUP_DIR"
ls -t kstore_data_*.tar.gz 2>/dev/null | tail -n +49 | xargs -r rm
echo "[$(date)] 🧹 Cleaned old hourly backups (keeping last 48)"

# Keep only last 30 daily backups (1 month)
cd "$DAILY_BACKUP_DIR"
ls -t kstore_data_*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm
echo "[$(date)] 🧹 Cleaned old daily backups (keeping last 30)"

# Verify backup integrity
tar -tzf "$BACKUP_FILE" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Backup integrity verified"
else
    echo "[$(date)] ⚠️ Backup file may be corrupted!"
fi

# Show backup statistics
TOTAL_BACKUPS=$(find "$BACKUP_ROOT" -name "kstore_data_*.tar.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
echo "[$(date)] 📊 Total backups: $TOTAL_BACKUPS | Total size: $TOTAL_SIZE"

exit 0
