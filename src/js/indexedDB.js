(function(window) {
  "use strict";

  var Database = function(databaseName, version) {
    // When database is opened and fail the onupgradeneeded function,
    // Its database is saved empty at version 1.
    // Therefore, I have set version 2 at here.
    this.version      = version      || 2;
    this.databaseName = databaseName || "database";
    this.db           = null;
  };

  Database.prototype.open = function(createProperties) {
    console.log('called open function of Database class.', createProperties);

    var $this = this;
    return new Promise((resolve, reject) => {
      var req = indexedDB.open($this.databaseName, $this.version);
      req.onupgradeneeded = function(e) {
        console.log('be running onupgradeneeded.');

        e.target.transaction.onerror = reject;

        var db = e.target.result;

        for (var storeName in createProperties) {
          if (createProperties.hasOwnProperty(storeName)) {
            // delete previous object store in database.
            if (db.objectStoreNames.contains(storeName)) {
              db.deleteObjectStore(storeName);
            }

            var property = createProperties[storeName].property;
            var store = db.createObjectStore(storeName, property);
            if (createProperties[storeName].hasOwnProperty('indexs')) {
              var indexs = createProperties[storeName].indexs;
              for (var indexName in indexs) {
                if (indexs.hasOwnProperty(indexName)) {
                  var item = indexs[indexName];
                  store.createIndex(
                    indexName,
                    item.targets.length === 1 ? item.targets[0] : item.targets,
                    item.property
                  );
                }
              }
            }
          }
        }
      };
      req.onsuccess = function(e) {
        $this.db = e.target.result;
        resolve(e);
      };
      req.onerror = reject;
    });
  };

  Database.prototype.addOrPut = function(args, type) {
    console.log('called addOrPut function of Database class.', args);

    var $this = this;
    return new Promise((resolve, reject) => {
      if (type === void 0 || type === null) {
        type = 'add';
      }

      var storeName = args.name;
      var data = (toType(args.data) === 'object') ? [ args.data ] : args.data;

      var tx = $this.db.transaction(storeName, 'readwrite');
      tx.onabort = function(e) {
        var error = e.target.error;
        if (error.name === 'QuotaExceededError') {
          console.error(error.name);
        }
      };
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store = tx.objectStore(storeName);
      var p = [];
      var i = 0;
      while (i < data.length) {
        p.push(
          new Promise((resolve, reject) => {
            var req = (type === 'add') ?
                      store.add(data[i]) : store.put(data[i]);
            req.onsuccess = resolve;
            req.onerror   = reject;
          })
        );
        ++i;
      }

      Promise.all(p)
      .then(resolve)
      .catch(e => reject(e.target.error));
    });
  };

  Database.prototype.add = function(args) {
    console.log('called add function of Database class.', args);
    return this.addOrPut(args, 'add');
  };

  Database.prototype.put = function(args) {
    console.log('called put function of Database class.', args);
    return this.addOrPut(args, 'put');
  };

  Database.prototype.get = function(args) {
    console.log('called get function of Database class.', args);

    var $this = this;
    return new Promise((resolve, reject) => {
      var storeName = args.name;
      var key       = args.key;
      var indexName = args.indexName;

      var tx        = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).get(key) :
              store.get(key);
      } catch (e) {
        console.warn(e);
        req = store.get(key);
      }

      req.onsuccess = function() {
        resolve(this.result);
      };
      req.onerror = reject;
    });
  };

  Database.prototype.getAll = function(args) {
    var $this = this;
    return new Promise((resolve, reject) => {
      var storeName = args.name;
      var indexName = args.indexName;

      var tx        = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).openCursor() :
              store.openCursor();
      } catch (e) {
        console.warn(e);
        req = store.openCursor();
      }

      var results = [];
      req.onsuccess = function() {
        var cursor = this.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = reject;
    });
  };

  // http://www.htmlhifive.com/conts/web/view/library/indexed-db-overview#H890765704EF653D65F973059308B58345408
  // range is that return value of IDBKeyRange.
  // You use these that bound, lowerBound, only, and upperBound in IDBKeyRange.
  //
  // When indexName was error, this function isn't use it.
  Database.prototype.getCursor = function(args) {
    console.log('called getCursor function of Database class.', args);

    var $this = this;
    return new Promise((resolve, reject) => {
      var storeName = args.name;
      var range     = args.range;
      var direction = args.direction;
      var indexName = args.indexName;

      var tx        = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).openCursor(range, direction) :
              store.openCursor(range, direction);
      } catch (e) {
        console.warn(e);
        req = store.openCursor(range, direction);
      }

      var results = [];
      req.onsuccess = function() {
        var cursor = this.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = reject;
    });
  };

  Database.prototype.update = function(args) {
    console.log('called update function of Database class.', args);

    var $this = this;
    return new Promise((resolve, reject) => {
      var storeName = args.name;
      var range     = args.range;
      var indexName = args.indexName;
      var update    = args.update;

      var tx = $this.db.transaction(storeName, 'readwrite');
      tx.onabort = function(e) {
        var error = e.target.error;
        if (error.name === 'QuotaExceededError') {
          console.error(error.name);
        }
      };
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).openCursor(range) :
              store.openCursor(range);
      } catch (e) {
        console.warn(e);
        req = store.openCursor(range);
      }

      req.onsuccess = function() {
        var cursor = this.result;
        if (cursor) {
          var data = cursor.value;
          for (var key in data) {
            if (data.hasOwnProperty(key) && update.hasOwnProperty(key)) {
              data[key] = update[key];
            }
          }
          cursor.update(data);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = reject;
    });
  };

  Database.prototype.delete = function(args) {
    console.log('called delete function of Database class.', args);

    var $this = this;
    return new Promise((resolve, reject) => {
      var storeName = args.name;
      var keys = (toType(args.keys) !== 'array') ? [ args.keys ] : args.keys;

      var tx        = $this.db.transaction(storeName, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store = tx.objectStore(storeName);

      var p = [];
      var i = 0;
      while (i < keys.length) {
        p.push(
          new Promise((resolve, reject) => {
            var del       = store.delete(keys[i]);
            del.onsuccess = resolve;
            del.onerror   = reject;
          })
        );
        ++i;
      }

      Promise.all(p).then(resolve, e => reject(e.target.error));
    });
  };

  Database.prototype.clear = function(storeName) {
    console.log('called clear function of Database class.', storeName);

    var $this = this;
    return new Promise((resolve, reject) => {
      var tx        = $this.db.transaction(storeName, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror    = reject;

      var store    = tx.objectStore(storeName);
      var cl       = store.clear();
      cl.onsuccess = resolve;
      cl.onerror   = reject;
    });
  };

  Database.prototype.deleteDatabase = function() {
    console.log('called deleteAll function of Database class.');

    var $this = this;
    return new Promise((resolve, reject) => {
      var req       = indexedDB.deleteDatabase($this.databaseName);
      req.onsuccess = resolve;
      req.onerror   = reject;
    });
  };

  Database.prototype.close = function() {
    console.log('called close function of Database class.');

    var $this = this;
    return new Promise((resolve) => {
      if ($this.db !== null) {
        $this.db.close();
      }
      resolve();
    });
  };

  Database.prototype.isOpened = function() {
    console.log('called isOpened function of Database class.');
    return (this.db !== null) ? true : false;
  };

  setObjectProperty(window, 'Database', Database);
})(this);
