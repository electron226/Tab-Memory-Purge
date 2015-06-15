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

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let req = indexedDB.open($this.databaseName, $this.version);
      req.onupgradeneeded = function(e) {
        debug('be running onupgradeneeded.');

        e.target.transaction.onerror = function(e) {
          error(e);
          deferred.reject();
        };

        let db = e.target.result;

        for (let storeName in createProperties) {
          if (createProperties.hasOwnProperty(storeName)) {
            // delete previous object store in database.
            if (db.objectStoreNames.contains(storeName)) {
              db.deleteObjectStore(storeName);
            }

            let property = createProperties[storeName].property;
            let store = db.createObjectStore(storeName, property);
            if (createProperties[storeName].hasOwnProperty('indexs')) {
              let indexs = createProperties[storeName].indexs;
              for (let indexName in indexs) {
                if (indexs.hasOwnProperty(indexName)) {
                  let item = indexs[indexName];
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

    let deferred = Promise.defer();
    setTimeout(function($this) {
      if (type === void 0 || type === null) {
        type = 'add';
      }

      let storeName = args.name;
      let data = (toType(args.data) === 'object') ? [ args.data ] : args.data;

      let tx = $this.db.transaction(storeName, 'readwrite');
      tx.onabort = function(e) {
        let error = e.target.error;
        if (error.name === 'QuotaExceededError') {
          error(error.name);
        }
      };
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      let store = tx.objectStore(storeName);
      let p = [];
      data.forEach(function(v) {
        p.push(
          new Promise(function(resolve, reject) {
            let req;
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
        deferred.reject();
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

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let storeName = args.name;
      let key       = args.key;
      let indexName = args.indexName;

      let tx = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = deferred.resolve;
      tx.onerror    = deferred.reject;

      let store = tx.objectStore(storeName);
      let req;
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
    let deferred = Promise.defer();
    setTimeout(function($this) {
      let storeName = args.name;
      let indexName = args.indexName;

      let tx = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      let store = tx.objectStore(storeName);
      let req;
      try {
        req = indexName ?
              store.index(indexName).openCursor() :
              store.openCursor();
      } catch (e) {
        warn(e);
        req = store.openCursor();
      }

      let results = [];
      req.onsuccess = function() {
        let cursor = this.result;
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

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let storeName = args.name;
      let range = args.range;
      let direction = args.direction;
      let indexName = args.indexName;

      let tx = $this.db.transaction(storeName, 'readonly');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      let store = tx.objectStore(storeName);
      let req;
      try {
        req = indexName ?
              store.index(indexName).openCursor(range, direction) :
              store.openCursor(range, direction);
      } catch (e) {
        warn(e);
        req = store.openCursor(range, direction);
      }

      let results = [];
      req.onsuccess = function() {
        let cursor = this.result;
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

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let storeName = args.name;
      let range = args.range;
      let indexName = args.indexName;
      let update = args.update;

      let tx = $this.db.transaction(storeName, 'readwrite');
      tx.onabort = function(e) {
        let error = e.target.error;
        if (error.name === 'QuotaExceededError') {
          error(error.name);
        }
      };
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      let store = tx.objectStore(storeName);
      let req;
      try {
        req = indexName ?
              store.index(indexName).openCursor(range) :
              store.openCursor(range);
      } catch (e) {
        warn(e);
        req = store.openCursor(range);
      }

      req.onsuccess = function() {
        let cursor = this.result;
        if (cursor) {
          let data = cursor.value;

          for (let key in data) {
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

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let storeName = args.name;
      let keys = (toType(args.keys) !== 'array') ? [ args.keys ] : args.keys;

      let tx = $this.db.transaction(storeName, 'readwrite');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      let store = tx.objectStore(storeName);

      let p = [];
      keys.forEach(function(v) {
        p.push(
          new Promise(function(resolve, reject) {
            let del = store.delete(v);
            del.onsuccess = resolve;
            del.onerror = reject;
          })
        );
      });

      Promise.all(p).then(deferred.resolve, function(e) {
        error(e.target.error.message);
        deferred.reject();
      });
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.clear = function(storeName) {
    debug('called clear function of Database class.', storeName);

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let tx = $this.db.transaction(storeName, 'readwrite');
      tx.oncomplete = deferred.resolve;
      tx.onerror = deferred.reject;

      let store = tx.objectStore(storeName);
      let cl = store.clear();

      cl.onsuccess = deferred.resolve;
      cl.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.deleteDatabase = function() {
    debug('called deleteAll function of Database class.');

    let deferred = Promise.defer();
    setTimeout(function($this) {
      let req = indexedDB.deleteDatabase($this.databaseName);
      req.onsuccess = deferred.resolve;
      req.onerror = function(e) {
        error(e);
        deferred.reject();
      };
    }, 0, this);
    return deferred.promise;
  };

  Database.prototype.close = function() {
    debug('called close function of Database class.');

    let deferred = Promise.defer();
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
