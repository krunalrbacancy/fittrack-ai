// PWA Service Worker Registration
export const registerServiceWorker = () => {
  // Disable service worker in development to prevent caching issues
  if (import.meta.env.DEV) {
    // Unregister any existing service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              return caches.delete(cacheName);
            })
          );
        });
      }
    }
    return;
  }

  // Production: Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Unregister all existing service workers first to clear old caches
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      }).then(() => {
        // Clear all caches
        if ('caches' in window) {
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames.map((cacheName) => {
                return caches.delete(cacheName);
              })
            );
          });
        }
      }).then(() => {
        // Register new service worker
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Force update
            registration.update();
          })
          .catch(() => {
            // Silently fail in production
          });
      });
    });
  }
};

// Install prompt handling
export const setupInstallPrompt = () => {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button or banner
    showInstallButton();
  });

  return deferredPrompt;
};

const showInstallButton = () => {
  // You can add a custom install button to your UI here
  // Install prompt is available
};

export const installApp = async (deferredPrompt: any) => {
  if (!deferredPrompt) return;

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  await deferredPrompt.userChoice;

  // Clear the deferredPrompt
  deferredPrompt = null;
};

