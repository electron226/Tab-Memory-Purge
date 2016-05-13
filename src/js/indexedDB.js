(function(window) {
  "use strict";

  let Database = function(databaseName, version) {//{{{
    // When database is opened and fail the onupgradeneeded function,
    // Its database is saved empty at version 1.
    // Therefore, I have set version 2 at here.
    this.version      = version      || 2;
    this.databaseName = databaseName || "database";
    this.db           = null;
  };//}}}

  Database.prototype.open = function(pCreateProperties) {//{{{
    console.info(
      'called open function of Database class.',
      Array.prototype.slice.call(pCreateProperties));

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let req = indexedDB.open($this.databaseName, $this.version);

      req.onupgradeneeded = function(pEvent) {
        console.info('onupgradeneeded in open function of Database class.');

        pEvent.target.transaction.onerror = reject;

        let db = pEvent.target.result;

        let property = {};
        let indexs   = {};
        let item     = {};
        let db_store = null;
        Object.keys(pCreateProperties).forEach(pStoreName => {
          // delete previous object store in database.
          if (db.objectStoreNames.contains(pStoreName)) {
            db.deleteObjectStore(pStoreName);
          }

          property = pCreateProperties[pStoreName].property;
          db_store     = db.createObjectStore(pStoreName, property);
          if (pCreateProperties[pStoreName].hasOwnProperty('indexs')) {
            indexs = pCreateProperties[pStoreName].indexs;

            Object.keys(indexs).forEach(pStrIndexName => {
              item = indexs[pStrIndexName];
              db_store.createIndex(
                pStrIndexName,
                item.targets.length === 1 ?
                  item.targets[0] : item.targets,
                item.property
              );
            });
          }
        });
      };

      req.onsuccess = function(pEvent) {
        console.info('onsuccess in open function of Database class');

        $this.db = pEvent.target.result;
        resolve(pEvent);
      };

      req.onerror = reject;
    });
  };//}}}

  Database.prototype.addOrPut = function(pOpts, pType) {//{{{
    console.info('called addOrPut function of Database class.',
      Array.prototype.slice.call(arguments));

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object', 'array' ],
        [ 'null', 'undefined', 'string' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let store_name = pOpts.name;
      let type       = pType || 'add';
      let datas      = (toType(pOpts.data) === 'object') ?
                       [ pOpts.data ] : pOpts.data;

      let db_transaction = $this.db.transaction(store_name, 'readwrite');
      db_transaction.onabort = function(pEvent) {
        console.info('abort in addOrPut function of Database class');

        let lObjError = pEvent.target.error;
        if (lObjError.name === 'QuotaExceededError') {
          console.error(lObjError.name);
        }
      };
      db_transaction.oncomplete = resolve;
      db_transaction.onerror    = reject;

      let db_store = db_transaction.objectStore(store_name);
      let promise_results = [];
      datas.forEach(pValue => {
        promise_results.push(
          new Promise((resolve, reject) => {
            let db_req = (type === 'add') ?
                             db_store.add(pValue) : db_store.put(pValue);
            db_req.onsuccess = resolve;
            db_req.onerror   = function(pErr) {
              let newError = new Error(
                `storeName: ${store_name}, ` +
                `name: ${pErr.target.error.name}, ` +
                `message: ${pErr.target.error.message}`);
              reject(newError);
            };
          })
        );
      });

      Promise.all(promise_results)
        .then(resolve)
        .catch(pErr => reject(pErr));
    });
  };//}}}

  Database.prototype.add = function(pOpts) {//{{{
    console.info('called add function of Database class.',
      Array.prototype.slice.call(arguments));

    let err_msg = checkFunctionArguments(arguments, [
      [ 'object', 'array' ],
    ]);
    if (err_msg) {
      throw new Error(err_msg);
    }

    return this.addOrPut(pOpts, 'add');
  };//}}}

  Database.prototype.put = function(pOpts) {//{{{
    console.info('called put function of Database class.',
      Array.prototype.slice.call(arguments));

    let err_msg = checkFunctionArguments(arguments, [
      [ 'object', 'array' ],
    ]);
    if (err_msg) {
      throw new Error(err_msg);
    }

    return this.addOrPut(pOpts, 'put');
  };//}}}

  Database.prototype.get = function(pOpts) {//{{{
    console.info('called get function of Database class.',
      Array.prototype.slice.call(arguments));

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let store_name = pOpts.name;
      let key        = pOpts.key;
      let index_name = pOpts.indexName;

      let db_transaction = $this.db.transaction(store_name, 'readonly');
      db_transaction.oncomplete = resolve;
      db_transaction.onerror    = reject;

      let db_store = db_transaction.objectStore(store_name);
      let db_req   = null;
      try {
        db_req = index_name ? db_store.index(index_name).get(key) :
                              db_store.get(key);
      } catch (e) {
        console.warn(e);
        db_req = db_store.get(key);
      }

      db_req.onsuccess = function() {
        console.info('onsuccess in get function of class Database.');

        resolve(this.result);
      };
      db_req.onerror = reject;
    });
  };//}}}

  Database.prototype.getAll = function(pOpts) {//{{{
    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let store_name = pOpts.name;
      let index_name = pOpts.indexName;

      let db_translation = $this.db.transaction(store_name, 'readonly');
      db_translation.oncomplete = resolve;
      db_translation.onerror    = reject;

      let db_store = db_translation.objectStore(store_name);
      let db_req   = null;
      try {
        db_req = index_name ?
                 db_store.index(index_name).openCursor() :
                 db_store.openCursor();
      } catch (pErr) {
        console.warn(pErr);
        db_req = db_store.openCursor();
      }

      let results = [];
      db_req.onsuccess = function() {
        console.info('onsucess in getAll function of Database class.');

        let cursor = this.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      db_req.onerror = reject;
    });
  };//}}}

  // http://www.htmlhifive.com/conts/web/view/library/indexed-db-overview#H890765704EF653D65F973059308B58345408
  // range is that return value of IDBKeyRange.
  // You use these that bound, lowerBound, only, and upperBound in IDBKeyRange.
  //
  // When indexName was error, this function isn't use it.
  Database.prototype.getCursor = function(pOpts) {//{{{
    console.info('called getCursor function of Database class.', pOpts);

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let store_name = pOpts.name;
      let db_range   = pOpts.range;
      let direction  = pOpts.direction;
      let index_name = pOpts.indexName;

      let db_transaction = $this.db.transaction(store_name, 'readonly');
      db_transaction.oncomplete = resolve;
      db_transaction.onerror    = reject;

      let db_store = db_transaction.objectStore(store_name);
      let db_req   = null;
      try {
        db_req = index_name ?
            db_store.index(index_name).openCursor(db_range, direction) :
            db_store.openCursor(db_range, direction);
      } catch (e) {
        console.warn(e);
        db_req = db_store.openCursor(db_range, direction);
      }

      let results = [];
      db_req.onsuccess = function() {
        console.info('onsucess in getCursor function of Database class.');

        let cursor = this.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      db_req.onerror = reject;
    });
  };//}}}

  Database.prototype.update = function(pOpts) {//{{{
    console.info('called update function of Database class.', pOpts);

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let name       = pOpts.name;
      let db_range   = pOpts.range;
      let index_name = pOpts.indexName;
      let update     = pOpts.update;

      let db_transaction = $this.db.transaction(name, 'readwrite');
      db_transaction.onabort = function(pEvent) {
        console.info('onabort in update function of Database class.');

        let lObjErr = pEvent.target.error;
        if (lObjErr.name === 'QuotaExceededError') {
          console.error(lObjErr.name);
        }
      };
      db_transaction.oncomplete = resolve;
      db_transaction.onerror    = reject;

      let db_store = db_transaction.objectStore(name);
      let db_req   = null;
      try {
        db_req = index_name ?
                 db_store.index(index_name).openCursor(db_range) :
                 db_store.openCursor(db_range);
      } catch (e) {
        console.warn(e);
        db_req = db_store.openCursor(db_range);
      }

      db_req.onsuccess = function() {
        console.info('onsuccess in update function of Database class.');

        let data   = {};
        let cursor = this.result;
        if (cursor) {
          data = cursor.value;

          Object.keys(data).forEach(pKey => {
            if (update.hasOwnProperty(pKey)) {
              data[pKey] = update[pKey];
            }
          });
          cursor.update(data);
          cursor.continue();
        } else {
          resolve();
        }
      };
      db_req.onerror = reject;
    });
  };//}}}

  Database.prototype.delete = function(pOpts) {//{{{
    console.info('called delete function of Database class.', pOpts);

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'object', 'array' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let store_name = pOpts.name;
      let lArrayKeys = (toType(pOpts.keys) !== 'array') ?
                       [ pOpts.keys ] : pOpts.keys;

      let db_transaction = $this.db.transaction(store_name, 'readwrite');
      db_transaction.oncomplete = resolve;
      db_transaction.onerror    = reject;

      let db_store = db_transaction.objectStore(store_name);

      let promise_results = [];
      lArrayKeys.forEach(pValue => {
        promise_results.push(
          new Promise((resolve, reject) => {
            let del       = db_store.delete(pValue);
            del.onsuccess = resolve;
            del.onerror   = reject;
          })
        );
      });

      Promise.all(promise_results).then(resolve, e => reject(e.target.error));
    });
  };//}}}

  Database.prototype.clear = function(pStoreName) {//{{{
    console.info('called clear function of Database class.', pStoreName);

    let $this = this;
    let args  = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'string' ],
      ]);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      let db_transaction = $this.db.transaction(pStoreName, 'readwrite');
      db_transaction.oncomplete = resolve;
      db_transaction.onerror    = reject;

      let db_store = db_transaction.objectStore(pStoreName);
      let db_clear = db_store.clear();
      db_clear.onsuccess = resolve;
      db_clear.onerror   = reject;
    });
  };//}}}

  Database.prototype.deleteDatabase = function() {//{{{
    console.info('called deleteAll function of Database class.');

    let $this  = this;
    let db_req = null;
    return new Promise((resolve, reject) => {
      db_req           = indexedDB.deleteDatabase($this.databaseName);
      db_req.onsuccess = resolve;
      db_req.onerror   = reject;
    });
  };//}}}

  Database.prototype.close = function() {//{{{
    console.info('called close function of Database class.');

    let $this = this;
    return new Promise((resolve) => {
      if ($this.db !== null) {
        $this.db.close();
      }
      resolve();
    });
  };//}}}

  Database.prototype.isOpened = function() {//{{{
    console.info('called isOpened function of Database class.');
    return (this.db !== null) ? true : false;
  };//}}}

  setObjectProperty(window, 'Database', Database);
})(this);
