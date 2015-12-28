(function() {
  "use strict";

  //{{{ variables.
  var sFuncBeep = closureCreateBeep().bind(null, 100, 800, 0.5, 'triangle');

  var sMapOptions = new Map();

  /**
   * set setInterval returned value.
   * key   = tabId
   * value = return setInterval value.
   */
  var sMapTicked = new Map();

  // Set the setInterval id of interval process.
  // While extension is running, continue to run.
  var sMapContinueRun = new Map();

  /**
   * When purge tabs, the object that the scroll position of purging tabs
   * is saved.
   * key   = tabId
   * value = the object that represent the scroll position(x, y).
   */
  var sMapTempScrollPos = new Map();

  // the string that represents the temporary exclusion list
  var sSetTempRelease = new Set();

  // Before selecting the active tab, and the user has been selected tab.
  var sMapOldActiveIds = new Map() ;

  var db                     = null; // indexedDB.
  var sNumCurrentSessionTime = 0;

  /// key: tabId, value: represent an icon.
  var sMapIconState          = new Map();

  var sNumCurrentTabId       = 0; // webRequest only.
  var sBoolDisableAutoPurge  = false;

  var sSetCreateTabId        = new Set();
  //}}}

  function getOpts(pAnyKey)//{{{
  {
    console.info('getOpts', Array.prototype.slice.call(arguments));

    if (sMapOptions.has(pAnyKey)) {
      return sMapOptions.get(pAnyKey);
    } else if (gMapDefaultValues.has(pAnyKey)) {
      return gMapDefaultValues.get(pAnyKey);
    }
    throw new Error(`Doesn't get the options: ${pAnyKey}`);
  }//}}}

  var sBoolUnloadedChange = false;
  /**
   * This instance object has created by closureCreateMapObserve function.
   * A key and a value are added
   * when have been running about the release process of a tab.
   *
   * key = tabId.
   * value = object.
   *    the values in the object are following.
   *       url            : the url before purging.
   *       scrollPosition : the object that represent the scroll position(x, y).
   *       windowId       : the windowId of the purged tab.
   */
  var sUnloadedObserve = closureCreateMapObserve(changed => {//{{{
    console.info('sUnloadedObserve was changed.', Object.assign({}, changed));

    var lNumTabId = 0;

    lNumTabId = parseInt(changed.key, 10);
    switch (changed.type) {
      case 'add':
        deleteTick(lNumTabId);
        chrome.tabs.get(lNumTabId, tab => {
          if (!isReleasePage(tab.url)) {
            writeHistory(tab);
          }
        });
        break;
      case 'delete':
        if (changed.hasOwnProperty('oldValue')) {
          sMapTempScrollPos.set(lNumTabId, changed.oldValue.scrollPosition);
        }
        setTick(lNumTabId).catch(e => console.error(e));
        break;
    }
    chrome.browserAction.setBadgeText(
      { text: sUnloadedObserve.size().toString() });

    sBoolUnloadedChange = true;
  });//}}}

  /**
   * setUnloaded
   *
   * Adds to sUnloadedObserve.
   *
   * @param {any} pStrKey -
   *     You want to add the key name.
   *     normally, the id of the tab.
   * @param {string} pStrUrl - You want to add the url.
   * @param {number} pNumWindowId - You want to add the windowId of tab.
   * @param {object} [pObjPos] -
   *     You want to add scrollPosition of the page of the tab.
   * @return {undefined}
   */
  function setUnloaded(pStrKey, pStrUrl, pNumWindowId, pObjPos)//{{{
  {
    console.info('setUnloaded', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ ],
      [ 'string' ],
      [ 'number' ],
      [ 'object', 'null', 'undefined' ],
    ], true);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    sUnloadedObserve.set(pStrKey, {
      url            : pStrUrl,
      windowId       : pNumWindowId,
      scrollPosition : pObjPos || { x : 0 , y : 0 },
    });
  }//}}}

  /**
   * Return the split object of the arguments of the url.
   *
   * @param {String} pStrUrl -  the url of getting parameters.
   * @param {String} pStrName -  the target parameter name.
   * @return {String} the string of a parameter.
   */
  function getParameterByName(pStrUrl, pStrName)//{{{
  {
    console.info('getParameterByName', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var lRegParameter = new RegExp(`[\\?&]${pStrName}\s*=\s*([^&#]*)`);
    var lStrResults   = lRegParameter.exec(decodeURIComponent(pStrUrl));
    return lStrResults === null ?
           "" : decodeURIComponent(lStrResults[1].replace(/\+/g, "%20"));
  }//}}}

  /**
   * When purged tabs, return the url for reloading tab.
   *
   * @param {string} pStrUrl - the url of the tab.
   * @return {Promise} return the promise object.
   *                   When be resolved, return the url for to purge.
   */
  function getPurgeURL(pStrUrl)//{{{
  {
    console.info('getPurgeURL', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var lStrPage = gStrBlankUrl;
    var lStrArgs = '&url=' + encodeURIComponent(pStrUrl).replace(/%20/g, '+');
    return encodeURI(lStrPage) + '?' + encodeURIComponent(lStrArgs);
  }//}}}

  /**
   * check run auto purge or not.
   * @return {Promise} return an promise object.
   */
  function autoPurgeCheck()//{{{
  {
    console.info('purgeCheck() in closureAutoPurgeCheck');

    var gNumRemaimingMemory = 0;

    return new Promise((resolve, reject) => {
      gNumRemaimingMemory = getOpts('remaiming_memory');

      isLackTheMemory(gNumRemaimingMemory)
      .then(result => {
        if (result === false) {
          resolve();
          return;
        }

        /* for-of is slow. this writing is fastest.
         * https://jsperf.com/es6-map-vs-object-properties/10
         * */
        sMapTicked.forEach((pValue, pKey) => {
          tick(pKey)
          .then(isLackTheMemory(gNumRemaimingMemory))
          .then(result => (result === false) ? resolve() : () => {})
          .catch(reject);
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
   * exclusive process for function.
   *
   * @param {string} name - to add a name of Function.
   * @param {function} callback -
   *     Function that performs an exclusive processing.
   * @param {Any} [callbackArgs] - pass arguments to Function.
   * @return {promise} return promise.
   */
  var exclusiveProcessForFunc = (() => {//{{{
    console.info('create closure of exclusiveProcessForFunc');

    var lSetLocks  = new Set();

    return function() {
      console.info('exclusiveProcessForFunc',
        Array.prototype.slice.call(arguments));

      var lArrayArgs         = Array.prototype.slice.call(arguments);
      var lStrName           = "";
      var lFuncCallback      = null;
      var lArrayCallbackArgs = [];
      var lStrErrMsg         = '';

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'string' ],
          [ 'function' ],
          [ ],
        ], true);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        if (lArrayArgs.length < 2) {
          reject(
            new Error(`Number of arguments is not enough:` +
                      ` ${lArrayArgs.length}`));
          return;
        }

        lStrName           = lArrayArgs[0];
        lFuncCallback      = lArrayArgs[1];
        lArrayCallbackArgs = lArrayArgs.length > 2 ?
                             lArrayArgs.slice(2) :
                             void 0;

        if (lSetLocks.has(lStrName)) {
          console.warn(`Already running process of: ${lStrName}`);
          resolve();
          return;
        }

        lSetLocks.add(lStrName);
        lFuncCallback.apply(null, lArrayCallbackArgs)
        .then(() => {
          console.log(`exclusiveProcess has resolve: ${lStrName}`);
          lSetLocks.delete(lStrName);
          resolve();
        })
        .catch(e => {
          console.log(`exclusiveProcess has reject: ${lStrName}`);
          lSetLocks.delete(lStrName);
          reject(e);
        });
      });
    };
  })();//}}}

  /**
   * redirectPurgedTabWhenCreateNewTab
   *
   * @param {object} pObjDetails -
   *     A object to get from a function of webRequest.
   * @return {object} return object for webRequest.
   */
  function redirectPurgedTabWhenCreateNewTab(pObjDetails)//{{{
  {
    console.info('redirectPurgedTabWhenCreateNewTab',
                 Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var lNumTabId = 0;
    var lStrUrl = "";

    if (pObjDetails.type === 'main_frame') {
      lNumTabId = pObjDetails.tabId;
      lStrUrl   = pObjDetails.url;

      if (sSetCreateTabId.has(lNumTabId)) {
        sSetCreateTabId.delete(lNumTabId);

        if (checkExcludeList(lStrUrl) & NORMAL) {
          if (sUnloadedObserve.has(lNumTabId)) {
            throw new Error(
              "TabId has already existed into sUnloadedObserve: " +
              `${JSON.stringify(pObjDetails)}`);
          }

          chrome.tabs.get(lNumTabId, tab => {
            setUnloaded(lNumTabId, lStrUrl, tab.windowId);
          });

          return { redirectUrl: getPurgeURL(lStrUrl) };
        }
      }
    }
    return {};
  }//}}}

  function loadScrollPosition(pNumTabId)//{{{
  {
    console.info('loadScrollPosition', Array.prototype.slice.call(arguments));

    var lArrayArgs = Array.prototype.slice.call(arguments);
    var lNumPos = 0;
    var lStrErrMsg = '';

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      if (sMapTempScrollPos.has(pNumTabId)) {
        lNumPos = sMapTempScrollPos.get(pNumTabId);

        chrome.tabs.executeScript(
          pNumTabId, { code: `scroll(${lNumPos.x}, ${lNumPos.y});` }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            sMapTempScrollPos.delete(pNumTabId);
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  }//}}}

  function purgingAllTabsExceptForTheActiveTab()//{{{
  {
    console.info('purgingAllTabsExceptForTheActiveTab');

    var lArrayPromise         = [];
    var lArrayNotReleasePages = [];
    var lNumAlreadyPurged     = 0;
    var lNumMaxOpeningTabs    = 0;
    var lNumMaxPurgeLength    = 0;

    return new Promise((resolve, reject) => {
      chrome.tabs.query({}, pTabs => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lArrayNotReleasePages = pTabs.filter(v => !isReleasePage(v.url));
        lNumAlreadyPurged     = pTabs.length - lArrayNotReleasePages.length;
        lNumMaxOpeningTabs    = getOpts('max_opening_tabs');
        lNumMaxPurgeLength =
          pTabs.length - lNumAlreadyPurged - lNumMaxOpeningTabs;
        if (lNumMaxPurgeLength <= 0) {
          console.log("The counts of open tabs are within set value.");
          resolve();
          return;
        }

        lArrayNotReleasePages = lArrayNotReleasePages.filter(
          v => !v.active && (checkExcludeList(v.url) & NORMAL) !== 0);

        lArrayPromise = [];
        for (var i = 0;
             i < lArrayNotReleasePages.length && i < lNumMaxPurgeLength;
             i = (i + 1) | 0) {
          lArrayPromise.push( tick(lArrayNotReleasePages[i].id) );
        }

        Promise.all(lArrayPromise).then(resolve).catch(reject);
      });
    });
  }//}}}

  /**
   * This function will check memory capacity.
   * If the memory is shortage, return true.
   *
   * @param {number} pCriteriaMemorySize - criteria memory size(MByte).
   * @return {promise} promiseが返る。
   */
  function isLackTheMemory(pNumCriteriaMemorySize)//{{{
  {
    console.info('isLackTheMemory', Array.prototype.slice.call(arguments));

    var lArrayArgs = Array.prototype.slice.call(arguments);
    var lStrErrMsg = '';
    var lNumRatio = 0;

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      chrome.system.memory.getInfo(info => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lNumRatio = info.availableCapacity / Math.pow(1024.0, 2);
        console.log('availableCapacity(MByte):', lNumRatio);
        resolve(lNumRatio < parseFloat(pNumCriteriaMemorySize));
      });
    });
  }//}}}

  function initializeIntervalProcess()//{{{
  {
    return new Promise((resolve, reject) => {
      intervalProcess(getOpts('interval_timing'))
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  // These processes are If you called at normal function,
  // May called multiple times at the same time.
  // Therefore, the callback function of setInterval is called.
  function intervalProcess(pNumIntervalTime)//{{{
  {
    console.info('initializeIntervalProcess',
      Array.prototype.slice.call(arguments));

    var lArrayArgs = Array.prototype.slice.call(arguments);
    var lStrErrMsg       = '';
    var lStrIntervalName = 'main';
    var pIntervalId      = 0;
    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      pIntervalId = sMapContinueRun.get(lStrIntervalName);
      if (pIntervalId !== void 0 || pIntervalId !== null) {
        console.warn(
          "Already running interval process, so its process is stop." +
          `Then create new interval process. ` +
          `lStrIntervalName: ${lStrIntervalName}`);

        clearInterval(pIntervalId);
        sMapContinueRun.delete(lStrIntervalName);
      }

      pIntervalId = setInterval(() => {//{{{
        console.log('run callback funciton of setInterval.');
        if (db === void 0 || db === null) {
          reject(new Error('IndexedDB is not initialized yet.'));
          return;
        }

        if (sBoolUnloadedChange) {
          sBoolUnloadedChange = false;

          // If this function was called the observe function of unloaded,
          // When user close multiple tabs, continuously call more than once.
          // Thus, the same session is added more than once.
          // So call at here.
          exclusiveProcessForFunc('writeSession', writeSession)
          .catch(e => console.error(e));
        }

        if (!sBoolDisableAutoPurge) {
          if (getOpts('purging_all_tabs_except_active') === true) {
            exclusiveProcessForFunc(
              'purgingAllTabs', purgingAllTabsExceptForTheActiveTab)
            .catch(e => console.error(e));
          }

          if (getOpts('enable_auto_purge') === true) {
            exclusiveProcessForFunc('autoPurgeCheck', autoPurgeCheck)
            .catch(e => console.error(e));
          }
        }
      }, pNumIntervalTime * 1000);//}}}

      sMapContinueRun.set(lStrIntervalName, pIntervalId);

      resolve();
    });
  }//}}}
  
  function deleteOldDatabase()//{{{
  {
    console.info('deleteOldDatabase');

    var lArrayPromise = [];

    return new Promise((resolve, reject) => {
      lArrayPromise = [];
      lArrayPromise.push( deleteOldSession() );
      lArrayPromise.push( deleteOldHistory() );

      Promise.all(lArrayPromise)
      .then(deleteNotUsePageInfo)
      .then(deleteNotUseDataURI)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteOldSession()//{{{
  {
    console.info('deleteOldSession');

    var lArrayDelKeys   = [];
    var lSetDate        = new Set();
    var lDBRange        = null;
    var lNumMaxSessions = 0;

    return new Promise((resolve, reject) => {
      db.getAll({
        name: gStrDbSessionName,
      })
      .then(rHistories => {
        lNumMaxSessions = parseInt(getOpts('max_sessions'), 10);

        lSetDate = new Set();
        rHistories.forEach(pValue => {
          lSetDate.add(pValue.date);
        });

        return (lSetDate.size < lNumMaxSessions) ?
                null :
                Array.from(lSetDate).slice(0, lSetDate.size - lNumMaxSessions);
      })
      .then(rArrayDateList => {
        if (rArrayDateList === null || rArrayDateList.length === 0) {
          return;
        }

        lDBRange = (rArrayDateList.length === 1) ?
                IDBKeyRange.only(rArrayDateList[0]) :
                IDBKeyRange.bound(
                  rArrayDateList[0], rArrayDateList[rArrayDateList.length - 1]);
        return db.getCursor({
          name:      gStrDbSessionName,
          range:     lDBRange,
          indexName: 'date',
        })
        .then(sessions => {
          lArrayDelKeys = sessions.map(v => v.id);
          return db.delete({ name: gStrDbSessionName, keys: lArrayDelKeys });
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteOldHistory()//{{{
  {
    console.info('deleteOldHistory');

    var lDateNow       = new Date();
    var lNumMaxHistory = 0;
    var lArrayDelKeys  = [];

    return new Promise((resolve, reject) => {
      lNumMaxHistory = parseInt(getOpts('max_history'), 10);
      lDateNow       = new Date();
      db.getCursor({
        name: gStrDbHistoryName,
        range: IDBKeyRange.upperBound(
          new Date(
            lDateNow.getFullYear(),
            lDateNow.getMonth(),
            lDateNow.getDate() - lNumMaxHistory,
            23, 59, 59, 999).getTime()
        ),
      })
      .then(histories => {
        lArrayDelKeys = histories.map(v => v.date);
        return db.delete({ name: gStrDbHistoryName, keys: lArrayDelKeys });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteNotUsePageInfo()//{{{
  {
    console.info('deleteNotUsePageInfo');

    var lArrayPageInfos     = [];
    var lArrayHistories     = [];
    var lArraySessions      = [];
    var lArraySavedSessions = [];
    var lArrayPromise       = [];
    var lArrayPromise2      = [];
    var lArrayDelKeys       = [];

    function check(pArray, pObjTarget)//{{{
    {
      var lStrErrMsg  = '';
      var lArrayArgs  = Array.prototype.slice.call(arguments);
      var lBoolResult = false;

      return new Promise((resolve3, reject3) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'array' ],
          [ 'object' ],
        ]);
        if (lStrErrMsg) {
          reject3(new Error(lStrErrMsg));
          return;
        }

        lBoolResult = pArray.some(v => (v.url === pObjTarget.url));
        if (lBoolResult) {
          reject3();
        } else {
          resolve3();
        }
      });
    }//}}}
    
    return new Promise((resolve, reject) => {
      lArrayPromise = [];
      lArrayPromise.push( db.getAll({ name: gStrDbPageInfoName     } ) );
      lArrayPromise.push( db.getAll({ name: gStrDbHistoryName      } ) );
      lArrayPromise.push( db.getAll({ name: gStrDbSessionName      } ) );
      lArrayPromise.push( db.getAll({ name: gStrDbSavedSessionName } ) );

      Promise.all(lArrayPromise)
      .then(results => {
        return new Promise((resolve2, reject2) => {
          lArrayPageInfos     = results[0];
          lArrayHistories     = results[1];
          lArraySessions      = results[2];
          lArraySavedSessions = results[3];

          lArrayPromise = [];
          lArrayPageInfos.forEach(pValue => {
            lArrayPromise.push(
              new Promise(resolve3 => {
                lArrayPromise2 = [];
                lArrayPromise2.push( check(lArrayHistories, pValue) );
                lArrayPromise2.push( check(lArraySessions, pValue) );
                lArrayPromise2.push( check(lArraySavedSessions, pValue) );
                Promise.all(lArrayPromise2).then(
                  () => resolve3(pValue.url),
                  () => resolve3(null)
                );
              })
            );
          });

          Promise.all(lArrayPromise).then(results2 => {
            lArrayDelKeys = results2.filter(v => (v !== null));
            return db.delete({ name: gStrDbPageInfoName, keys: lArrayDelKeys });
          })
          .then(resolve2)
          .catch(reject2);
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteNotUseDataURI()//{{{
  {
    console.info('deleteNotUseDataURI');

    var lArrayPromise   = [];
    var lArrayDataURIs  = [];
    var lArrayPageInfos = [];
    var lArrayDelKeys   = [];
    var lBoolResult     = false;

    return new Promise((resolve, reject) => {
      lArrayPromise = [];
      lArrayPromise.push( db.getAll({ name: gStrDbDataURIName } ) );
      lArrayPromise.push( db.getAll({ name: gStrDbPageInfoName } ) );

      Promise.all(lArrayPromise)
      .then(results => {
        lArrayDataURIs  = results[0];
        lArrayPageInfos = results[1];

        lArrayPromise = [];
        lArrayDataURIs.forEach(pValue => {
          lArrayPromise.push(
            new Promise(resolve3 => {
              lBoolResult =
                lArrayPageInfos.some(v2 => (v2.host === pValue.host));
              resolve3(lBoolResult ? null : pValue.host);
            })
          );
        });

        return Promise.all(lArrayPromise).then(results2 => {
          lArrayDelKeys = results2.filter(v => (v !== null));
          return db.delete({ name: gStrDbDataURIName, keys: lArrayDelKeys });
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function writeSession()//{{{
  {
    console.info('writeSession', Array.prototype.slice.call(arguments));

    var lArraySessionWrites = [];
    var lArrayDelKeys       = [];
    var lDate               = new Date();
    var lNumNowTime         = lDate.getTime();

    return new Promise((resolve, reject) => {
      lDate       = new Date();
      lNumNowTime = lDate.getTime();

      // sNumCurrentSessionTimeの処理
      (() => {
        return new Promise((resolve2, reject2) => {
          if (sNumCurrentSessionTime) {
            // previous current session is delete.
            db.getCursor({
              name:      gStrDbSessionName,
              range:     IDBKeyRange.only(sNumCurrentSessionTime),
              indexName: 'date',
            })
            .then(rHistories => {
              lArrayDelKeys = rHistories.map(v => v.id);
              return db.delete(
                { name: gStrDbSessionName, keys: lArrayDelKeys });
            })
            .then(resolve2)
            .catch(reject2);
          } else {
            resolve2();
          }
        });
      })()
      .then(() => {
        lArraySessionWrites = [];
        sUnloadedObserve.forEach(rObjValue => {
          if (rObjValue !== void 0 && rObjValue !== null &&
              rObjValue.url !== void 0 && rObjValue.url !== null &&
              rObjValue.url.length > 0) {
            lArraySessionWrites.push({
              date:     lNumNowTime,
              url:      rObjValue.url,
              windowId: rObjValue.windowId
            });
          } else {
            console.error("Doesn't find url.", rObjValue);
          }
        });

        return db.add({ name: gStrDbSessionName, data: lArraySessionWrites });
      })
      .then(() => {
        return new Promise((resolve2, reject2) => {
          if (lArraySessionWrites.length > 0) {
            sNumCurrentSessionTime = lNumNowTime;

            updatePreviousSessionTime(lNumNowTime)
            .then(resolve2)
            .catch(reject2);
          } else {
            sNumCurrentSessionTime = 0;

            deletePreviousSessionTime()
            .then(resolve2)
            .catch(reject2);
          }
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  var writeHistory = (function() {//{{{
    console.info('create closure of writeHistory');

    var lSetWrite     = new Set();

    return function(pObjTab) {
      console.info('writeHistory', Array.prototype.slice.call(arguments));

      var lDateNow         = new Date();
      var lDateBegin       = new Date();
      var lNumYear         = 0;
      var lNumMonth        = 0;
      var lNumDay          = 0;
      var lStrTabUrl       = "";
      var lStrTabTitle     = "";
      var lStrFaviconUrl   = "";
      var lStrUnknownTitle = 'Unknown';
      var lObjUri         = "";
      var lArrayDelKeys    = [];
      var lArrayPromise    = [];
      var lStrErrMsg       = '';
      var lArrayArgs       = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'object' ],
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        lStrTabUrl = pObjTab.url;

        if (lSetWrite.has(lStrTabUrl)) {
          console.warn(
            'Be running to write the same URL of a history to Database already.'
          );
          resolve();
          return;
        }
        lSetWrite.add(lStrTabUrl);

        lDateNow   = new Date();
        lNumYear   = lDateNow.getFullYear();
        lNumMonth  = lDateNow.getMonth();
        lNumDay    = lDateNow.getDate();
        lDateBegin = new Date(lNumYear, lNumMonth, lNumDay, 0, 0, 0, 0);

        db.getCursor({
          name:  gStrDbHistoryName,
          range: IDBKeyRange.lowerBound(lDateBegin.getTime()),
        })
        .then(rHistories => {
          lArrayDelKeys = rHistories.filter(
            v => (v.url === lStrTabUrl)).map(v => v.date);
          return db.delete({ name: gStrDbHistoryName, keys: lArrayDelKeys });
        })
        .then(() => {
          return db.add({
            name: gStrDbHistoryName,
            data: {
              date: lDateNow.getTime(),
              url:  lStrTabUrl,
            },
          });
        })
        .then(() => {
          return new Promise((resolve, reject) => {
            if (getOpts('get_title_when_does_not_title') === true &&
                !pObjTab.title) {
              ajax({ url:lStrTabUrl, responseType: 'document' })
              .then(pObjResult => {
                if (pObjResult.status === 200) {
                  resolve(pObjResult.response.title || lStrUnknownTitle);
                } else {
                  reject(new Error("Doesn't get title with ajax."));
                }
              })
              .then(resolve)
              .catch(reject);
            } else {
              resolve(pObjTab.title || lStrUnknownTitle);
              return;
            }
          });
        })
        .then(pStrTitle => {
          lStrTabTitle = pStrTitle;
          lObjUri      = getSplitURI(lStrTabUrl);

          lArrayPromise = [];

          // pageInfo
          lArrayPromise.push(
            db.add({
              name: gStrDbPageInfoName,
              data: {
                url:   lStrTabUrl,
                title: lStrTabTitle,
                host:  lObjUri.hostname,
              },
            })
          );
          // dataURI.
          lArrayPromise.push(
            new Promise(resolve3 => {
              lStrFaviconUrl =
                pObjTab.favIconUrl ||
                `${lObjUri.scheme}://${lObjUri.hostname}/favicon.ico`;

              getDataURI(lStrFaviconUrl)
              .then(dataURI => {
                return db.add({
                  name: gStrDbDataURIName,
                  data: {
                    host:    lObjUri.hostname,
                    dataURI: dataURI,
                  }
                });
              })
              .then(resolve3)
              .catch(pErr => {
                console.warn(pErr);
                console.warn("Don't find favIconUrl.", pObjTab);
                resolve3();
              });
            })
          );
          // If Promise was error, it is transaction error.
          // When its error was shown, to occur in the key already exist.
          // Therefore, I call the resolve function.
          return new Promise(resolve => {
            Promise.all(lArrayPromise).then(resolve).catch(resolve);
          });
        })
        .then(() => lSetWrite.delete(lStrTabUrl))
        .then(resolve)
        .catch(reject);
      });
    };
  })();//}}}

  function deleteAllPurgedTabUrlFromHistory()//{{{
  {
    console.info('deleteAllPurgedTabUrlFromHistory');

    var lRegBlankUrl   = new RegExp(`^${gStrBlankUrl}`, 'i');
    var lArrayPromise  = [];
    var lStrUrl        = "";
    var lSetDeleteUrls = new Set();

    return new Promise((resolve, reject) => {
      chrome.history.search({ text: '' }, histories => {
        lSetDeleteUrls = new Set();
        histories.forEach(pValue => {
          lStrUrl = pValue.url;
          if (lRegBlankUrl.test(lStrUrl)) {
            lSetDeleteUrls.add(lStrUrl);
          }
        });

        lArrayPromise = [];
        lSetDeleteUrls.forEach(pValue => {
          lArrayPromise.push(new Promise(
            resolve => chrome.history.deleteUrl({ url: pValue }, resolve)));
        });

        Promise.all(lArrayPromise).then(resolve).catch(reject);
      });
    });
  }//}}}

  /**
   * return the current tab object.
   *
   * @return {Promise} return promise object.
   *                   If run the reject function, return Error object.
   *                   If run the resolve function,
   *                   return the object of the current tab.
   */
  function getCurrentTab()//{{{
  {
    console.info('getCurrentTab');

    return new Promise((resolve, reject) => {
      chrome.tabs.query(
        { windowId: chrome.windows.WINDOW_ID_CURRENT, active: true },
        pArrayTabs => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(pArrayTabs[0]);
      });
    });
  }//}}}

  /**
   * check If the url has contained the release pages.
   *
   * @param {String} pStrUrl - the target url.
   * @return {Boolean} If the url is contained, return true.
   *                   if the different, return false.
   */
  function isReleasePage(pStrUrl)//{{{
  {
    console.info('isReleasePage', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return pStrUrl.indexOf(gStrBlankUrl) === 0;
  }//}}}

  /**
   * isPlayingSound
   *
   * Whether it is playing sound that given the tab.
   *
   * @param {Object} pObjTab - The tab object of chrome.tabs.
   * @return {Boolean} If the tab have been playing sound, True.
   *     haven't playing sound if False.
   */
  function isPlayingSound(pObjTab)//{{{
  {
    console.info('isPlayingSound', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return pObjTab.audible === true;
  }//}}}

  /**
  * Check whether the user matches that set the exclusion list.
  * @param {String} pStrUrl - the url to check whether matches.
  * @param {Object} pObjExclude - the object represent exclusion list settings.
  *     list    - 除外リストの値。複数のものは\nで区切る.
  *     options - 正規表現のオプション.
  *     returnValue - 一致したときに返す返り値
  * @return {Number} 引数にはnullかreturnValueの値が入る
  */
  function checkMatchUrlString(pStrUrl, pObjExclude)//{{{
  {
    console.info('checkMatchUrlString', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
      [ 'object' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var lRegExpUrl    = null;
    var lArrayExclude = [];
    var i             = 0;

    lArrayExclude = pObjExclude.list.split('\n');
    i = 0;
    for (i = 0; i < lArrayExclude.length; ++i) {
      if (lArrayExclude[i].length !== 0) {
        lRegExpUrl = new RegExp(lArrayExclude[i].trim(), pObjExclude.options);
        if (lRegExpUrl.test(pStrUrl)) {
          return pObjExclude.returnValue;
        }
      }
    }

    return null;
  }//}}}

  /**
   * return the exclusion list have been set argument,
   *
   * @param {String} pStrTarget - the name of the target list.
   *                   If the value is undefined, return normal exlusion list.
   * @return {Object} the object of the list relation.
   */
  function getTargetExcludeList(pStrTarget)//{{{
  {
    console.info('getTargetExcludeList', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'undefined', 'null', 'string' ],
    ], true);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    switch (pStrTarget) {
      case 'chrome':
        return {
          list:        gStrChromeExcludeUrl,
          options:     'i',
          returnValue: CHROME_EXCLUDE,
        };
      case 'extension':
        return {
          list:        gStrExtensionExcludeUrl,
          options:     'i',
          returnValue: EXTENSION_EXCLUDE,
        };
      case 'temp':
        return {
          list:        Array.from(sSetTempRelease).join('\n'),
          options:     'i',
          returnValue: TEMP_EXCLUDE,
        };
      case 'keybind':
        return {
          list:       getOpts('keybind_exclude_url'),
          options:    getOpts('keybind_regex_insensitive') ? 'i' : '',
          returnValue: KEYBIND_EXCLUDE,
        };
      default:
        return {
          list:        getOpts('exclude_url'),
          options:     getOpts('regex_insensitive') ? 'i' : '',
          returnValue: USE_EXCLUDE,
        };
    }

    throw new Error('getTargetExcludeList was error: ${pStrTarget}');
  }//}}}

  /**
  * 与えられたURLが全ての除外リストに一致するか検索する。
  * @param {String} pStrUrl - 対象のURL.
  * @return {Value} If be ran resolve function, return value is following.
  *               CHROME_EXCLUDE = chrome関係の除外リストと一致
  *               EXTENSION_EXCLUDE = 拡張機能関係のアドレスと一致
  *               USE_EXCLUDE    = ユーザー指定の除外アドレスと一致
  *               TEMP_EXCLUDE   = 一時的な非解放リストと一致
  *               KEYBIND_EXCLUDE = キーバインドの除外リストと一致
  *               NORMAL = 一致しなかった。
  *             And if match the exclusion list of key bindings,
  *             make a bit addition of KEYBIND_EXCLUDE.
  *
  *             When you compare these values, you should use bit addition.
  */
  function checkExcludeList(pStrUrl)//{{{
  {
    console.info('checkExcludeList', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string', 'null', 'undefined' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    if (pStrUrl === void 0 || pStrUrl === null || pStrUrl.length === 0) {
      return INVALID_EXCLUDE;
    }

    var lNumKeybind = 0;
    var lNumResult  = 0;

    // Check the keybind exclude list.
    lNumKeybind =
      checkMatchUrlString(pStrUrl, getTargetExcludeList('keybind')) || 0;

    // Check the exclude list for the extension.
    lNumResult = checkMatchUrlString(
      pStrUrl, getTargetExcludeList('extension'));
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // Check the exclude list for Google Chrome.
    lNumResult = checkMatchUrlString(pStrUrl, getTargetExcludeList('chrome'));
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // Check to the temporary exclude list.
    lNumResult = checkMatchUrlString(pStrUrl, getTargetExcludeList('temp'));
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // Check the normal exclude list.
    lNumResult = checkMatchUrlString(pStrUrl, getTargetExcludeList());
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // don't match the exclude lists.
    return NORMAL | lNumKeybind;
  }//}}}

  function reloadBrowserIconInAllActiveTab()//{{{
  {
    console.info('reloadBrowserIconInAllActiveTab');

    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true }, pArrayTabs => {
        pArrayTabs.forEach(pTab => {
          reloadBrowserIcon(pTab)
          .then(resolve)
          .catch(reject);
        });
      });
    });
  }//}}}

  /**
   * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
   * @param {object} pObjTab 対象のタブ.
   * @param {Promise} promiseが返る。
   */
  function reloadBrowserIcon(pObjTab)//{{{
  {
    console.info('reloadBrowserIcon', Array.prototype.slice.call(arguments));

    var lNumChangeIcon = 0;
    var lStrTitle      = '';
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

      lNumChangeIcon = sBoolDisableAutoPurge ?
                       DISABLE_AUTOPURGE :
                       checkExcludeList(pObjTab.url);
      chrome.browserAction.setIcon(
        { path: gMapIcons.get(lNumChangeIcon), tabId: pObjTab.id }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          sMapIconState.set(pObjTab.id, lNumChangeIcon);

          lStrTitle = 'Tab Memory Purge\n';
          if (lNumChangeIcon & DISABLE_AUTOPURGE) {
            lStrTitle += "The automatic purge of the all tabs has stopped.";
          } else if (lNumChangeIcon & NORMAL) {
            lStrTitle += "The url of this tab isn't include exclude list.";
          } else if (lNumChangeIcon & USE_EXCLUDE) {
            lStrTitle += "The url of this tab is included your exclude list.";
          } else if (lNumChangeIcon & TEMP_EXCLUDE) {
            lStrTitle += "The url of this tab is included" +
                         " your temporary exclude list.";
          } else if (lNumChangeIcon & EXTENSION_EXCLUDE) {
            lStrTitle += "The url of this tab is included" +
                         " exclude list of in this extension.";
          } else if (lNumChangeIcon & CHROME_EXCLUDE) {
            lStrTitle += "The url of this tab is included" +
                         " exclude list for Google Chrome.";
          } else {
            reject(new Error(`Invalid state. ${lNumChangeIcon}`));
            return;
          }

          if (lNumChangeIcon & KEYBIND_EXCLUDE) {
            lStrTitle +=
              "\nAnd also included in the exclude list of key bindings.";
          }

          chrome.browserAction.setTitle(
            { tabId: pObjTab.id, title: lStrTitle });
          resolve(lNumChangeIcon);
        }
      );
    });
  }//}}}

  /**
  * タブの解放を行います。
  * @param {Number} pNumTabId タブのID.
  * @param {Promise} promiseが返る。
  */
  function purge(pNumTabId)//{{{
  {
    console.info('purge', Array.prototype.slice.call(arguments));

    var lArrayPromise        = [];
    var lObjTab              = {};
    var lArrayScrollPosition = [];
    var lNumState            = 0;
    var lStrUrl              = "";
    var lStrErrMsg           = '';
    var lArrayArgs           = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      if (sUnloadedObserve.has(pNumTabId)) {
        reject(new Error(`Already purging. ${pNumTabId}`));
        return;
      }

      lArrayPromise.push(
        new Promise((resolve2, reject2) => {
          chrome.tabs.get(pNumTabId, rObjTab => {
            if (chrome.runtime.lastError) {
              reject2(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve2(rObjTab);
          });
        })
      );

      lArrayPromise.push(
        new Promise((resolve2, reject2) => {
          chrome.tabs.executeScript(
            pNumTabId, { file: gStrGetScrollPosScript }, rScrollPosition => {
              if (chrome.runtime.lastError) {
                reject2(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve2(rScrollPosition);
            }
          );
        })
      );

      Promise.all(lArrayPromise)
      .then(rResults => {
        lObjTab              = rResults[0];
        lArrayScrollPosition = rResults[1];

        if (lObjTab.status !== 'complete') {
          console.warn("The target tab has not been completed loading yet: " +
                       `${JSON.stringify(lObjTab)}`);
          resolve();
          return;
        }

        lNumState = checkExcludeList(lObjTab.url);
        if (lNumState & (CHROME_EXCLUDE | EXTENSION_EXCLUDE)) {
          reject(new Error(
            'The tabId have been included the exclusion list' +
            ` of extension and chrome: ${pNumTabId}`));
          return;
        } else if (lNumState & INVALID_EXCLUDE) {
          reject(new Error(`Don't get the url of the tab: ${pNumTabId}`));
          return;
        }

        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve2 => {
          chrome.tabs.sendMessage(
            pNumTabId, { event: 'form_cache' }, resolve2);
        });
      })
      .then(() => {
        return new Promise((resolve2, reject2) => {
          lStrUrl = getPurgeURL(lObjTab.url);

          chrome.tabs.executeScript(pNumTabId, {
            code: `window.location.replace("${lStrUrl}");` }, () => {
              if (chrome.runtime.lastError) {
                reject2(chrome.runtime.lastError);
                return;
              }
              resolve2();
            }
          );
        });
      })
      .then(() => {
        setUnloaded(
          pNumTabId, lObjTab.url, lObjTab.windowId, lArrayScrollPosition[0]);

        return exclusiveProcessForFunc(
          'deleteAllPurgedTabUrlFromHistory',
          deleteAllPurgedTabUrlFromHistory);
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
  * 解放したタブを復元します。
  * @param {Number} pNumId 復元するタブのID.
  * @return {Promise} promiseが返る。
  */
  function unPurge(pNumId)//{{{
  {
    console.info('unPurge', Array.prototype.slice.call(arguments));

    var lStrUrl    = "";
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lStrUrl = sUnloadedObserve.get(pNumId).url;
      chrome.tabs.sendMessage(pNumId,
        { event: 'location_replace' }, useChrome => {
          // If the lStrUrl is empty in purge page.
          if (useChrome) {
            chrome.tabs.update(pNumId, { url: lStrUrl }, resolve);
          } else {
            resolve();
          }
        }
      );
    });
  }//}}}

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} pNumTabId 処理を行うタブのID.
  * @return {Promise} Promiseが返る。
  */
  function tick(pNumTabId)//{{{
  {
    console.info('tick', Array.prototype.slice.call(arguments));

    var lNumState  = 0;
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      if (sUnloadedObserve.has(pNumTabId)) {
        deleteTick(pNumTabId);
        reject(new Error(
          `pNumTabId added to sUnloadedObserve already: ${pNumTabId}`));
        return;
      }

      chrome.tabs.get(pNumTabId, rObjTab => {
        if (chrome.runtime.lastError) {
          deleteTick(pNumTabId);
          reject(
            new Error(`tick function is skipped: ${pNumTabId}. message: ` +
              chrome.runtime.lastError.message));
          return;
        }

        // 全ての除外アドレス一覧と解放用のページと比較
        lNumState = checkExcludeList(rObjTab.url);
        if (!(lNumState & NORMAL) && !isReleasePage(rObjTab.url)) {
          // 除外アドレスに含まれている場合
          console.warn("the tab includes to the exclusion list: " +
                       ` ${JSON.stringify(rObjTab)}`);
          resolve();
          return;
        }

        if (getOpts('not_purge_playsound_tab') === true &&
            isPlayingSound(rObjTab)) {
          console.warn(
            `the tab have been playing sound: ${JSON.stringify(rObjTab)}`);
          resolve();
          return;
        }

        // If a tab is activated, updates unload time of a tab.
        (() => rObjTab.active ? setTick(pNumTabId) : purge(pNumTabId))()
        .then(resolve).catch(reject);
      });
    });
  }//}}}

  /**
  * 定期的な処理を停止
  * @param {Number} pNumId 停止するタブのID.
  */
  function deleteTick(pNumId)//{{{
  {
    console.info('deleteTick', Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'number' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    if (sMapTicked.has(pNumId)) {
      clearInterval(sMapTicked.get(pNumId));
      sMapTicked.delete(pNumId);
    }
  }//}}}

  /**
  * 定期的に解放処理の判断が行われるよう設定します。
  * 既に設定済みなら時間を延長します。
  * @param {Number} pNumTabId 設定するタブのID.
  * @return {Promise} Promiseが返る。
  */
  function setTick(pNumTabId)//{{{
  {
    console.info('setTick', Array.prototype.slice.call(arguments));

    var lNumTimer  = 0;
    var lNumIVal   = 0;
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      if (sBoolDisableAutoPurge) {
        console.log("Extension is disabled automatic purge.");
        resolve();
        return;
      }

      // 分(設定) * 秒数 * ミリ秒
      lNumTimer = parseInt(getOpts('timer'), 10) * 60 * 1000;

      // Update.
      deleteTick(pNumTabId);
      lNumIVal = setInterval(() => tick(pNumTabId), lNumTimer);
      sMapTicked.set(pNumTabId, lNumIVal);

      resolve();
    });
  }//}}}

  function updateAllTickIntervalOfTabs()//{{{
  {
    console.info('unloadedAllTickIntervalOfTabs');

    var lNumTabId = 0;

    return new Promise((resolve, reject) => {
      lNumTabId = 0;

      chrome.tabs.query({}, pArrayTabs => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        pArrayTabs.forEach(pValue => setTick(pValue.id));

        resolve();
      });
    });
  }//}}}

  /**
  * 指定した辞書型の再帰処理し、タブを復元する。
  * 引数は第一引数のみを指定。
  *
  * @param {array of object} pSessions
  *     You want to restore the array of sessions.
  * @return {Promise} promiseが返る。
  */
  var restore = (function() {//{{{
    console.info('create closure of restore.');

    function restoreTab(pObjSession)//{{{
    {
      console.info('restoreTab in closure of restore.',
        Array.prototype.slice.call(arguments));

      var rMapResults = new Map();
      var lNumWinId   = 0;
      var lStrUrl     = "";
      var lObjOpts    = {};
      var lStrErrMsg  = '';
      var lArrayArgs  = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'object' ],
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        rMapResults = new Map();
        lNumWinId   = pObjSession.windowId;
        lStrUrl     = pObjSession.url;
        lObjOpts    = { url: getPurgeURL(lStrUrl), active: false };

        if (lNumWinId) {
          lObjOpts.windowId = lNumWinId;
        }

        chrome.tabs.create(lObjOpts, rObjTab => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            rMapResults = new Map();
            rMapResults.set(rObjTab.id, {
              url            : lStrUrl,
              windowId       : rObjTab.windowId,
              scrollPosition : { x : 0 , y : 0 },
            });
            resolve(rMapResults);
          }
        );
      });
    }//}}}

    function restoreWindow(pArraySessions)//{{{
    {
      console.info('restoreWindow in closure of restore.',
        Array.prototype.slice.call(arguments));

      var rMapResults  = new Map();
      var lMapTempUrls = new Map();
      var lStrUrl      = "";
      var lArrayUrls   = [];
      var lStrErrMsg   = '';
      var lArrayArgs   = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'array' ],
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        lMapTempUrls = new Map();
        lArrayUrls   = [];
        pArraySessions.forEach(v => {
          lStrUrl = getPurgeURL(v.url);
          lMapTempUrls.set(lStrUrl, v.url);
          lArrayUrls.push(lStrUrl);
        });

        chrome.windows.create({ url: lArrayUrls }, win => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          rMapResults = new Map();
          win.tabs.forEach(pValue => {
            rMapResults.set(pValue.id, {
              url            : lMapTempUrls.get(pValue.url),
              windowId       : pValue.windowId,
              scrollPosition : { x : 0 , y : 0 },
            });
          });
          resolve(rMapResults);
        });
      });
    }//}}}

    function restoreSessionsInCurrentOrOriginal(//{{{
      pNumWinId, pArraySessions, pStrRestoreType)
    {
      console.info('restoreSessionsInCurrentOrOriginal in closure of restore.',
        Array.prototype.slice.call(arguments));

      var rMapResult    = new Map();
      var lArrayPromise = [];
      var lStrErrMsg    = '';
      var lArrayArgs    = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'number', 'undefined', 'null' ],
          [ 'array' ],
          [ 'string' ],
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        // restore tab to window of winId.
        lArrayPromise = [];
        pArraySessions.forEach(pValue => {
          if (pStrRestoreType === 'restore_to_original_window') {
            pValue.windowId = pNumWinId;
          } else {
            delete pValue.windowId;
          }
          lArrayPromise.push( restoreTab(pValue) );
        });

        Promise.all(lArrayPromise).then(results => {
          rMapResult = new Map();
          results.forEach(pValue => {
            pValue.forEach((pValueJ, pKeyJ) => {
              rMapResult.set(pKeyJ, pValueJ);
            });
          });
          return rMapResult;
        })
        .then(resolve)
        .catch(reject);
      });
    }//}}}

    function restoreSessions(pNumWinId, pArraySessions, pStrRestoreType)//{{{
    {
      console.info('restoreSessions in closure if restore',
        Array.prototype.slice.call(arguments));

      var lStrErrMsg = '';
      var lArrayArgs = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'number', 'null', 'undefined' ],
          [ 'array' ],
          [ 'string' ],
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        switch (pStrRestoreType) {
        case 'restore_to_current_window':
          restoreSessionsInCurrentOrOriginal.apply(null, lArrayArgs)
          .then(resolve)
          .catch(reject);
          break;
        case 'restore_to_original_window':
          (function(pWindowId) {
            var lStrErrMsg = '';
            var lArrayArgs = Array.prototype.slice.call(arguments);

            return new Promise((resolve, reject) => {
              lStrErrMsg = checkFunctionArguments(lArrayArgs, [
                [ 'number', 'null', 'undefined' ],
              ], true);
              if (lStrErrMsg) {
                reject(new Error(lStrErrMsg));
                return;
              }

              if (pWindowId) {
                chrome.tabs.query({ windowId: pWindowId }, pArrayTabs => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                  }
                  resolve(pArrayTabs.length !== 0);
                });
              } else {
                resolve(false);
              }
            });
          })(pNumWinId)
          .then(isWin => {
            if (isWin) {
              return restoreSessionsInCurrentOrOriginal.apply(null, lArrayArgs);
            } else {
              // create window. therefore, to restore.
              return restoreWindow(pArraySessions);
            }
          })
          .then(resolve)
          .catch(reject);
          break;
        case 'restore_to_new_window':
          restoreWindow(pArraySessions)
          .then(resolve)
          .catch(reject);
          break;
        default:
          reject(new Error("pStrRestoreType is invalid."));
          return;
        }
      });
    }//}}}

    return function(pArraySessions, pStrRestoreType) {//{{{
      console.info('restore', Array.prototype.slice.call(arguments));

      var lMapEachWindow         = new Map();
      var lArrayList             = [];
      var lArrayPromise          = [];
      var lStrRestoreTypeOptName = "";
      var lNumWinId              = 0;
      var lStrErrMsg             = '';
      var lArrayArgs             = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'array' ],
          [ 'null', 'undefined', 'string' ],
        ], true);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        if (pStrRestoreType === void 0 || pStrRestoreType === null) {
          lStrRestoreTypeOptName = 'restored_type';
          pStrRestoreType = getOpts(lStrRestoreTypeOptName);
        }

        lMapEachWindow = new Map();
        lArrayList     = [];
        pArraySessions.forEach(pValue => {
          lNumWinId     = pValue.windowId;
          lArrayList    = lMapEachWindow.get(lNumWinId) || [];
          lArrayList.push(pValue);
          lMapEachWindow.set(lNumWinId, lArrayList);
        });

        lArrayPromise = [];
        lMapEachWindow.forEach((pValue, pKey) => {
          lArrayPromise.push(restoreSessions(pKey, pValue, pStrRestoreType));
        });

        Promise.all(lArrayPromise)
        .then(rResults => {
          rResults.forEach(pValue => {
            pValue.forEach((pValueJ, pNumTabId) => {
              if (!sUnloadedObserve.has(pNumTabId)) {
                sUnloadedObserve.set(pNumTabId, pValueJ);
              } else {
                console.error(
                  'same tabId is found in sUnloadedObserve object.', pNumTabId);
              }
            });
          });
        })
        .then(resolve)
        .catch(reject);
      });
    };//}}}
  })();//}}}

  function switchTempRelease(pStrUrl, pStrType)//{{{
  {
    console.info('switchTempRelease', Array.prototype.slice.call(arguments));

    var lRegexUrlInArg   = new RegExp();
    var lRegexUrlInTemp  = new RegExp();
    var lArrayDelKeys    = [];
    var lStrUrlForRegExp = '';

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
      [ 'string', 'undefined', 'null' ],
    ], true);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lStrUrlForRegExp = escapeForRegExp(pStrUrl);

    lRegexUrlInArg = new RegExp(lStrUrlForRegExp);
    lArrayDelKeys  = [];
    sSetTempRelease.forEach(pValue => {
      lRegexUrlInTemp = new RegExp(pValue);
      if (lRegexUrlInArg.test( decodeForRegExp(pValue) )) {
        lArrayDelKeys.push(pValue);
      }
    });

    lArrayDelKeys.forEach(pValue => sSetTempRelease.delete(pValue));

    if ((lArrayDelKeys.length === 0 && toType(pStrType) !== 'string') ||
        pStrType === 'add') {
      sSetTempRelease.add(lStrUrlForRegExp);
    }
  }//}}}

  /**
  * 指定されたタブに最も近い未解放のタブをアクティブにする。
  * 右側から探索され、見つからなかったら左側を探索する。
  * 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
  * @param {object} pObjTab 基準点となるタブ.
  * @return {Promise} promiseが返る。
  */
  function searchUnloadedTabNearPosition(pObjTab)//{{{
  {
    console.info('searchUnloadedTabNearPosition',
      Array.prototype.slice.call(arguments));

    var lArrayTabs       = [];
    var lObjActiveTab    = {};
    var lStrErrMsg       = '';
    var lArrayArgs       = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) {
          return toType(pValue) !== 'object' &&
                 !pValue.hasOwnProperty('index') &&
                 !pValue.hasOwnProperty('windowId');
        },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      // 現在のタブの左右の未解放のタブを選択する
      chrome.tabs.query({ windowId: pObjTab.windowId }, pArrayTabs => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lArrayTabs = pArrayTabs.filter(v =>
          !sUnloadedObserve.has(v.id) && !isReleasePage(v.url));
        lObjActiveTab = lArrayTabs.find(v => (pObjTab.index <= v.index));
        if (lObjActiveTab === void 0 || lObjActiveTab === null) {
          lObjActiveTab =
            lArrayTabs.reverse().find(v => (pObjTab.index > v.index));
        }

        if (lObjActiveTab === void 0 || lObjActiveTab === null) {
          // If can not find the tab to activate to create a new tab.
          chrome.tabs.create({ active: true }, resolve);
        } else {
          // If found tab, It's active.
          chrome.tabs.update(lObjActiveTab.id, { active: true }, resolve);
        }
      });
    });
  }//}}}

  /**
   * 拡張機能がインストールされたときの処理
   */
  function onInstall()//{{{
  {
    console.info('Extension Installed.');

    return new Promise(resolve => {
      chrome.runtime.openOptionsPage(resolve);
    });
  }//}}}

  function restoreSessionBeforeUpdate(pPreviousSessionTime)//{{{
  {
    console.info('restoreSessionBeforeUpdate',
      Array.prototype.slice.call(arguments));

    var lArrayRestoreSessions = [];
    var lStrErrMsg            = '';
    var lArrayArgs            = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ], true);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      db.getCursor({
        name:      gStrDbSessionName,
        range:     IDBKeyRange.only(pPreviousSessionTime),
        indexName: 'date',
      })
      .then(sessions => {
        if (sessions.length === 0) {
          return;
        }

        lArrayRestoreSessions = [];
        sessions.forEach(pValue => {
          lArrayRestoreSessions.push(
            { url: pValue.url, windowId: pValue.windowId });
        });

        if (lArrayRestoreSessions.length > 0) {
          return restore(lArrayRestoreSessions);
        }
        return;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
   * 拡張機能がアップデートされたときの処理
   */
  function onUpdate()//{{{
  {
    console.info('Extension Updated.');

    return new Promise((resolve, reject) => {
      getInitAndLoadOptions()
      .then(pOptions => {
        if (pOptions.get(gStrPreviousSessionTimeKey)) {
          return showDialogOfRestoreSessionBeforeUpdate();
        } else {
          return;
        }
      })
      .then(() => {
        return new Promise((resolve2, reject2) => {
          chrome.tabs.create({
            url: `${gStrOptionPage}?page=change_history`,
            active: true
          }, () => {
            if (chrome.runtime.lastError) {
              reject2(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve2();
          });
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
   * 拡張機能のバージョンを返す
   * @return {String} 拡張機能のバージョン.
   */
  function getVersion()//{{{
  {
    console.info('getVersion');
    var lObjDetails= chrome.app.getDetails();
    return lObjDetails.version;
  }//}}}

  function versionCheckAndUpdate()//{{{
  {
    console.info('versionCheckUpdate');

    return new Promise((resolve, reject) => {
      var lNumCurrentVersion  = 0;
      var lNumPreviousVersion = 0;
      var lObjWrite           = {};
      var lFuncRun             = null;

      lNumCurrentVersion = getVersion();
      chrome.storage.local.get(gStrVersionKey, pStorages => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lNumPreviousVersion = pStorages[gStrVersionKey];
        lFuncRun = null;
        if (lNumCurrentVersion === void 0 || lNumCurrentVersion === null) {
          lFuncRun = onInstall;
        } else if (lNumCurrentVersion !== lNumPreviousVersion) {
          lFuncRun = onUpdate;
        } else {
          resolve();
          return;
        }

        (() => {
          return new Promise(resolve => {
            lObjWrite = {};
            lObjWrite[gStrVersionKey] = lNumCurrentVersion;
            chrome.storage.local.set(lObjWrite, resolve);
          });
        })()
        .then(lFuncRun)
        .then(resolve)
        .catch(reject);
      });
    });
  }//}}}

  function updatePreviousSessionTime(pNumTime)//{{{
  {
    console.info('updatePreviousSessionTime',
      Array.prototype.slice.call(arguments));

    var lObjWrite = {};
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lObjWrite = {};
      lObjWrite[gStrPreviousSessionTimeKey] = pNumTime;
      chrome.storage.local.set(lObjWrite, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }//}}}

  function deletePreviousSessionTime()//{{{
  {
    console.info('deletePreviousSessionTime');

    return new Promise((resolve, reject) => {
      // delete old current session time.
      chrome.storage.local.remove(gStrPreviousSessionTimeKey, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }//}}}

  /**
   * getInitAndLoadOptions
   * Load my options in chrome.storage.
   * And If an item doesn't contain to default values, it is deleted.
   * And those are deleted too from chrome.storage.
   *
   * @return {Promise} return promise.
   *                   If returned reject, return a error message.
   *                   If returned resolve, return getting my options.
   */
  function getInitAndLoadOptions()//{{{
  {
    console.info('getInitAndLoadOptions');

    return new Promise((resolve, reject) => {
      var lArrayRemoveKeys = [];
      var lMapOptions      = new Map();

      chrome.storage.local.get(pItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // All remove invalid options. but exclude version.
        lArrayRemoveKeys = [];
        Object.keys(pItems).forEach(pStrKey => {
          if (!gMapDefaultValues.has(pStrKey)) {
            lArrayRemoveKeys.push(pStrKey);
            delete pItems[pStrKey];
          }
        });

        chrome.storage.local.remove(lArrayRemoveKeys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          // My options are initialized.
          lMapOptions = new Map();
          Object.keys(pItems).forEach(v => lMapOptions.set(v, pItems[v]));
          gMapDefaultValues.forEach((pValue, pStrKey) => {
            if (!lMapOptions.has(pStrKey)) {
              lMapOptions.set(pStrKey, pValue);
            }
          });

          resolve(lMapOptions);
        });
      });
    });
  }//}}}

  function initializeUseOptions(pMapOptions)//{{{
  {
    console.info('initializeUseOptions', Array.prototype.slice.call(arguments));

    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'map' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      sMapOptions = pMapOptions;

      // initialize badge.
      chrome.browserAction.setBadgeText(
        { text: sUnloadedObserve.size().toString() });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF' });

      resolve();
    });
  }//}}}

  var initializeAlreadyPurgedTabs = (function() {//{{{
    console.info('create closure of initializeAlreadyPurgedTabs.');

    function toAdd(pObjCurrent)
    {
      var lNumResult = 0;
      var lStrErrMsg = '';
      var lArrayArgs = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          [ 'object' ],
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        lNumResult = checkExcludeList(pObjCurrent.url);
        if (lNumResult ^ (NORMAL & INVALID_EXCLUDE)) {
          if (isReleasePage(pObjCurrent.url)) {
            setUnloaded(
              pObjCurrent.id,
              getParameterByName(pObjCurrent.url, 'url'),
              pObjCurrent.windowId);
          }

          setTick(pObjCurrent.id).then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    }

    return function() {
      console.info('initializeAlreadyPurgedTabs');

      var lArrayPromise = [];

      return new Promise((resolve, reject) => {
        chrome.tabs.query({}, pTabs => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          // If already purging tab, be adding the object of purging tab.
          lArrayPromise = [];
          pTabs.forEach(pValue => {
            lArrayPromise.push( toAdd(pValue) );
          });

          Promise.all(lArrayPromise).then(resolve).catch(reject);
        });
      });
    };
  })();//}}}

  var initializeDatabase = (function() {//{{{
    function dbOpen()
    {
      // db is global. but only in script.
      db = new Database(gStrDbName, gNumDbVersion);
      return db.open(gObjDbCreateStores);
    }

    return function() {
      return new Promise((resolve, reject) => {
        if (db === void 0 || db === null) {
          dbOpen()
          .then(resolve)
          .catch(reject);
        } else {
          db.close()
          .then(dbOpen)
          .then(resolve)
          .catch(reject);
        }
      });
    };
  })();//}}}

  /**
   * be initializing.
   */
  function initialize()//{{{
  {
    initializeDatabase()
    .then(versionCheckAndUpdate)
    .then(getInitAndLoadOptions)
    .then(initializeUseOptions)
    .then(initializeAlreadyPurgedTabs)
    .then(initializeIntervalProcess)
    .then(initializeIntervalUpdateCheck(gNumUpdateCheckTime))
    .then(deleteOldDatabase)
    .then(deleteAllPurgedTabUrlFromHistory)
    .catch(e => console.error(e || 'initialize error.'));
  }//}}}

  var switchDisableTimerState = (function() {//{{{
    console.info('create closure of switchDisableTimerState');

    return function() {
      console.info('switchDisableTimerState');

      return new Promise((resolve, reject) => {
        if (sBoolDisableAutoPurge) {
          updateAllTickIntervalOfTabs()
          .then(() => {
            sBoolDisableAutoPurge = false;
          })
          .then(resolve)
          .catch(reject);
        } else {
          sMapTicked.forEach(pValue => clearInterval(pValue));
          sMapTicked.clear();

          sBoolDisableAutoPurge = true;
          resolve();
        }
      });
    };
  })();//}}}

  /**
   * onActivatedFunc
   *
   * @param {number} pNumTabId the id of the tab.
   * @return {Promise} promiseが返る。
   */
  function onActivatedFunc(pNumTabId)//{{{
  {
    console.info('onActivatedFunc', Array.prototype.slice.call(arguments));

    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      chrome.tabs.get(pNumTabId, pTab => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // 前にアクティブにされていたタブのアンロード時間を更新
        if (sMapOldActiveIds.has(pTab.WindowId)) {
          setTick(sMapOldActiveIds.get(pTab.windowId));
        }
        sMapOldActiveIds.set(pTab.windowId, pNumTabId);

        // アイコンの状態を変更
        reloadBrowserIcon(pTab).then(resolve).catch(reject);
      });
    });
  }//}}}

  function updateOptionValues()//{{{
  {
    console.info('updateOptionValues');

    return new Promise((resolve, reject) => {
      getInitAndLoadOptions()
      .then(pOptions => {
        sMapOptions = pOptions;
      })
      .then(updateAllTickIntervalOfTabs)
      .then(initializeIntervalProcess)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function updateCheck()//{{{
  {
    console.info('updateCheck');

    return new Promise(resolve => {
      chrome.runtime.requestUpdateCheck((pStrStatus, pStrVersion) => {
        switch (pStrStatus) {
        case 'update_available':
          console.log('update is avaliable now.');
          resolve(pStrVersion);
          return;
        case 'no_update':
          console.log('no update found.');
          break;
        case 'throttled':
          console.log('Has been occurring many request update checks. ' +
                      'You need to back off the updating request.');
          break;
        }

        resolve(null);
      });
    });
  }//}}}

  function initializeIntervalUpdateCheck(pNumCheckTime)//{{{
  {
    console.info('initializeIntervalUpdateCheck',
      Array.prototype.slice.call(arguments));

    var lStrIntervalName = 'updateCheck';
    var lStrIntervalId   = '';
    var lStrErrMsg       = '';
    var lArrayArgs       = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lStrIntervalId = sMapContinueRun.get(lStrIntervalName);
      if (lStrIntervalId !== void 0 && lStrIntervalId !== null) {
        console.warn('already be running the update check process, ' +
                     "so it's stop, and restart.");
        clearInterval(lStrIntervalId);
        sMapContinueRun.delete(lStrIntervalName);
      }

      lStrIntervalId = setInterval(updateCheck, pNumCheckTime);
      sMapContinueRun.set('updateCheck', lStrIntervalId);
      resolve();
    });
  }//}}}

  function showDialogOfRestoreSessionBeforeUpdate() {//{{{
    return new Promise(resolve => {
      chrome.notifications.create(
        RESTORE_PREVIOUS_SESSION,
        {
          type:    'basic',
          title:   'Restore the session before update.',
          message: 'Do want to restore the session before update?',
          iconUrl: gMapIcons.get(EXTENSION_ICON_128),
          buttons: [
            { title: 'Restore' },
            { title: 'No' },
          ],
        },
        pResult => {
          sFuncBeep();
          resolve(pResult);
        }
      );
    });
  }//}}}

  function showUpdateConfirmationDialog() {//{{{
    return new Promise(resolve => {
      chrome.notifications.create(
        UPDATE_CONFIRM_DIALOG,
        {
          type:    'basic',
          title:   'Update is available.',
          message: 'New version is available now.',
          iconUrl: gMapIcons.get(EXTENSION_ICON_128),
          buttons: [
            { title: 'Update' },
            { title: 'Later' },
          ],
        },
        pResult => {
          sFuncBeep();
          resolve(pResult);
        }
      );
    });
  }//}}}

  chrome.webRequest.onBeforeRequest.addListener(pObjDetails => {//{{{
    // console.info('webRequest.onBeforeRequest', pObjDetails);

    if (getOpts('new_tab_opens_with_purged_tab') === true) {
      if (sNumCurrentTabId !== pObjDetails.tabId) {
        return redirectPurgedTabWhenCreateNewTab(pObjDetails);
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]);//}}}

  chrome.tabs.onActivated.addListener(pObjActiveInfo => {//{{{
    console.info('chrome.tabs.onActivated.', pObjActiveInfo);

    sNumCurrentTabId = pObjActiveInfo.tabId;
    if (sUnloadedObserve.has(pObjActiveInfo.tabId) &&
        getOpts('no_release') === false) {
        unPurge(pObjActiveInfo.tabId)
        .then(onActivatedFunc(pObjActiveInfo.tabId))
        .catch(e => console.error(e));
    } else {
      onActivatedFunc(pObjActiveInfo.tabId)
      .catch(e => console.error(e));
    }
  });//}}}

  chrome.tabs.onCreated.addListener(pTab => {//{{{
    console.info('chrome.tabs.onCreated.', pTab);

    sSetCreateTabId.add(pTab.id);
    setTick(pTab.id).catch(e => console.error(e));
  });//}}}

  chrome.tabs.onRemoved.addListener(pTabId => {//{{{
    console.info('chrome.tabs.onRemoved.', pTabId);

    sUnloadedObserve.delete(pTabId);
    deleteTick(pTabId);
    sMapIconState.delete(pTabId);
  });//}}}

  chrome.tabs.onAttached.addListener(pTabId => {//{{{
    console.info('chrome.tabs.onAttached.', pTabId);

    setTick(pTabId).catch(e => console.error(e));
  });//}}}

  chrome.tabs.onDetached.addListener(pTabId => {//{{{
    console.info('chrome.tabs.onDetached.', pTabId);

    sUnloadedObserve.delete(pTabId);
    deleteTick(pTabId);
    sMapIconState.delete(pTabId);
  });//}}}

  chrome.tabs.onUpdated.addListener((pTabId, pObjChangeInfo, pTab) => {//{{{
    if (pObjChangeInfo.status === 'loading') {
      console.info('chrome.tabs.onUpdated. loading.',
                   Array.prototype.slice.call(arguments));

      if (!isReleasePage(pTab.url) && sUnloadedObserve.has(pTabId)) {
        sUnloadedObserve.delete(pTabId);
      }
    } else {
      console.info('chrome.tabs.onUpdated. complete.',
                   Array.prototype.slice.call(arguments));

      loadScrollPosition(pTabId)
      .then(reloadBrowserIcon(pTab))
      .catch(e => console.error(e));
    }
  });//}}}

  chrome.windows.onRemoved.addListener(pNumWindowId => {//{{{
    console.info('chrome.windows.onRemoved.', pNumWindowId);
    sMapOldActiveIds.delete(pNumWindowId);
  });//}}}

  chrome.runtime.onMessage.addListener(//{{{
    (pObjMessage, pObjSender, pFuncSendResponse) => {
      console.info('chrome.runtime.onMessage.',
                   Array.prototype.slice.call(arguments));

      var lArrayPromise   = [];
      var lArrayTarget    = [];
      var lNumTabId       = 0;
      var lNumState       = 0;
      var lNumResultState = 0;
      var lStrAddUrl      = '';

      switch (pObjMessage.event) {
        case 'initialize':
          initialize();
          break;
        case 'release':
          // toggle purged tab.
          getCurrentTab()
          .then(pObjTab => {
            if (sUnloadedObserve.has(pObjTab.id)) {
              return unPurge(pObjTab.id);
            } else {
              return purge(pObjTab.id)
                     .then(searchUnloadedTabNearPosition(pObjTab));
            }
          })
          .catch(e => console.error(e));
          break;
        case 'switch_not_release':
        case 'switch_not_release_host':
          getCurrentTab()
          .then(pTab => {
            lStrAddUrl = (pObjMessage.event === 'switch_not_release_host' ||
                          pObjMessage.addType === 'host') ?
                          getSplitURI(pTab.url).hostname :
                          pTab.url;
            switchTempRelease(lStrAddUrl, pObjMessage.type);

            return setTick(pTab.id);
          })
          .then(reloadBrowserIconInAllActiveTab)
          .catch(e => console.error(e));
          break;
        case 'all_purge':
        case 'all_purge_without_exclude_list':
          chrome.tabs.query({}, pArrayResults => {
            if (chrome.runtime.lastError) {
              console.error(new Error(chrome.runtime.lastError.message));
              return;
            }

            lArrayTarget = pArrayResults.filter(v => {
              lNumState       = checkExcludeList(v.url);
              lNumResultState = (pObjMessage.event === 'all_purge') ?
                ~(CHROME_EXCLUDE | EXTENSION_EXCLUDE | INVALID_EXCLUDE) &
                   lNumState : NORMAL & lNumState;
               return !sUnloadedObserve.has(v.id) &&
                      lNumResultState !== 0;
            });
            if (lArrayTarget.length === 0) {
              return;
            }

            lArrayPromise = [];
            lArrayTarget.forEach(v => lArrayPromise.push( purge(v.id) ));

            Promise.all(lArrayPromise)
            .then(getCurrentTab)
            .then(searchUnloadedTabNearPosition)
            .catch(e => console.error(e));
          });
          break;
        case 'all_unpurge':
          // 解放されている全てのタブを解放解除
          sUnloadedObserve.forEach((pStrValue, pStrKey) => {
            unPurge(parseInt(pStrKey, 10)).catch(e => console.error(e));
          });
          break;
        case 'switch_timer_state':
          switchDisableTimerState()
          .then(reloadBrowserIconInAllActiveTab)
          .catch(e => console.error(e));
          break;
        case 'add_current_tab_exclude_list':
          getCurrentTab()
          .then(pObjTab => {
            return new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(
                pObjTab.id, { event: 'getExcludeDialogState' }, pBoolState => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                  }
                  resolve([pObjTab, pBoolState]);
                });
            });
          })
          .then(pArrayItem => {
            return new Promise((resolve, reject) => {
              var lObjTab     = pArrayItem[0];
              var lBoolState  = pArrayItem[1];
              var lStrMessage = '';

              lStrMessage = (lBoolState === true) ? 'hide' : 'show';
              lStrMessage += 'ExcludeDialog';

              chrome.tabs.sendMessage(
                lObjTab.id, { event: lStrMessage }, () => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                  }
                  resolve();
                });
            });
          })
          .catch(e => console.error(e));
          break;
        case 'add_to_temp_exclude_list':
          getCurrentTab()
          .then(pObjTab => {
            switchTempRelease(pObjMessage.url, 'add');
            return setTick(pObjTab.id);
          })
          .then(reloadBrowserIconInAllActiveTab)
          .catch(e => console.error(e));
          break;
        case 'clear_temporary_exclusion_list':
          sSetTempRelease.clear();
          reloadBrowserIconInAllActiveTab();
          break;
        case 'reload_option_value':
          updateOptionValues()
          .then(reloadBrowserIconInAllActiveTab)
          .catch(e => console.error(e));
          break;
        case 'load_options_and_reload_current_tab':
          lArrayPromise = [];
          lArrayPromise.push( getCurrentTab() );
          lArrayPromise.push( updateOptionValues() );
          Promise.all(lArrayPromise).then(pArrayResults => {
            return setTick(pArrayResults[0].id);
          })
          .then(reloadBrowserIconInAllActiveTab)
          .catch(e => console.error(e));
          break;
        case 'restore':
          restore(pObjMessage.session)
          .then(() => console.log('restore is completed.'))
          .catch(e => console.error(e));
          break;
        case 'check_purged_tab':
          lNumTabId = pObjSender.tab.id;
          if (!sUnloadedObserve.has(lNumTabId)) {
            chrome.tabs.get(lNumTabId, pObjTab => {
              setUnloaded(lNumTabId, pObjMessage.url, pObjTab.windowId);
            });
            pFuncSendResponse(true);
          } else {
            pFuncSendResponse(false);
          }
          break;
        case 'get_icon_state':
          pFuncSendResponse(sMapIconState.get(pObjMessage.tabId));
          break;
        case 'keybind_check_exclude_list':
          lNumState = checkExcludeList(pObjMessage.location.href);
          pFuncSendResponse(!(lNumState &
            (CHROME_EXCLUDE | EXTENSION_EXCLUDE |
             KEYBIND_EXCLUDE | INVALID_EXCLUDE)));
          break;
      }
    }
  );//}}}

  chrome.runtime.onUpdateAvailable.addListener(pObjDetails => {//{{{
    console.info("runtime.onUpdateAvailable", pObjDetails);
    showUpdateConfirmationDialog()
    .catch(e => console.error(e));
  });//}}}

  chrome.notifications.onButtonClicked.addListener(//{{{
    (pStrNotificationId, pButtonIndex) => {
      console.info('nortifications.onButtonClicked',
                   Array.prototype.slice.call(arguments));
      (() => {
        return new Promise((resolve, reject) => {
          chrome.notifications.clear(pStrNotificationId, pWasCleared => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (pWasCleared) {
              resolve();
            } else {
              reject(new Error(`Doesn't clear: ${UPDATE_CONFIRM_DIALOG}`));
            }
          });
        });
      })()
      .then(() => {
        return new Promise((resolve, reject) => {
          switch (pStrNotificationId) {
          case UPDATE_CONFIRM_DIALOG:
            if (pButtonIndex === 0) {
              writeSession()
              // reload the extension, and update the extension.
              .then(() => chrome.runtime.reload())
              .then(resolve)
              .catch(reject);
            } else {
              resolve();
            }
            break;
          case RESTORE_PREVIOUS_SESSION:
            if (pButtonIndex === 0) {
              getInitAndLoadOptions()
              .then(pObjOptions => {
                return restoreSessionBeforeUpdate(
                  pObjOptions.get(gStrPreviousSessionTimeKey));
              })
              .then(deletePreviousSessionTime)
              .then(resolve)
              .catch(reject);
            } else {
              deletePreviousSessionTime()
              .then(resolve)
              .catch(reject);
            }
            break;
          }
        });
      })
      .catch(e => console.error(e));
    }
  );//}}}

  initialize();
})();
