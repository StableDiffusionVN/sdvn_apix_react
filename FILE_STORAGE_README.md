# File Storage System - Quick Start & Troubleshooting

## Quick Start

### 1. Start Both Servers

```bash
npm run dev:all
```

This will start:
- **Frontend (Vite)**: http://localhost:3000
- **Backend (Express)**: http://localhost:3001

### 2. Verify Setup

Open browser console (F12) and run:
```javascript
fetch('http://localhost:3001/api/health').then(r => r.json()).then(console.log)
```

Should return: `{status: "ok", message: "aPix backend server is running"}`

## Directory layout

- `server/gallery`: root for gallery images; folders like `upload`, `outputs`, `image_editor`, and `extra` live underneath.
- `server/gallery/upload`: default destination for manual uploads (drag/drop or file imports).
- `server/gallery/outputs`: receives generated or combined images produced by the apps.
- `server/gallery/image_editor`: stores files produced by the standalone image editor flows.
- `server/gallery/extra`: stores the extra-app outputs (cover/composition/canvas exports) that used to live under `canvas`.
- `server/history`: stores generation thumbnails for the history panel.
- `server/history/upload`: receives history upload candidates before they are logged.
- `server/data`: persistent JSON blobs for history or settings snapshots.

> **Gallery filters** mirror these folders. Each tab (Upload / Output App / Extra Apps / Image Editor / Storyboard) shows the matching subfolder under `/server/gallery/*`, so you can isolate uploads, app outputs, editor work, or extra assets.

---

## Troubleshooting

### Issue: "Không thể lưu ảnh vào gallery"

**Possible Causes:**

1. **Backend not running**
   - Check if you see both servers running in terminal
   - Frontend should be on port 3000
   - Backend should be on port 3001

2. **Port conflict**
   - Kill all processes and restart:
   ```bash
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   npm run dev:all
   ```

3. **CORS error**
   - Open browser console (F12)
   - Look for CORS errors
   - Backend should allow localhost:3000

4. **Network error**
   - Check browser console for fetch errors
   - Try manual test:
   ```javascript
   // Test upload
   fetch('http://localhost:3001/api/upload-base64/gallery', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='})
   }).then(r => r.json()).then(console.log)
   ```

### Check Backend Logs

Backend logs will show in the terminal where you ran `npm run dev:all`. Look for:
- Upload requests
- Error messages
- File paths

### Check Frontend Console

Open browser console (F12) and look for:
- Red error messages
- Network tab showing failed requests
- Console.error logs from fileStorage.ts

---

## Debug Mode

To enable verbose logging, open browser console and run:

```javascript
// Enable debug mode
localStorage.setItem('debug_file_storage', 'true');

// Reload page
location.reload();
```

---

## Manual Testing

### Test Backend Directly

```bash
# Test health
curl http://localhost:3001/api/health

# Test upload (create a test image first)
curl -X POST http://localhost:3001/api/upload-base64/gallery \
  -H "Content-Type: application/json" \
  -d '{"base64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}'
```

---

## Common Solutions

### Solution 1: Restart Everything
```bash
# Kill all processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Restart
npm run dev:all
```

### Solution 2: Check File Permissions
```bash
# Ensure storage directories are writable
chmod -R 755 server/gallery server/history server/data
```

### Solution 3: Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button
- Select "Empty Cache and Hard Reload"

---

## Still Having Issues?

1. Check browser console for specific error messages
2. Check terminal logs for backend errors
3. Try the manual curl test above
4. Verify both servers are running on correct ports
