

console.log('Started', self);

const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  'index.html',
  'restaurant.html',
  'css/responsiveness.css',
  'css/styles.css',
  'js/main.js',
  'js/dbhelper.js',
  'js/restaurant_info.js'
];


/**
 * 1. Open a cache.
 * 2. Cache our files.
 * 3. Confirm whether all the required assets are cached or not.
 */
self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      }).then(function(){
    console.log('Installed', event);
    })
  );

});

/**
 *  cache management
 */
self.addEventListener('activate', function(event) {
  console.log('Activated', event);
  let cacheWhitelist = ['my-site-cache-v1'];

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );


});

self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);


  // TODO: fetching is not correctly served on offline
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
          // Cache hit - return response
          //console.log("sent: " +  JSON.stringify(response));
          return response ||
            fetch(event.request).then(function(networkResponse){
                if(networkResponse.status === 404){
                  // requested url page is not on the server
                    return new Response("Whopps, not found!");
                }
                return networkResponse;
            }).catch(function(){
              // offline
              return new Response(index.html);
            });
        }
      )
  );

});


self.addEventListener('push', function(event) {
  console.log('Push message received', event);
});




/**
 * Created by Pewhprogrammer on 28.02.2018.
 */
