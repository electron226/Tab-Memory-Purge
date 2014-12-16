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
    debug('called open function of Database class.', createProperties);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      var req = indexedDB.open($this.databaseName, $this.version);
      req.onupgradeneeded = function(e) {
        debug('be running onupgradeneeded.');

        e.target.transaction.onerror = function(e) {
          error(e);
          deferred.reject();
        };

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
              for (var name in indexs) {
                if (indexs.hasOwnProperty(name)) {
                  var item = indexs[name];
                  store.createIndex(
                    name,
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
        deferred.resolve(e);
      };
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.addOrPut = function(args, type) {
    debug('called addOrPut function of Database class.', args);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      if (type === void 0 || type === null) {
        type = 'add';
      }

      var storeName = args.name;
      var data = (toType(args.data) === 'object') ? [ args.data ] : args.data;

      var tx = $this.db.transaction(storeName, 'readwrite');
      tx.onabort = function(e) {
        var error = e.target.error;
        if (error.name === 'QuotaExceededError') {
          error(error.name);
        }
      };
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);
      var p = [];
      data.forEach(function(v) {
        p.push(
          new Promise(function(resolve, reject) {
            var req;
            if (type === 'add') {
              req = store.add(v);
            } else {
              req = store.put(v);
            }
            req.onsuccess = resolve;
            req.onerror = reject;
          })
        );
      });

      Promise.all(p).then(deferred.resolve, function(e) {
        error(e.target.error.message);
        deferred.reject(e.target.error);
      });
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.add = function(args) {
    debug('called add function of Database class.', args);
    return this.addOrPut(args, 'add');
  };

  Database.prototype.put = function(args) {
    debug('called put function of Database class.', args);
    return this.addOrPut(args, 'put');
  };

  Database.prototype.get = function(args) {
    debug('called get function of Database class.', args);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      var storeName = args.name;
      var key       = args.key;
      var indexName = args.indexName;

      var tx = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).get(key) :
              store.get(key);
      } catch (e) {
        warn(e);
        req = store.get(key);
      }

      req.onsuccess = function() {
        deferred.resolve(this.result);
      };
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.getAll = function(args) {
    var deferred = Promise.defer();
    setTimeout(function($this) {
      var storeName = args.name;
      var indexName = args.indexName;

      var tx = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).openCursor() :
              store.openCursor();
      } catch (e) {
        warn(e);
        req = store.openCursor();
      }

      var results = [];
      req.onsuccess = function() {
        var cursor = this.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          deferred.resolve(results);
        }
      };
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  // http://www.htmlhifive.com/conts/web/view/library/indexed-db-overview#H890765704EF653D65F973059308B58345408
  // range is that return value of IDBKeyRange.
  // You use these that bound, lowerBound, only, and upperBound in IDBKeyRange.
  //
  // When indexName was error, this function isn't use it.
  Database.prototype.getCursor = function(args) {
    debug('called getCursor function of Database class.', args);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      var storeName = args.name;
      var range = args.range;
      var direction = args.direction;
      var indexName = args.indexName;

      var tx = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).openCursor(range, direction) :
              store.openCursor(range, direction);
      } catch (e) {
        warn(e);
        req = store.openCursor(range, direction);
      }

      var results = [];
      req.onsuccess = function() {
        var cursor = this.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          deferred.resolve(results);
        }
      };
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.update = function(args) {
    debug('called update function of Database class.', args);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      var storeName = args.name;
      var range = args.range;
      var indexName = args.indexName;
      var update = args.update;

      var tx = $this.db.transaction(storeName, 'readwrite');
      tx.onabort = function(e) {
        var error = e.target.error;
        if (error.name === 'QuotaExceededError') {
          error(error.name);
        }
      };
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);
      var req;
      try {
        req = indexName ?
              store.index(indexName).openCursor(range) :
              store.openCursor(range);
      } catch (e) {
        warn(e);
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
          deferred.resolve();
        }
      };
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.delete = function(args) {
    debug('called delete function of Database class.', args);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      var storeName = args.name;
      var keys = (toType(args.keys) !== 'array') ? [ args.keys ] : args.keys;

      var tx = $this.db.transaction(storeName, 'readwrite');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);

      var p = [];
      keys.forEach(function(v) {
        p.push(
          new Promise(function(resolve, reject) {
            var del = store.delete(v);
            del.onsuccess = resolve;
            del.onerror = reject;
          })
        );
      });

      Promise.all(p).then(deferred.resolve, function(e) {
        error(e.target.error.message);
        deferred.reject(e.target.error);
      });
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.clear = function(storeName) {
    debug('called clear function of Database class.', storeName);

    var deferred = Promise.defer();
    setTimeout(function($this) {
      var tx = $this.db.transaction(storeName, 'readwrite');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      var store = tx.objectStore(storeName);
      var cl = store.clear();

      cl.onsuccess = deferred.resolve;
      cl.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.deleteDatabase = function(dbName) {
    debug('called deleteAll function of Database class.', dbName);

    var deferred = Promise.defer();
    setTimeout(function() {
      var req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = deferred.resolve;
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0);
    return deferred.promise;
  };

  Database.prototype.close = function() {
    debug('called close function of Database class.');

    var deferred = Promise.defer();
    setTimeout(function($this) {
      if ($this.db !== null) {
        $this.db.close();
      }
      deferred.resolve();
    }, 0, this);
    return deferred.promise;
  };

  window.Database = window.Database || Database;
})(window);
