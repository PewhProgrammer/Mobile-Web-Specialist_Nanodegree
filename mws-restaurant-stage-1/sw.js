

console.log('Started', self);

const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  '/',
  'restaurant.html',
  'css/responsiveness.css',
  'css/styles.css',
  'js/main.js',
  'js/dbhelper.js',
  'sw.js',
  'js/idb.js',
  'js/idb_lib.js',
  'js/jquery-3.2.1.js',
  'images_cropped/1_large_1x.jpg',
  'images_cropped/2_large_1x.jpg',
  'images_cropped/3_large_1x.jpg',
  'images_cropped/4_large_1x.jpg',
  'images_cropped/5_large_1x.jpg',
  'images_cropped/6_large_1x.jpg',
  'images_cropped/7_large_1x.jpg',
  'images_cropped/8_large_1x.jpg',
  'images_cropped/9_large_1x.jpg',
  'images_cropped/10_large_1x.jpg',
  'images_cropped/1_medium_1x.jpg',
  'images_cropped/2_medium_1x.jpg',
  'images_cropped/3_medium_1x.jpg',
  'images_cropped/4_medium_1x.jpg',
  'images_cropped/5_medium_1x.jpg',
  'images_cropped/6_medium_1x.jpg',
  'images_cropped/7_medium_1x.jpg',
  'images_cropped/8_medium_1x.jpg',
  'images_cropped/9_medium_1x.jpg',
  'images_cropped/10_medium_1x.jpg',
  'data/restaurants.json'
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
    }).catch(function(e){
      console.log("Installed failed: " + e);
    })
  );

});

/**
 *  cache management
 */
self.addEventListener('activate', function(event) {
  console.log('Activated', event);
  event.waitUntil(self.clients.claim());
  /*
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
*/

});

self.addEventListener('fetch', function(event) {

    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request,{ignoreSearch:true}).then(function (response) {
          const requestUrl = new URL(event.request.url);
          if(response) console.log("Load from cache: " + requestUrl);
          return response || fetch(event.request).then(function(response) {
              cache.put(event.request, response.clone());
              console.log("Add to cache: " + requestUrl);
              return response;
            }).catch(function(e){
              console.log("failed to fetch: " + requestUrl);
              //return e;
            });
        });
      })
    );

/*
  caches.open(CACHE_NAME).then(function(cache) {
    cache.match(event.request, {ignoreSearch: true}).then(response => {
      const requestUrl = new URL(event.request.url);
      if(response){
        console.log("Load from cache: " + requestUrl);
        return response;
      }
      return fetch(event.request).then(function(response) {
        console.log("Add to cache: " + requestUrl);
        cache.put(event.request, response.clone());
        return response;
      }).catch(function(){
        console.log("failed to catch: " +  requestUrl);
      });

    })
  });
*/
    /*
    const requestUrl = new URL(event.request.url);

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
                return new Response("it appears that you are offline!!");
              });
          }
        )
    );
    */

});


self.addEventListener('push', function(event) {
  console.log('Push message received', event);
});




/**
 * Created by Pewhprogrammer on 28.02.2018.
 */
