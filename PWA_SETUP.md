# Progressive Web App (PWA) Setup

## What is PWA?

Progressive Web App (PWA) allows users to install your web application on their mobile devices, making it feel like a native app.

## Features Added

✅ **Web App Manifest** - Defines how the app appears when installed
✅ **Service Worker** - Enables offline functionality and caching
✅ **App Icons** - Custom icons for home screen
✅ **Install Prompt** - Users can install the app from browser

## How to Install on Mobile

### Android (Chrome/Edge):
1. Open the app in Chrome browser
2. Look for the "Add to Home Screen" prompt, OR
3. Tap the menu (3 dots) → "Add to Home Screen" or "Install app"
4. Confirm installation
5. App icon will appear on home screen

### iOS (Safari):
1. Open the app in Safari browser
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize the name (optional)
5. Tap "Add"
6. App icon will appear on home screen

## Requirements for PWA

### Development:
- ✅ Works on `localhost` (for testing)
- ✅ Service worker registered
- ✅ Manifest file configured

### Production:
- ⚠️ **HTTPS Required** - PWA features require HTTPS
- Deploy to a hosting service that provides HTTPS:
  - Vercel (automatic HTTPS)
  - Netlify (automatic HTTPS)
  - Heroku (automatic HTTPS)
  - Railway (automatic HTTPS)
  - Or use your own domain with SSL certificate

## Testing PWA Features

### Check if PWA is working:
1. Open browser DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section - should show your app details
4. Check "Service Workers" section - should show registered worker
5. Check "Lighthouse" tab - run PWA audit

### Test Install Prompt:
1. Open app in Chrome/Edge
2. Look for install banner or prompt
3. Or check DevTools → Application → Manifest → "Add to homescreen"

## Customization

### Update App Name:
Edit `public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "Short Name"
}
```

### Update Theme Color:
Edit `public/manifest.json` and `index.html`:
- Change `theme_color` in manifest.json
- Change `theme-color` meta tag in index.html

### Update Icons:
Replace icon files in `public/`:
- `favicon.svg` (main icon)
- `icon-192.png` (192x192 PNG)
- `icon-512.png` (512x512 PNG)

## Offline Functionality

The service worker caches:
- Main pages (Dashboard, Foods, Weight, Profile)
- Static assets
- API calls are not cached (requires network)

## Troubleshooting

### App not installing?
- Check if HTTPS is enabled (required for production)
- Check browser console for errors
- Verify manifest.json is accessible at `/manifest.json`
- Verify service worker is registered

### Service Worker not working?
- Check browser console for errors
- Clear browser cache and reload
- Check if service worker file is accessible at `/sw.js`

### Icons not showing?
- Verify icon files exist in `public/` directory
- Check icon paths in manifest.json
- Clear browser cache

## Next Steps

1. **Generate PNG Icons** (optional but recommended):
   - Create 192x192 and 512x512 PNG versions of your icon
   - Place them in `public/` directory
   - Update manifest.json with correct paths

2. **Deploy to Production**:
   - Deploy to a hosting service with HTTPS
   - Test installation on real devices
   - Verify all PWA features work

3. **Enhance Offline Support** (optional):
   - Cache API responses
   - Add offline page
   - Implement background sync

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web App Manifest](https://web.dev/add-manifest/)
- [Service Workers](https://web.dev/service-workers-cache-storage/)

