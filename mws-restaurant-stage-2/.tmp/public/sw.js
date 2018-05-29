
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());



console.log('Started', self);

const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  '/',
  //'restaurant.html',
  'styles/responsiveness.css',
  'styles/styles.css',
  'js/main.js',
  'js/dbhelper.js',
  'sw.js',
  'js/idb.js',
  'js/idb_lib.js',
  'js/jquery-3.2.1.js',
  /*
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
  */
];

function createDB(data) {
  idb.open('restaurants', 1, function(upgradeDB) {
    let store = upgradeDB.createObjectStore('restaurant', {
      keyPath: 'id'
    });

    for(let key in data){
      const restaurant = data[key];
      store.put(restaurant);
    }

  });
}

function readDB() {
  idb.open('restaurants', 1).then(function(db) {
    const tx = db.transaction(['beverages'], 'readonly');
    const store = tx.objectStore('restaurant');
    return store.getAll();
  }).then(function(items) {
    // Use beverage data
  });
}



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
});

self.addEventListener('fetch', function(event) {

  const type = event.request.url.toString().endsWith("restaurant_info");
  if(type){
    const response = fetch(event.request).then(function(response) {
      return response.json();
    }).then((json) => {
      createDB(json.restaurants);
    }).catch(function(e){
      console.log("failed to fetch: " + e);
    });
  }

    event.respondWith(

      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request,{ignoreSearch:true}).then(function (response) {
          // redirect from http to https
          let url = event.request.url;
          let requestUrl = new URL(url);

          //if(response) console.log("Load from cache: " + requestUrl);
          return response || fetch(event.request).then(function(response) {
              cache.put(event.request, response.clone());
              //console.log("Add to cache: " + requestUrl);
              return response;
            }).catch(function(e){
              console.log("failed to fetch: " + requestUrl);
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
