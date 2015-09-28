(function(window) {
  "use strict";

  var Database = function(databaseName, version) {//{{{
    // When database is opened and fail the onupgradeneeded function,
    // Its database is saved empty at version 1.
    // Therefore, I have set version 2 at here.
    this.version      = version      || 2;
    this.databaseName = databaseName || "database";
    this.db           = null;
  };//}}}

  Database.prototype.open = function(pObjCreateProperties) {//{{{
    console.info(
      'called open function of Database class.', pObjCreateProperties);

    var $this = this;
    return new Promise((resolve, reject) => {
      var req = indexedDB.open($this.databaseName, $this.version);

      req.onupgradeneeded = function(pEvent) {
        console.info('be running onupgradeneeded.');

        var db            = null;
        var lDBStore      = null;
        var lStrStoreName = "";
        var lObjProperty  = {};
        var lObjIndexs    = {};
        var lStrIndexName = "";
        var lObjItem      = {};

        pEvent.target.transaction.onerror = reject;

        db = pEvent.target.result;

        for (lStrStoreName in pObjCreateProperties) {
          if (pObjCreateProperties.hasOwnProperty(lStrStoreName)) {
            // delete previous object store in database.
            if (db.objectStoreNames.contains(lStrStoreName)) {
              db.deleteObjectStore(lStrStoreName);
            }

            lObjProperty = pObjCreateProperties[lStrStoreName].property;
            lDBStore     = db.createObjectStore(lStrStoreName, lObjProperty);
            if (pObjCreateProperties[lStrStoreName].hasOwnProperty('indexs')) {
              lObjIndexs = pObjCreateProperties[lStrStoreName].indexs;

              for (lStrIndexName in lObjIndexs) {
                if (lObjIndexs.hasOwnProperty(lStrIndexName)) {
                  lObjItem = lObjIndexs[lStrIndexName];
                  lDBStore.createIndex(
                    lStrIndexName,
                    lObjItem.targets.length === 1 ?
                      lObjItem.targets[0] : lObjItem.targets,
                    lObjItem.property
                  );
                }
              }
            }
          }
        }
      };

      req.onsuccess = function(pEvent) {
        $this.db = pEvent.target.result;
        resolve(pEvent);
      };

      req.onerror = reject;
    });
  };//}}}

  Database.prototype.addOrPut = function(pObjArgs, pStrType) {//{{{
    console.info('called addOrPut function of Database class.', pObjArgs);

    var $this = this;
    return new Promise((resolve, reject) => {
      var lStrStoreName  = "";
      var lObjData       = {};
      var lDBTransaction = null;
      var lDBStore       = null;
      var lArrayPromise  = [];
      var i              = 0;

      if (pStrType === void 0 || pStrType === null) {
        pStrType = 'add';
      }

      lStrStoreName = pObjArgs.name;
      lObjData      = (toType(pObjArgs.data) === 'object') ?
                        [ pObjArgs.data ] : pObjArgs.data;

      lDBTransaction = $this.db.transaction(lStrStoreName, 'readwrite');
      lDBTransaction.onabort = function(pEvent) {
        var lObjError = pEvent.target.error;
        if (lObjError.name === 'QuotaExceededError') {
          console.error(lObjError.name);
        }
      };
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore      = lDBTransaction.objectStore(lStrStoreName);
      lArrayPromise = [];
      i = 0;
      while (i < lObjData.length) {
        lArrayPromise.push(
          new Promise((resolve, reject) => {
            var lDBRequest = (pStrType === 'add') ?
                      lDBStore.add(lObjData[i]) : lDBStore.put(lObjData[i]);
            lDBRequest.onsuccess = resolve;
            lDBRequest.onerror   = function(pErr) {
              var newError = new Error(
                `storeName: ${lStrStoreName}, ` +
                `name: ${pErr.target.error.name}, ` +
                `message: ${pErr.target.error.message}`);
              reject(newError);
            };
          })
        );
        ++i;
      }

      Promise.all(lArrayPromise)
      .then(resolve)
      .catch(pErr => reject(pErr));
    });
  };//}}}

  Database.prototype.add = function(lObjArgs) {//{{{
    console.info('called add function of Database class.', lObjArgs);
    return this.addOrPut(lObjArgs, 'add');
  };//}}}

  Database.prototype.put = function(lObjArgs) {//{{{
    console.info('called put function of Database class.', lObjArgs);
    return this.addOrPut(lObjArgs, 'put');
  };//}}}

  Database.prototype.get = function(lObjArgs) {//{{{
    console.info('called get function of Database class.', lObjArgs);

    var $this = this;
    return new Promise((resolve, reject) => {
      var lStrStoreName = lObjArgs.name;
      var lStrKey       = lObjArgs.key;
      var lStrIndexName = lObjArgs.indexName;

      var lDBTransaction =
        $this.db.transaction(lStrStoreName, 'readonly');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      var lDBStore   = lDBTransaction.objectStore(lStrStoreName);
      var lDBRequest = null;
      try {
        lDBRequest = lStrIndexName ?
                     lDBStore.index(lStrIndexName).get(lStrKey) :
                     lDBStore.get(lStrKey);
      } catch (e) {
        console.warn(e);
        lDBRequest = lDBStore.get(lStrKey);
      }

      lDBRequest.onsuccess = function() {
        resolve(this.result);
      };
      lDBRequest.onerror = reject;
    });
  };//}}}

  Database.prototype.getAll = function(lObjArgs) {//{{{
    var $this = this;
    return new Promise((resolve, reject) => {
      var lArrayResult  = [];
      var lStrStoreName = lObjArgs.name;
      var lStrIndexName = lObjArgs.indexName;

      var lStrTransaction = $this.db.transaction(lStrStoreName, 'readonly');
      lStrTransaction.oncomplete = resolve;
      lStrTransaction.onerror    = reject;

      var lDBStore = lStrTransaction.objectStore(lStrStoreName);
      var lDBReq   = null;
      try {
        lDBReq = lStrIndexName ?
                 lDBStore.index(lStrIndexName).openCursor() :
                 lDBStore.openCursor();
      } catch (pErr) {
        console.warn(pErr);
        lDBReq = lDBStore.openCursor();
      }

      lArrayResult = [];
      lDBReq.onsuccess = function() {
        var lObjCursor = this.result;
        if (lObjCursor) {
          lArrayResult.push(lObjCursor.value);
          lObjCursor.continue();
        } else {
          resolve(lArrayResult);
        }
      };
      lDBReq.onerror = reject;
    });
  };//}}}

  // http://www.htmlhifive.com/conts/web/view/library/indexed-db-overview#H890765704EF653D65F973059308B58345408
  // range is that return value of IDBKeyRange.
  // You use these that bound, lowerBound, only, and upperBound in IDBKeyRange.
  //
  // When indexName was error, this function isn't use it.
  Database.prototype.getCursor = function(lObjArgs) {//{{{
    console.info('called getCursor function of Database class.', lObjArgs);

    var $this = this;
    return new Promise((resolve, reject) => {
      var lArrayResults = [];
      var lStrStoreName = lObjArgs.name;
      var lDBRange      = lObjArgs.range;
      var lNumDirection = lObjArgs.direction;
      var lStrIndexName = lObjArgs.indexName;

      var lDBTransaction =
        $this.db.transaction(lStrStoreName, 'readonly');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      var lDBStore   = lDBTransaction.objectStore(lStrStoreName);
      var lDBRequest = null;
      try {
        lDBRequest = lStrIndexName ?
            lDBStore.index(lStrIndexName).openCursor(lDBRange, lNumDirection) :
            lDBStore.openCursor(lDBRange, lNumDirection);
      } catch (e) {
        console.warn(e);
        lDBRequest = lDBStore.openCursor(lDBRange, lNumDirection);
      }

      lArrayResults = [];
      lDBRequest.onsuccess = function() {
        var lObjCursor = this.result;
        if (lObjCursor) {
          lArrayResults.push(lObjCursor.value);
          lObjCursor.continue();
        } else {
          resolve(lArrayResults);
        }
      };
      lDBRequest.onerror = reject;
    });
  };//}}}

  Database.prototype.update = function(pObjArgs) {//{{{
    console.info('called update function of Database class.', pObjArgs);

    var $this = this;
    return new Promise((resolve, reject) => {
      var lDBStore      = null;
      var lDBRequest    = null;
      var lStrName      = pObjArgs.name;
      var lDBRange      = pObjArgs.range;
      var lStrIndexName = pObjArgs.indexName;
      var lObjUpdate    = pObjArgs.update;

      var lDBTransaction = $this.db.transaction(lStrName, 'readwrite');
      lDBTransaction.onabort = function(pEvent) {
        var lObjErr = pEvent.target.error;
        if (lObjErr.name === 'QuotaExceededError') {
          console.error(lObjErr.name);
        }
      };
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore   = lDBTransaction.objectStore(lStrName);
      lDBRequest = null;
      try {
        lDBRequest = lStrIndexName ?
              lDBStore.index(lStrIndexName).openCursor(lDBRange) :
              lDBStore.openCursor(lDBRange);
      } catch (e) {
        console.warn(e);
        lDBRequest = lDBStore.openCursor(lDBRange);
      }

      lDBRequest.onsuccess = function() {
        var lStrKey    = "";
        var lObjData   = {};
        var lObjCursor = this.result;
        if (lObjCursor) {
          lObjData = lObjCursor.value;

          for (lStrKey in lObjData) {
            if (lObjData.hasOwnProperty(lStrKey) &&
                lObjUpdate.hasOwnProperty(lStrKey)) {
              lObjData[lStrKey] = lObjUpdate[lStrKey];
            }
          }
          lObjCursor.update(lObjData);
          lObjCursor.continue();
        } else {
          resolve();
        }
      };
      lDBRequest.onerror = reject;
    });
  };//}}}

  Database.prototype.delete = function(pObjArgs) {//{{{
    console.info('called delete function of Database class.', pObjArgs);

    var $this = this;
    return new Promise((resolve, reject) => {
      var lStrStoreName = pObjArgs.name;
      var lArrayKeys    = (toType(pObjArgs.keys) !== 'array') ?
                            [ pObjArgs.keys ] : pObjArgs.keys;

      var lDBTransaction = $this.db.transaction(lStrStoreName, 'readwrite');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      var lDBStore = lDBTransaction.objectStore(lStrStoreName);

      var lArrayPromise = [];
      var i = 0;
      while (i < lArrayKeys.length) {
        lArrayPromise.push(
          new Promise((resolve, reject) => {
            var del       = lDBStore.delete(lArrayKeys[i]);
            del.onsuccess = resolve;
            del.onerror   = reject;
          })
        );
        ++i;
      }

      Promise.all(lArrayPromise).then(resolve, e => reject(e.target.error));
    });
  };//}}}

  Database.prototype.clear = function(pStrStoreName) {//{{{
    console.info('called clear function of Database class.', pStrStoreName);

    var $this = this;
    return new Promise((resolve, reject) => {
      var lDBTransaction = $this.db.transaction(pStrStoreName, 'readwrite');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      var lDBStore       = lDBTransaction.objectStore(pStrStoreName);
      var lDBClear       = lDBStore.clear();
      lDBClear.onsuccess = resolve;
      lDBClear.onerror   = reject;
    });
  };//}}}

  Database.prototype.deleteDatabase = function() {//{{{
    console.info('called deleteAll function of Database class.');

    var $this = this;
    return new Promise((resolve, reject) => {
      var lDBRequest       = indexedDB.deleteDatabase($this.databaseName);
      lDBRequest.onsuccess = resolve;
      lDBRequest.onerror   = reject;
    });
  };//}}}

  Database.prototype.close = function() {//{{{
    console.info('called close function of Database class.');

    var $this = this;
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
