#!/bin/bash
echo "🧹 مسح الـ cache..."

# Clear Next.js cache
rm -rf /root/KStore/.next/cache

# Clear build
echo "♻️ إعادة البناء..."
cd /root/KStore
npm run build

# Restart service
echo "🔄 إعادة تشغيل الخدمة..."
systemctl restart kstore.service

echo "✅ تم! الموقع دلوقتي محدث للكل"
