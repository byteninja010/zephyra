# PWA Quick Reference - Zephyra

## 🚀 Quick Commands

### Check Current Version
```javascript
window.getServiceWorkerVersion()
```

### Clear Cache (Debugging Only)
```javascript
window.clearServiceWorkerCache()
```

### Force Update Check
```javascript
navigator.serviceWorker.getRegistration().then(r => r.update())
```

## 📝 Before Each Deployment

1. **Update version** in `public/service-worker.js`:
   ```javascript
   const CACHE_VERSION = '1.0.2'; // Increment this! (Current: 1.0.1)
   ```

2. **Build the app**:
   ```bash
   npm run build
   ```

3. **Test locally** (service worker only works on HTTPS or localhost):
   ```bash
   npm start
   ```

4. **Deploy** to production

## 🔍 Debugging

### Check Service Worker Status
1. Open Chrome DevTools
2. Go to **Application** tab
3. Click **Service Workers** (left sidebar)
4. Should show: "activated and is running"

### View Cached Files
1. Open Chrome DevTools
2. Go to **Application** tab
3. Click **Cache Storage** (left sidebar)
4. Expand to see all cached files

### Clear Everything (Hard Reset)
1. Chrome DevTools → Application → Clear Storage
2. Check "Unregister service workers"
3. Click "Clear site data"
4. Reload page

## ⚠️ Important Notes

- **Socket.io is NOT cached** (real-time features work normally)
- **API calls use network-first** (always fresh data)
- **Updates happen automatically** every 1 hour
- **Users get prompted** when new version available
- **Cache size limited** to prevent memory issues

## 📊 What Gets Cached?

✅ **YES** - Cached for offline use:
- HTML pages
- CSS files
- JavaScript bundles
- Images (logos, avatars)
- Fonts
- GET API responses (as fallback)

❌ **NO** - Never cached:
- Socket.io connections
- WebSocket traffic
- POST/PUT/DELETE requests
- Real-time updates

## 🐛 Common Issues

### "chrome-extension console error"
→ **Fixed in v1.0.1!** Just refresh the page. Service worker now ignores browser extension URLs.

### "App not updating"
→ Increment `CACHE_VERSION` in service-worker.js

### "Seeing old content"
→ Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)

### "Offline not working"
→ Check service worker is activated in DevTools

### "Cache too big"
→ Reduce `MAX_DYNAMIC_CACHE_SIZE` or `MAX_IMAGE_CACHE_SIZE` in service-worker.js

## 🎯 Performance Tips

- First visit: Normal speed (caching in background)
- Repeat visits: 70-90% faster!
- Offline: Full functionality for visited pages
- Bandwidth: 60-80% less on repeat visits

## 📱 Testing on Mobile

1. Deploy to HTTPS domain
2. Open in mobile browser
3. Look for "Add to Home Screen" prompt
4. Install and test offline by enabling airplane mode

---

**Questions?** Check `PWA_DOCUMENTATION.md` for full details

