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
      'called open function of Database class.',
      Array.prototype.slice.call(pObjCreateProperties));

    var $this      = this;
    var req        = null;
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      req = indexedDB.open($this.databaseName, $this.version);

      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      req.onupgradeneeded = function(pEvent) {
        console.info('onupgradeneeded in open function of Database class.');

        var db            = null;
        var lDBStore      = null;
        var lObjProperty  = {};
        var lObjIndexs    = {};
        var lObjItem      = {};

        pEvent.target.transaction.onerror = reject;

        db = pEvent.target.result;

        Object.keys(pObjCreateProperties).forEach(pStrStoreName => {
          // delete previous object store in database.
          if (db.objectStoreNames.contains(pStrStoreName)) {
            db.deleteObjectStore(pStrStoreName);
          }

          lObjProperty = pObjCreateProperties[pStrStoreName].property;
          lDBStore     = db.createObjectStore(pStrStoreName, lObjProperty);
          if (pObjCreateProperties[pStrStoreName].hasOwnProperty('indexs')) {
            lObjIndexs = pObjCreateProperties[pStrStoreName].indexs;

            Object.keys(lObjIndexs).forEach(pStrIndexName => {
              lObjItem = lObjIndexs[pStrIndexName];
              lDBStore.createIndex(
                pStrIndexName,
                lObjItem.targets.length === 1 ?
                  lObjItem.targets[0] : lObjItem.targets,
                lObjItem.property
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

  Database.prototype.addOrPut = function(pObjArgs, pStrType) {//{{{
    console.info('called addOrPut function of Database class.',
      Array.prototype.slice.call(arguments));

    var $this          = this;
    var lStrStoreName  = "";
    var lArrayData     = [];
    var lDBTransaction = null;
    var lDBStore       = null;
    var lArrayPromise  = [];
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object', 'array' ],
        [ 'null', 'undefined', 'string' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lStrStoreName = pObjArgs.name;
      pStrType      = pStrType || 'add';
      lArrayData    = (toType(pObjArgs.data) === 'object') ?
                      [ pObjArgs.data ] : pObjArgs.data;

      lDBTransaction = $this.db.transaction(lStrStoreName, 'readwrite');
      lDBTransaction.onabort = function(pEvent) {
        console.info('abort in addOrPut function of Database class');

        var lObjError = pEvent.target.error;
        if (lObjError.name === 'QuotaExceededError') {
          console.error(lObjError.name);
        }
      };
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore      = lDBTransaction.objectStore(lStrStoreName);
      lArrayPromise = [];
      lArrayData.forEach(pValue => {
        lArrayPromise.push(
          new Promise((resolve, reject) => {
            var lDBRequest = (pStrType === 'add') ?
                      lDBStore.add(pValue) : lDBStore.put(pValue);
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
      });

      Promise.all(lArrayPromise)
      .then(resolve)
      .catch(pErr => reject(pErr));
    });
  };//}}}

  Database.prototype.add = function(lObjArgs) {//{{{
    console.info('called add function of Database class.',
      Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object', 'array' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return this.addOrPut(lObjArgs, 'add');
  };//}}}

  Database.prototype.put = function(lObjArgs) {//{{{
    console.info('called put function of Database class.',
      Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object', 'array' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return this.addOrPut(lObjArgs, 'put');
  };//}}}

  Database.prototype.get = function(lObjArgs) {//{{{
    console.info('called get function of Database class.',
      Array.prototype.slice.call(arguments));

    var $this          = this;
    var lStrStoreName  = '';
    var lStrKey        = '';
    var lStrIndexName  = '';
    var lDBTransaction = null;
    var lDBStore       = null;
    var lDBRequest     = null;
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lStrStoreName = lObjArgs.name;
      lStrKey       = lObjArgs.key;
      lStrIndexName = lObjArgs.indexName;

      lDBTransaction = $this.db.transaction(lStrStoreName, 'readonly');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore   = lDBTransaction.objectStore(lStrStoreName);
      lDBRequest = null;
      try {
        lDBRequest = lStrIndexName ?
                     lDBStore.index(lStrIndexName).get(lStrKey) :
                     lDBStore.get(lStrKey);
      } catch (e) {
        console.warn(e);
        lDBRequest = lDBStore.get(lStrKey);
      }

      lDBRequest.onsuccess = function() {
        console.info('onsuccess in get function of class Database.');

        resolve(this.result);
      };
      lDBRequest.onerror = reject;
    });
  };//}}}

  Database.prototype.getAll = function(lObjArgs) {//{{{
    var $this          = this;
    var lArrayResult   = [];
    var lStrStoreName  = '';
    var lStrIndexName  = '';
    var lDBTranslation = null;
    var lDBStore       = null;
    var lDBReq         = null;
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lArrayResult  = [];
      lStrStoreName = lObjArgs.name;
      lStrIndexName = lObjArgs.indexName;

      lDBTranslation = $this.db.transaction(lStrStoreName, 'readonly');
      lDBTranslation.oncomplete = resolve;
      lDBTranslation.onerror    = reject;

      lDBStore = lDBTranslation.objectStore(lStrStoreName);
      lDBReq   = null;
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
        console.info('onsucess in getAll function of Database class.');

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

    var $this          = this;
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);
    var lArrayResults  = [];
    var lStrStoreName  = "";
    var lStrIndexName  = "";
    var lNumDirection  = 0;
    var lDBRange       = null;
    var lDBTransaction = null;
    var lDBStore       = null;
    var lDBRequest     = null;

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lArrayResults = [];
      lStrStoreName = lObjArgs.name;
      lDBRange      = lObjArgs.range;
      lNumDirection = lObjArgs.direction;
      lStrIndexName = lObjArgs.indexName;

      lDBTransaction = $this.db.transaction(lStrStoreName, 'readonly');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore   = lDBTransaction.objectStore(lStrStoreName);
      lDBRequest = null;
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
        console.info('onsucess in getCursor function of Database class.');

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

    var $this          = this;
    var lDBStore       = null;
    var lDBRequest     = null;
    var lDBRange       = null;
    var lDBTransaction = null;
    var lStrName       = '';
    var lStrIndexName  = '';
    var lObjUpdate     = {};
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lDBStore      = null;
      lDBRequest    = null;
      lStrName      = pObjArgs.name;
      lDBRange      = pObjArgs.range;
      lStrIndexName = pObjArgs.indexName;
      lObjUpdate    = pObjArgs.update;

      lDBTransaction = $this.db.transaction(lStrName, 'readwrite');
      lDBTransaction.onabort = function(pEvent) {
        console.info('onabort in update function of Database class.');

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
        console.info('onsuccess in update function of Database class.');

        var lObjData   = {};
        var lObjCursor = this.result;
        if (lObjCursor) {
          lObjData = lObjCursor.value;

          Object.keys(lObjData).forEach(pKey => {
            if (lObjUpdate.hasOwnProperty(pKey)) {
              lObjData[pKey] = lObjUpdate[pKey];
            }
          });
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

    var $this          = this;
    var lStrStoreName  = '';
    var lArrayKeys     = [];
    var lArrayPromise  = [];
    var lDBTransaction = null;
    var lDBStore       = null;
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object', 'array' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lStrStoreName = pObjArgs.name;
      lArrayKeys    = (toType(pObjArgs.keys) !== 'array') ?
                            [ pObjArgs.keys ] : pObjArgs.keys;

      lDBTransaction = $this.db.transaction(lStrStoreName, 'readwrite');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore = lDBTransaction.objectStore(lStrStoreName);

      lArrayPromise = [];
      lArrayKeys.forEach(pValue => {
        lArrayPromise.push(
          new Promise((resolve, reject) => {
            var del       = lDBStore.delete(pValue);
            del.onsuccess = resolve;
            del.onerror   = reject;
          })
        );
      });

      Promise.all(lArrayPromise).then(resolve, e => reject(e.target.error));
    });
  };//}}}

  Database.prototype.clear = function(pStrStoreName) {//{{{
    console.info('called clear function of Database class.', pStrStoreName);

    var $this          = this;
    var lDBStore       = null;
    var lDBClear       = null;
    var lDBTransaction = null;
    var lStrErrMsg     = '';
    var lArrayArgs     = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'string' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lDBTransaction = $this.db.transaction(pStrStoreName, 'readwrite');
      lDBTransaction.oncomplete = resolve;
      lDBTransaction.onerror    = reject;

      lDBStore = lDBTransaction.objectStore(pStrStoreName);
      lDBClear = lDBStore.clear();
      lDBClear.onsuccess = resolve;
      lDBClear.onerror   = reject;
    });
  };//}}}

  Database.prototype.deleteDatabase = function() {//{{{
    console.info('called deleteAll function of Database class.');

    var $this      = this;
    var lDBRequest = null;
    return new Promise((resolve, reject) => {
      lDBRequest           = indexedDB.deleteDatabase($this.databaseName);
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
