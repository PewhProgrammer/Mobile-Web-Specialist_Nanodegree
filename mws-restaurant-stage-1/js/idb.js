/**
 * Created by Thinh-Laptop on 28.02.2018.
 */
import "./idb_lib.js";

/*
const dbPromise = idb.open('products', 1, function(upgradeDB) {
  let store = upgradeDB.createObjectStore('beverages', {
    keyPath: 'id'
  });
  store.put({id: 123, name: 'coke', price: 10.99, quantity: 200},'1');
  store.put({id: 321, name: 'pepsi', price: 8.99, quantity: 100},'2');
  store.put({id: 222, name: 'water', price: 11.99, quantity: 300},'3');
});

dbPromise.then(function(db){
  let tx = db.transaction('beverages');
  let keyValStore = tx.objectStore('beverages');
  return keyValStore.get('1');
}).then(function(val){
  console.log("The value of the 1st beverage is: " + val);
});
  */