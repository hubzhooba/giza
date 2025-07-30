import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              // Service worker for cache management
              if ('serviceWorker' in navigator) {
                // Unregister any existing service workers to prevent cache issues
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              
              // Clear stale caches on load
              if ('caches' in window) {
                const CACHE_VERSION = '${new Date().getTime()}';
                const storedVersion = localStorage.getItem('cache-version');
                
                if (storedVersion && storedVersion !== CACHE_VERSION) {
                  caches.keys().then(function(names) {
                    for (let name of names) {
                      caches.delete(name);
                    }
                  });
                  localStorage.setItem('cache-version', CACHE_VERSION);
                }
              }
            `
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}