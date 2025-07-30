// Clear cache on new deployment
(function() {
  // Check if there's a new version available
  const currentVersion = 'BUILD_ID_PLACEHOLDER';
  const storedVersion = localStorage.getItem('app-version');
  
  if (storedVersion && storedVersion !== currentVersion) {
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    
    // Clear localStorage except for essential items
    const essentialKeys = ['supabase.auth.token'];
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (!essentialKeys.some(essential => key.includes(essential))) {
        localStorage.removeItem(key);
      }
    });
    
    // Update version
    localStorage.setItem('app-version', currentVersion);
    
    // Force reload
    window.location.reload(true);
  } else if (!storedVersion) {
    // First visit
    localStorage.setItem('app-version', currentVersion);
  }
})();