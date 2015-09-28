(function() {
  "use strict";

  //{{{ variables.
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
  var sMapTempRelease = new Set();

  // Before selecting the active tab, and the user has been selected tab.
  var sMapOldActiveIds = new Map() ;

  var db                     = null; // indexedDB.
  var sNumCurrentSessoinTime = 0;

  /// key: tabId, value: represent an icon.
  var sMapIconState          = new Map();

  var sNumCurrentTabId       = 0; // webRequest only.
  var sBoolDisableAutoPurge  = false;

  var sSetCreateTabId        = new Set();
  //}}}

  /**
   * The dict object contains the information
   * on the tab that ran the purging memory.
   *
   * key = tabId.
   * value = object.
   *    the values in the object are following.
   *       url            : the url before purging.
   *       scrollPosition : the object that represent the scroll position(x, y).
   *       windowId       : the windowId of the purged tab.
   */
  var sObjUnloaded        = {};
  var sNumUnloadedCount   = 0;
  var sBoolUnloadedChange = false;
  Object.observe(sObjUnloaded, pArrayChanges => {//{{{
    console.info('sObjUnloaded was changed.', Object.assign({}, pArrayChanges));

    var lNumTabId = 0;
    pArrayChanges.forEach(v => {
      lNumTabId = parseInt(v.name, 10);
      switch (v.type) {
        case 'add':
          sNumUnloadedCount++;
          deleteTick(lNumTabId);
          chrome.tabs.get(lNumTabId, tab => {
            if (!isReleasePage(tab.url)) {
              writeHistory(tab);
            }
          });
          break;
        case 'delete':
          sNumUnloadedCount--;
          sMapTempScrollPos.set(lNumTabId, v.oldValue.scrollPosition);
          setTick(lNumTabId).catch(e => console.error(e));
          break;
      }
    });
    chrome.browserAction.setBadgeText({ text: sNumUnloadedCount.toString() });

    sBoolUnloadedChange = true;
  });//}}}

  function setUnloaded(pStrKey, pStrUrl, pNumWindowId, pObjPos)//{{{
  {
    sObjUnloaded[pStrKey] = {
      url            : pStrUrl,
      windowId       : pNumWindowId,
      scrollPosition : pObjPos || { x : 0 , y : 0 },
    };
  }//}}}

  /**
   * Return the split object of the arguments of the url.
   *
   * @param {String} pUrl -  the url of getting parameters.
   * @param {String} pName -  the target parameter name.
   * @return {String} the string of a parameter.
   */
  function getParameterByName(pUrl, pName)//{{{
  {
    console.info('getParameterByName', pUrl, pName);

    var lRegParameter = new RegExp(`[\\?&]${pName}\s*=\s*([^&#]*)`);
    var lStrResults   = lRegParameter.exec(decodeURIComponent(pUrl));
    return lStrResults === null ?
           "" : decodeURIComponent(lStrResults[1].replace(/\+/g, "%20"));
  }//}}}

  /**
   * When purged tabs, return the url for reloading tab.
   *
   * @param {Object} pUrl - the url of the tab.
   * @return {Promise} return the promise object.
   *                   When be resolved, return the url for to purge.
   */
  function getPurgeURL(pUrl)//{{{
  {
    console.info('getPurgeURL', pUrl);

    var lStrPage = gStrBlankUrl;
    var lStrArgs = '&url=' + encodeURIComponent(pUrl).replace(/%20/g, '+');
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
    var iter                = sMapTicked.entries();
    var i                   = iter.next();

    return new Promise((resolve, reject) => {
      gNumRemaimingMemory = sMapOptions.get('remaiming_memory');

      isLackTheMemory(gNumRemaimingMemory)
      .then(result => {
        if (result === false) {
          resolve();
          return;
        }

        /* for-of is slow. this writing is fastest.
         * https://jsperf.com/es6-map-vs-object-properties/10
         * */
        iter = sMapTicked.entries();
        for (i = iter.next(); !i.done; i = iter.next()) {
          tick(i.value[0])
          .then(isLackTheMemory(gNumRemaimingMemory))
          .then(result => (result === false) ? resolve() : () => {})
          .catch(reject);
        }
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
  var exclusiveProcessForFunc = (function() {//{{{
    console.info('create closure of exclusiveProcessForFunc');

    var lSetLocks          = new Set();

    return function() {
      console.info('exclusiveProcessForFunc',
        Array.prototype.slice.call(arguments));

      var lArrayArgs         = Array.prototype.slice.call(arguments);
      var lStrName           = "";
      var lFuncCallback      = null;
      var lArrayCallbackArgs = [];

      return new Promise((resolve, reject) => {
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

        if (toType(lFuncCallback) !== 'function') {
          reject(new Error(
            'Invalid arguments. lFuncCallback is not function: ' +
            toType(lFuncCallback)));
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
   * @param {object} pDetails - A object to get from a function of webRequest.
   * @return {object} return object for webRequest.
   */
  function redirectPurgedTabWhenCreateNewTab(pObjDetails)//{{{
  {
    var lNumTabId = 0;
    var lStrUrl = "";

    if (pObjDetails.type === 'main_frame') {
      lNumTabId = pObjDetails.tabId;
      lStrUrl   = pObjDetails.url;

      if (sSetCreateTabId.has(lNumTabId)) {
        sSetCreateTabId.delete(lNumTabId);

        if (checkExcludeList(lStrUrl) & NORMAL) {
          if (sObjUnloaded.hasOwnProperty(lNumTabId)) {
            throw new Error(
              "TabId has already existed into sObjUnloaded." + lNumTabId);
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
    console.info('loadScrollPosition', pNumTabId);

    var lNumPos = 0;

    return new Promise((resolve, reject) => {
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
    var i                     = 0;

    return new Promise((resolve, reject) => {
      chrome.tabs.query({}, pTabs => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (sMapOptions.size === 0) {
          reject(new Error('sMapOptions is not loaded yet.'));
          return;
        }

        lArrayNotReleasePages = pTabs.filter(v => !isReleasePage(v.url));
        lNumAlreadyPurged     = pTabs.length - lArrayNotReleasePages.length;
        lNumMaxOpeningTabs    = sMapOptions.get('max_opening_tabs');
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
        i = 0;
        while (i < lArrayNotReleasePages.length && i < lNumMaxPurgeLength) {
          lArrayPromise.push( tick(lArrayNotReleasePages[i].id) );
          ++i;
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
  function isLackTheMemory(pCriteriaMemorySize)//{{{
  {
    console.info('isLackTheMemory', pCriteriaMemorySize);

    var lNumRatio = 0;

    return new Promise((resolve, reject) => {
      chrome.system.memory.getInfo(info => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lNumRatio = info.availableCapacity / Math.pow(1024.0, 2);
        console.log('availableCapacity(MByte):', lNumRatio);
        resolve(lNumRatio < parseFloat(pCriteriaMemorySize));
      });
    });
  }//}}}

  function initializeIntervalProcess()//{{{
  {
    return new Promise((resolve, reject) => {
      intervalProcess(sMapOptions.get('interval_timing') || 5)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  // These processes are If you called at normal function,
  // May called multiple times at the same time.
  // Therefore, the callback function of setInterval is called.
  function intervalProcess(pIntervalTime)//{{{
  {
    console.info('initializeIntervalProcess', pIntervalTime);

    var lStrIntervalName = 'main';
    var pIntervalId      = 0;
    return new Promise((resolve, reject) => {
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

        if (sMapOptions.size === 0) {
          reject(new Error('sMapOptions is not loaded yet.'));
          return;
        }

        if (sBoolUnloadedChange) {
          sBoolUnloadedChange = false;

          // If this function was called the observe function of unloaded,
          // When user close multiple tabs, continuously call more than once.
          // Thus, the same session is added more than once.
          // So call at here.
          exclusiveProcessForFunc('writeSession', writeSession, sObjUnloaded)
          .catch(e => console.error(e));
        }

        if (!sBoolDisableAutoPurge) {
          if (sMapOptions.get('purging_all_tabs_except_active')) {
            exclusiveProcessForFunc(
              'purgingAllTabs', purgingAllTabsExceptForTheActiveTab)
            .catch(e => console.error(e));
          }

          if (sMapOptions.get('enable_auto_purge')) {
            exclusiveProcessForFunc('autoPurgeCheck', autoPurgeCheck)
            .catch(e => console.error(e));
          }
        }
      }, pIntervalTime * 1000);//}}}

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
    var i               = 0;

    return new Promise((resolve, reject) => {
      if (sMapOptions.size === 0) {
        reject(new Error('sMapOptions is not loaded yet.'));
        return;
      }

      db.getAll({
        name: gStrDbSessionName,
      })
      .then(rHistories => {
        lNumMaxSessions = parseInt(sMapOptions.get('max_sessions'), 10);

        lSetDate = new Set();
        i = 0;
        while (i < rHistories.length) {
          lSetDate.add(rHistories[i].date);
          ++i;
        }

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
      if (sMapOptions.size === 0) {
        reject(new Error('sMapOptions is not loaded yet.'));
        return;
      }

      lNumMaxHistory = parseInt(sMapOptions.get('max_history'), 10);
      lDateNow = new Date();
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
    var lObjValue           = {};
    var lBoolResult         = false;
    var i                   = 0;

    return new Promise((resolve, reject) => {
      function check(pArray, pObjTarget)//{{{
      {
        return new Promise((resolve3, reject3) => {
          lBoolResult = pArray.some(v => (v.url === pObjTarget.url));
          if (lBoolResult) {
            reject3();
          } else {
            resolve3();
          }
        });
      }//}}}

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
          i = 0;
          while (i < lArrayPageInfos.length) {
            lObjValue = lArrayPageInfos[i];

            lArrayPromise.push(
              new Promise(resolve3 => {
                lArrayPromise2 = [];
                lArrayPromise2.push( check(lArrayHistories, lObjValue) );
                lArrayPromise2.push( check(lArraySessions, lObjValue) );
                lArrayPromise2.push( check(lArraySavedSessions, lObjValue) );
                Promise.all(lArrayPromise2).then(
                  () => resolve3(lObjValue.url),
                  () => resolve3(null)
                );
              })
            );
            ++i;
          }

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
    var lObjValue       = {};
    var i               = 0;
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
        i = 0;
        while (i < lArrayDataURIs.length) {
          lObjValue = lArrayDataURIs[i];

          lArrayPromise.push(
            new Promise(resolve3 => {
              lBoolResult =
                lArrayPageInfos.some(v2 => (v2.host === lObjValue.host));
              resolve3(lBoolResult ? null : lObjValue.host);
            })
          );
          ++i;
        }

        return Promise.all(lArrayPromise).then(results2 => {
          lArrayDelKeys = results2.filter(v => (v !== null));
          return db.delete({ name: gStrDbDataURIName, keys: lArrayDelKeys });
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function writeSession(pUnloaded)//{{{
  {
    console.info('writeSession', Object.assign({}, pUnloaded));

    var lArraySessionWrites = [];
    var lArrayDelKeys       = [];
    var lObjWrite           = {};
    var lObjItem            = {};
    var lDate               = new Date();
    var lNumNowTime         = lDate.getTime();

    return new Promise((resolve, reject) => {
      lDate       = new Date();
      lNumNowTime = lDate.getTime();

      // sNumCurrentSessoinTimeの処理
      (() => {
        return new Promise((resolve2, reject2) => {
          console.log('sNumCurrentSessoinTime', sNumCurrentSessoinTime);

          if (sNumCurrentSessoinTime) {
            // previous current session is delete.
            db.getCursor({
              name:      gStrDbSessionName,
              range:     IDBKeyRange.only(sNumCurrentSessoinTime),
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
      })().then(() => {
        lArraySessionWrites = [];
        Object.keys(pUnloaded).forEach(rTabId => {
          lObjItem = pUnloaded[rTabId];
          if (lObjItem !== void 0 && lObjItem !== null &&
              lObjItem.url !== void 0 && lObjItem.url !== null &&
              lObjItem.url.length > 0) {
            lArraySessionWrites.push({
              date:     lNumNowTime,
              url:      lObjItem.url,
              windowId: lObjItem.windowId
            });
          } else {
            console.error("Doesn't find url.", lObjItem);
          }
        });

        return db.add({ name: gStrDbSessionName, data: lArraySessionWrites });
      })
      .then(() => {
        sNumCurrentSessoinTime = lNumNowTime;

        lObjWrite = {};
        lObjWrite[gStrPreviousSessionTimeKey] = lNumNowTime;
        chrome.storage.local.set(lObjWrite, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
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

    return function(pTab) {
      console.info('writeHistory', Object.assign({}, pTab));

      var lDateNow         = new Date();
      var lDateBegin       = new Date();
      var lNumYear         = 0;
      var lNumMonth        = 0;
      var lNumDay          = 0;
      var lStrTabUrl       = "";
      var lStrTabTitle     = "";
      var lStrHost         = "";
      var lStrUnknownTitle = 'Unknown';
      var lArrayDelKeys    = [];
      var lArrayPromise    = [];

      return new Promise((resolve, reject) => {
        lStrTabUrl = pTab.url;

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
            if (sMapOptions.get('get_title_when_does_not_title') === true &&
                !pTab.title) {
              ajax({ url:lStrTabUrl, responseType: 'document' })
              .then(pObjResult => {
                if (pObjResult.status === 200) {
                  resolve(pObjResult.response.title || lStrUnknownTitle);
                  return;
                } else {
                  reject(new Error("Doesn't get title with ajax."));
                  return;
                }
              });
            } else {
              resolve(pTab.title || lStrUnknownTitle);
              return;
            }
          });
        })
        .then(pStrTitle => {
          lStrTabTitle = pStrTitle;
          lStrHost     = getHostName(lStrTabUrl);

          lArrayPromise = [];

          // pageInfo
          lArrayPromise.push(
            db.add({
              name: gStrDbPageInfoName,
              data: {
                url:   lStrTabUrl,
                title: lStrTabTitle,
                host:  lStrHost,
              },
            })
          );
          // dataURI.
          lArrayPromise.push(
            new Promise((resolve3, reject3) => {
              if (pTab.favIconUrl) {
                getDataURI(pTab.favIconUrl)
                .then(dataURI => {
                  return db.add({
                    name: gStrDbDataURIName,
                    data: {
                      host:    lStrHost,
                      dataURI: dataURI,
                    }
                  });
                })
                .then(resolve3)
                .catch(reject3);
              } else {
                console.warn("Don't find favIconUrl.", pTab);
                resolve3();
              }
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
    var iter           = lSetDeleteUrls.entries();
    var i              = 0;

    return new Promise((resolve, reject) => {
      chrome.history.search({ text: '' }, histories => {
        lSetDeleteUrls = new Set();
        i = 0;
        while (i < histories.length) {
          lStrUrl = histories[i].url;
          if (lRegBlankUrl.test(lStrUrl)) {
            lSetDeleteUrls.add(lStrUrl);
          }
          ++i;
        }

        lArrayPromise = [];
        iter = lSetDeleteUrls.entries();
        for (i = iter.next(); !i.done; i = iter.next()) {
          lArrayPromise.push(new Promise(
            resolve => chrome.history.deleteUrl({ url: i.value[1] }, resolve)));
        }

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
    return new Promise((resolve, reject) => {
      chrome.tabs.getSelected(rTab => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(rTab);
      });
    });
  }//}}}

  /**
   * check If the url has contained the release pages.
   *
   * @param {String} pUrl - the target url.
   * @return {Boolean} If the url is contained, return true.
   *                   if the different, return false.
   */
  function isReleasePage(pUrl)//{{{
  {
    console.info('isReleasePage', pUrl);
    return pUrl.indexOf(gStrBlankUrl) === 0;
  }//}}}

  /**
   * isPlayingSound
   *
   * Whether it is playing sound that given the tab.
   *
   * @param {Object} rTab - The tab object of chrome.tabs.
   * @return {Boolean} If the tab have been playing sound, True.
   *     haven't playing sound if False.
   */
  function isPlayingSound(pTab)//{{{
  {
    return pTab.audible === true;
  }//}}}

  /**
  * Check whether the user matches that set the exclusion list.
  * @param {String} pUrl - the url to check whether matches.
  * @param {Object} pObjExclude - the object represent exclusion list settings.
  *     list    - 除外リストの値。複数のものは\nで区切る.
  *     options - 正規表現のオプション.
  *     returnValue - 一致したときに返す返り値
  * @return {Number} 引数にはnullかreturnValueの値が入る
  */
  function checkMatchUrlString(pUrl, pObjExclude)//{{{
  {
    console.info('checkMatchUrlString', pUrl, Object.assign({}, pObjExclude));

    var lRegExpUrl    = null;
    var lArrayExclude = pObjExclude.list.split('\n');
    var i             = 0;

    while (i < lArrayExclude.length) {
      if (lArrayExclude[i].length !== 0) {
        lRegExpUrl = new RegExp(lArrayExclude[i].trim(), pObjExclude.options);
        if (lRegExpUrl.test(pUrl)) {
          return pObjExclude.returnValue;
        }
      }
      ++i;
    }
    return null;
  }//}}}

  /**
   * return the exclusion list have been set argument,
   *
   * @param {String} pTarget - the name of the target list.
   *                   If the value is undefined, return normal exlusion list.
   * @return {Object} the object of the list relation.
   */
  function getTargetExcludeList(pTarget)//{{{
  {
    console.info('getTargetExcludeList', pTarget);

    switch (pTarget) {
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
      case 'keybind':
        if (sMapOptions.size !== 0) {
          return {
            list:       sMapOptions.get('keybind_exclude_url'),
            options:    sMapOptions.get('keybind_regex_insensitive') ? 'i' : '',
            returnValue: KEYBIND_EXCLUDE,
          };
        } else {
          throw new Error("Doesn't initialize sMapOptions yet.");
        }
        break;
      default:
        if (sMapOptions.size !== 0) {
          return {
            list:        sMapOptions.get('exclude_url'),
            options:     sMapOptions.get('regex_insensitive') ? 'i' : '',
            returnValue: USE_EXCLUDE,
          };
        } else {
          throw new Error("Doesn't initialize sMapOptions yet.");
        }
    }

    console.error('getTargetExcludeList was error.', pTarget);
    return { list: '', options: '', returnValue: null };
  }//}}}

  /**
  * 与えられたURLが全ての除外リストに一致するか検索する。
  * @param {String} pUrl - 対象のURL.
  * @return {Value} If be ran resolve function, return value is following.
  *               CHROME_EXCLUDE = chrome関係の除外リストと一致
  *               EXTENSION_EXCLUDE = 拡張機能関係のアドレスと一致
  *               USE_EXCLUDE    = ユーザー指定の除外アドレスと一致
  *               TEMP_EXCLUDE   = 一時的な非解放リストと一致
  *               NORMAL = 一致しなかった。
  *             And if match the exclusion list of key bindings,
  *             make a bit addition of KEYBIND_EXCLUDE.
  *
  *             When you compare these values, you should use bit addition.
  */
  function checkExcludeList(pUrl)//{{{
  {
    console.info('checkExcludeList');

    if (pUrl === void 0 || pUrl === null || pUrl.length === 0) {
      return INVALID_EXCLUDE;
    }

    var lNumKeybind = 0;
    var lNumResult  = 0;

    // Check the keybind exclude list.
    lNumKeybind =
      checkMatchUrlString(pUrl, getTargetExcludeList('keybind')) || 0;

    // Check the exclude list for the extension.
    lNumResult = checkMatchUrlString(pUrl, getTargetExcludeList('extension'));
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // Check the exclude list for Google Chrome.
    lNumResult = checkMatchUrlString(pUrl, getTargetExcludeList('chrome'));
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // Check the normal exclude list.
    lNumResult = checkMatchUrlString(pUrl, getTargetExcludeList());
    if (lNumResult) {
      return lNumResult | lNumKeybind;
    }

    // Check to the temporary exclude list or don't match the exclude lists.
    return (sMapTempRelease.has(pUrl) ? TEMP_EXCLUDE : NORMAL) | lNumKeybind;
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
   * @param {Tab} pTab 対象のタブ.
   * @param {Promise} promiseが返る。
   */
  function reloadBrowserIcon(pTab)//{{{
  {
    console.info('reloadBrowserIcon', Object.assign({}, pTab));

    var lNumChangeIcon = 0;
    var lStrTitle      = '';

    return new Promise((resolve, reject) => {
      lNumChangeIcon =
        sBoolDisableAutoPurge ? DISABLE_AUTOPURGE : checkExcludeList(pTab.url);
      chrome.browserAction.setIcon(
        { path: gMapIcons.get(lNumChangeIcon), tabId: pTab.id }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          sMapIconState.set(pTab.id, lNumChangeIcon);

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

          chrome.browserAction.setTitle({ tabId: pTab.id, title: lStrTitle });
          resolve(lNumChangeIcon);
        }
      );
    });
  }//}}}

  /**
  * タブの解放を行います。
  * @param {Number} pTabId タブのID.
  * @param {Promise} promiseが返る。
  */
  function purge(pTabId)//{{{
  {
    console.info('purge');

    var lArrayPromise        = [];
    var lObjTab              = {};
    var lArrayScrollPosition = [];
    var lNumState            = 0;
    var lStrUrl              = "";

    return new Promise((resolve, reject) => {
      if (toType(pTabId) !== 'number') {
        reject(new Error("tabId is not number."));
        return;
      }

      if (sObjUnloaded.hasOwnProperty(pTabId)) {
        reject(new Error(`Already purging. ${pTabId}`));
        return;
      }

      lArrayPromise.push(
        new Promise((resolve2, reject2) => {
          chrome.tabs.get(pTabId, rTab => {
            if (chrome.runtime.lastError) {
              reject2(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve2(rTab);
          });
        })
      );

      lArrayPromise.push(
        new Promise((resolve2, reject2) => {
          chrome.tabs.executeScript(
            pTabId, { file: gStrGetScrollPosScript }, rScrollPosition => {
              if (chrome.runtime.lastError) {
                reject2(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve2(rScrollPosition);
            }
          );
        })
      );

      Promise.all(lArrayPromise).then(rResults => {
        lObjTab              = rResults[0];
        lArrayScrollPosition = rResults[1];

        if (lObjTab.status !== 'complete') {
          reject(new Error(
            `The target tab has not been completed loading yet: ${lObjTab}`));
          return;
        }

        lNumState = checkExcludeList(lObjTab.url);
        if (lNumState & (CHROME_EXCLUDE | EXTENSION_EXCLUDE)) {
          reject(new Error(
            'The tabId have been included the exclusion list' +
            ` of extension and chrome: ${pTabId}`));
          return;
        } else if (lNumState & INVALID_EXCLUDE) {
          reject(new Error(`Don't get the url of the tab: ${pTabId}`));
          return;
        }

        (() => {
          return new Promise(resolve2 => {
            chrome.tabs.sendMessage(pTabId, { event: 'form_cache' }, resolve2);
          });
        })()
        .then(() => {
          return new Promise((resolve3, reject3) => {
            lStrUrl = getPurgeURL(lObjTab.url);

            chrome.tabs.executeScript(pTabId, {
              code: `window.location.replace("${lStrUrl}");` }, () => {
                if (chrome.runtime.lastError) {
                  reject3(chrome.runtime.lastError);
                  return;
                }
                resolve3();
              }
            );
          });
        })
        .then(() => {
          setUnloaded(
            pTabId, lObjTab.url, lObjTab.windowId, lArrayScrollPosition[0]);

          return exclusiveProcessForFunc(
            'deleteAllPurgedTabUrlFromHistory',
            deleteAllPurgedTabUrlFromHistory);
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
  * 解放したタブを復元します。
  * @param {Number} pTabId 復元するタブのID.
  * @return {Promise} promiseが返る。
  */
  function unPurge(pTabId)//{{{
  {
    console.info('unPurge', pTabId);

    var lStrUrl = "";

    return new Promise((resolve, reject) => {
      if (toType(pTabId) !== 'number') {
        reject(new Error("pTabId is not number."));
        return;
      }

      lStrUrl = sObjUnloaded[pTabId].url;
      chrome.tabs.sendMessage(pTabId,
        { event: 'location_replace' }, useChrome => {
          // If the lStrUrl is empty in purge page.
          if (useChrome) {
            chrome.tabs.update(pTabId, { url: lStrUrl }, resolve);
          } else {
            resolve();
          }
        }
      );
    });
  }//}}}

  /**
  * 解放状態・解放解除を交互に行う
  * @param {Number} pTabId 対象のタブのID.
  * @return {Promise} promiseが返る。
  */
  function purgeToggle(pTabId)//{{{
  {
    console.info('purgeToggle', pTabId);

    return new Promise((resolve, reject) => {
      if (toType(pTabId) !== 'number') {
        reject(new Error("pTabId is not number."));
        return;
      }

      (() =>
        sObjUnloaded.hasOwnProperty(pTabId) ? unPurge(pTabId) : purge(pTabId))()
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} pTabId 処理を行うタブのID.
  * @return {Promise} Promiseが返る。
  */
  function tick(pTabId)//{{{
  {
    console.info('tick', pTabId);

    return new Promise((resolve, reject) => {
      if (toType(pTabId) !== 'number' || sObjUnloaded.hasOwnProperty(pTabId)) {
        reject(new Error(
          "pTabId isn't number or added to sObjUnloaded already: " + pTabId));
        return;
      }

      chrome.tabs.get(pTabId, rTab => {
        if (chrome.runtime.lastError) {
          reject(new Error(`tick function is skipped: ${pTabId}`));
          return;
        }

        if (sMapOptions.get('not_purge_playsound_tab') &&
            isPlayingSound(rTab)) {
          reject(new Error(`the tab have been playing sound: ${pTabId}`));
          return;
        }

        // If a tab is activated, updates unload time of a tab.
        (() => rTab.active ? setTick(pTabId) : purge(pTabId))()
        .then(resolve).catch(reject);
      });
    });
  }//}}}

  /**
  * 定期的な処理を停止
  * @param {Number} pTabId 停止するタブのID.
  */
  function deleteTick(pTabId)//{{{
  {
    console.info('deleteTick');

    if (sMapTicked.has(pTabId)) {
      clearInterval(sMapTicked.get(pTabId));
      sMapTicked.delete(pTabId);
    }
  }//}}}

  /**
  * 定期的に解放処理の判断が行われるよう設定します。
  * 既に設定済みなら時間を延長します。
  * @param {Number} pTabId 設定するタブのID.
  * @return {Promise} Promiseが返る。
  */
  function setTick(pTabId)//{{{
  {
    console.info('setTick');

    var lNumState = 0;
    var lNumTimer = 0;
    var lNumIVal  = 0;

    return new Promise((resolve, reject) => {
      if (sMapOptions.size === 0 || toType(pTabId) !== 'number') {
        reject(
          new Error('sMapOptions is not loaded yet. or pTabId is not number.'));
        return;
      }

      if (sBoolDisableAutoPurge) {
        resolve();
        return;
      }

      chrome.tabs.get(pTabId, rTab => {
        if (chrome.runtime.lastError) {
          console.log('setTick function is skipped.');
          resolve();
          return;
        }

        // 全ての除外アドレス一覧と比較
        lNumState = checkExcludeList(rTab.url);
        if (lNumState & NORMAL) { // 除外アドレスに含まれていない場合
          // 分(設定) * 秒数 * ミリ秒
          lNumTimer = parseInt(sMapOptions.get('timer'), 10) * 60 * 1000;

          // Update.
          deleteTick(pTabId);
          lNumIVal = setInterval(() => tick(pTabId), lNumTimer);
          sMapTicked.set(pTabId, lNumIVal);
        } else { // include exclude list
          deleteTick(pTabId);
        }

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

    function restoreTab(pSession)//{{{
    {
      console.info('restoreTab in closure of restore.', pSession);

      return new Promise((resolve, reject) => {
        var rMapResults = new Map();
        var lNumWinId   = pSession.windowId;
        var lStrUrl     = pSession.url;
        var lObjOpts    = { url: getPurgeURL(lStrUrl), active: false };

        if (lNumWinId) {
          lObjOpts.windowId = lNumWinId;
        }

        chrome.tabs.create(lObjOpts, rTab => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            rMapResults = new Map();
            rMapResults.set(rTab.id, {
              url            : lStrUrl,
              windowId       : rTab.windowId,
              scrollPosition : { x : 0 , y : 0 },
            });
            resolve(rMapResults);
          }
        );
      });
    }//}}}

    function restoreWindow(pSessions)//{{{
    {
      console.info('restoreWindow in closure of restore.', pSessions);

      return new Promise((resolve, reject) => {
        var lMapTempUrls = new Map();
        var rMapResults  = new Map();
        var lStrUrl      = "";
        var lArrayUrls   = [];
        var i            = 0;
        var v            = {};

        pSessions.forEach(v => {
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
          i = 0;
          while (i < win.tabs.length) {
            v = win.tabs[i];
            rMapResults.set(v.id, {
              url            : lMapTempUrls.get(v.url),
              windowId       : v.windowId,
              scrollPosition : { x : 0 , y : 0 },
            });
            ++i;
          }
          resolve(rMapResults);
        });
      });
    }//}}}

    function restoreSessionsInCurrentOrOriginal(//{{{
      pNumWinId, pArraySessions, pStrRestoreType)
    {
      console.info('restoreSessionsInCurrentOrOriginal in closure of restore.',
        Array.prototype.slice.call(arguments));

      return new Promise((resolve, reject) => {
        var lObjSession   = {};
        var lArrayPromise = [];
        var rMapResult    = new Map();
        var iter          = rMapResult.entries();
        var iterPos       = iter.next();
        var i             = 0;

        // restore tab to window of winId.
        lArrayPromise = [];
        i = 0;
        while (i < pArraySessions.length) {
          lObjSession          = pArraySessions[i];
          if (pStrRestoreType === 'restore_to_original_window') {
            lObjSession.windowId = pNumWinId;
          } else {
            delete lObjSession.windowId;
          }
          lArrayPromise.push( restoreTab(lObjSession) );
          ++i;
        }

        Promise.all(lArrayPromise).then(results => {
          rMapResult = new Map();
          i = 0;
          while (i < results.length) {
            iter      = results[i].entries();
            iterPos   = iter.next();
            while (!iterPos.done) {
              rMapResult.set(iterPos.value[0], iterPos.value[1]);
              iterPos = iter.next();
            }
            ++i;
          }
          return rMapResult;
        })
        .then(resolve)
        .catch(reject);
      });
    }//}}}

    function restoreSessions(pNumWinId, pArraySessions, pStrRestoreType)//{{{
    {
      console.info(
        'restoreSessions in closure if restore',
        pNumWinId, pArraySessions.slice(), pStrRestoreType);
      var lArrayArgs = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject) => {
        switch (pStrRestoreType) {
        case 'restore_to_current_window':
          restoreSessionsInCurrentOrOriginal.apply(null, lArrayArgs)
          .then(resolve)
          .catch(reject);
          break;
        case 'restore_to_original_window':
          (function(pWindowId) {
            return new Promise((resolve, reject) => {
              if (pWindowId) {
                chrome.tabs.query({ windowId: pWindowId }, rTabs => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                  }
                  resolve(rTabs.length !== 0);
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
        }
      });
    }//}}}

    return function(pArraySessions, pStrRestoreType) {//{{{
      console.info('restore', Array.prototype.slice.call(arguments));

      return new Promise((resolve, reject) => {
        var lArrayList                      = [];
        var lArraySession                   = {};
        var lArrayPromise                   = [];
        var lStrRestoreTypeOptName          = "";
        var lNumWinId                       = 0;
        var lNumTabId                       = 0;
        var lMapEachWindow                  = new Map();
        var iter                            = lMapEachWindow.entries();
        var iterPos                         = iter.next();
        var i                               = 0;

        if (pStrRestoreType === void 0 || pStrRestoreType === null) {
          lStrRestoreTypeOptName = 'restored_type';
          pStrRestoreType = (sMapOptions.get(lStrRestoreTypeOptName) ||
                             gMapDefaultValues.get(lStrRestoreTypeOptName));
        }

        if (toType(pStrRestoreType) !== 'string') {
          throw new Error(
            "Invalid arguments, pStrRestoreType isn't string type: " +
            `${toType(pStrRestoreType)}`);
        }

        i = 0;
        while (i < pArraySessions.length) {
          lArraySession = pArraySessions[i];
          lNumWinId     = lArraySession.windowId;
          lArrayList    = lMapEachWindow.get(lNumWinId) || [];
          lArrayList.push(lArraySession);
          lMapEachWindow.set(lNumWinId, lArrayList);
          ++i;
        }

        lArrayPromise = [];
        iter          = lMapEachWindow.entries();
        iterPos       = iter.next();
        while (!iterPos.done) {
          lArrayPromise.push(restoreSessions(
              iterPos.value[0], iterPos.value[1], pStrRestoreType));
          iterPos = iter.next();
        }

        Promise.all(lArrayPromise)
        .then(rResults => {
          i = 0;
          while (i < rResults.length) {
            iter    = rResults[i].entries();
            iterPos = iter.next();
            while (!iterPos.done) {
              lNumTabId = iterPos.value[0];
              if (!sObjUnloaded.hasOwnProperty(lNumTabId)) {
                sObjUnloaded[lNumTabId] = iterPos.value[1];
              } else {
                console.error(
                  'same tabId is found in sObjUnloaded object.', lNumTabId);
              }
              iterPos = iter.next();
            }
            ++i;
          }
        })
        .then(resolve)
        .catch(reject);
      });
    };//}}}
  })();//}}}

  function switchTempRelease(pUrl)//{{{
  {
    console.info('switchTempRelease', pUrl);

    (() =>
      sMapTempRelease.has(pUrl) ? sMapTempRelease.delete(pUrl) :
                                  sMapTempRelease.add(pUrl)
    )();
  }//}}}

  /**
  * 非解放・非解放解除を交互に行う
  * @param {object} pTab 対象のタブオブジェクト.
  */
  function tempReleaseToggle(pTab)//{{{
  {
    console.info('tempReleaseToggle', Object.assign({}, pTab));

    return new Promise((resolve, reject) => {
      switchTempRelease(pTab.url);

      setTick(pTab.id)
      .then(reloadBrowserIconInAllActiveTab)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
  * 指定されたタブに最も近い未解放のタブをアクティブにする。
  * 右側から探索され、見つからなかったら左側を探索する。
  * 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
  * @param {object} pTab 基準点となるタブ.
  * @return {Promise} promiseが返る。
  */
  function searchUnloadedTabNearPosition(pTab)//{{{
  {
    console.info('searchUnloadedTabNearPosition', Object.assign({}, pTab));

    return new Promise((resolve, reject) => {
      var lArrayTabs       = [];
      var lArrayTarget     = [];
      var lNumTargetLength = 0;

      // 現在のタブの左右の未解放のタブを選択する
      chrome.windows.get(pTab.windowId, { populate: true }, pWin => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lArrayTabs   = pWin.tabs.filter(v =>
          !sObjUnloaded.hasOwnProperty(v.id) && !isReleasePage(v.url));
        lArrayTarget = lArrayTabs.filter(v => (v.index > pTab.index));
        lNumTargetLength = 0;
        if (lArrayTarget.length === 0) {
          lArrayTarget     = lArrayTabs.filter(v => (v.index < pTab.index));
          lNumTargetLength = lArrayTarget.length - 1;
        }

        if (lArrayTarget.length > 0) {
          // If found tab, It's active.
          chrome.tabs.update(
            lArrayTarget[lNumTargetLength].id, { active: true }, resolve);
        } else {
          // If can not find the tab to activate to create a new tab.
          chrome.tabs.create({ active: true }, resolve);
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
    console.info('restoreSessionBeforeUpdate', pPreviousSessionTime);

    return new Promise((resolve, reject) => {
      var lArrayRestoreSessions = [];
      var lObjItem = {};
      var lObjData = {};
      var i        = 0;
      var j        = 0;

      if (pPreviousSessionTime === void 0 ||
          pPreviousSessionTime === null) {
        reject(new Error("pPreviousSessionTime is invalidation."));
        return;
      }

      getHistoryListFromIndexedDB(db, gStrDbSessionName)
      .then(sessions => {
        if (sessions.length === 0) {
          return;
        }

        lArrayRestoreSessions = [];
        i = 0;
        j = 0;
        while (i < sessions.length) {
          lObjItem = sessions[i];
          j = 0;
          while (j < lObjItem.data.length) {
            lObjData = lObjItem.data[j];
            if (pPreviousSessionTime === lObjData.date) {
              lArrayRestoreSessions.push({ url: lObjData.url });
            }
            ++j;
          }
          ++i;
        }

        if (lArrayRestoreSessions.length > 0) {
          return restore(lArrayRestoreSessions);
        }
        return;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function whenVersionUpOptionFix()//{{{
  {
    return new Promise((resolve, reject) => {
      var lObjWrite   = {};
      var lStrKeybind = "";

      chrome.storage.local.get(pItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lObjWrite   = {};
        lStrKeybind = pItems.keybind;
        if (lStrKeybind) {
          Object.keys(lStrKeybind).forEach(key => {
            lObjWrite[`keybind_${key}`] = lStrKeybind[key];
          });
        }

        chrome.storage.local.set(lObjWrite, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          chrome.storage.local.remove('keybind', () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve();
          });
        });
      });
    });
  }//}}}

  /**
   * 拡張機能がアップデートされたときの処理
   */
  function onUpdate()//{{{
  {
    console.info('Extension Updated.');

    return new Promise((resolve, reject) => {
      whenVersionUpOptionFix()
      .then(getInitAndLoadOptions)
      .then(pOptions => {
        if (pOptions.get(gStrPreviousSessionTimeKey)) {
          return showDialogOfRestoreSessionBeforeUpdate();
        } else {
          return;
        }
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
        if (lNumCurrentVersion !== lNumPreviousVersion) {
          // この拡張機能でインストールしたかどうか
          lFuncRun = (lNumPreviousVersion === void 0) ? onInstall : onUpdate;

          (function(currVersion) {
            return new Promise(resolve => {
              lObjWrite = {};
              lObjWrite[gStrVersionKey] = currVersion;
              chrome.storage.local.set(lObjWrite, resolve);
            });
          })(lNumCurrentVersion)
          .then(lFuncRun)
          .then(resolve)
          .catch(reject);
        } else {
          resolve();
        }
      });
    });
  }//}}}

  function deletePreviousSessionTime()//{{{
  {
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

      chrome.storage.local.get(null, pItems => {
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
    console.info('initializeUseOptions', new Map(pMapOptions));

    return new Promise((resolve, reject) => {
      if (toType(pMapOptions) !== 'map') {
        reject(new Error("Invalid arugments. pMapOptions is not map type"));
        return;
      }

      sMapOptions = pMapOptions;

      // initialize badge.
      chrome.browserAction.setBadgeText({ text: sNumUnloadedCount.toString() });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF' });

      resolve();
    });
  }//}}}

  var initializeAlreadyPurgedTabs = (function() {//{{{
    console.info('create closure of initializeAlreadyPurgedTabs.');

    function toAdd(pObjCurrent)
    {
      return new Promise((resolve, reject) => {
        var lNumResult = checkExcludeList(pObjCurrent.url);
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
      var i = 0;

      return new Promise((resolve, reject) => {
        chrome.tabs.query({}, pTabs => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          // If already purging tab, be adding the object of purging tab.
          lArrayPromise = [];
          i = 0;
          while (i < pTabs.length) {
            lArrayPromise.push( toAdd(pTabs[i]) );
            ++i;
          }

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

    function lastProcess()
    {
      sBoolDisableAutoPurge = sBoolDisableAutoPurge ? false : true;

      return getCurrentTab()
      .then(reloadBrowserIcon);
    }

    return function() {
      console.info('switchDisableTimerState');

      var lNumResult = 0;
      var lObjValue  = {};
      var iter       = null;
      var i          = null;

      return new Promise((resolve, reject) => {
        if (sBoolDisableAutoPurge) {
          chrome.tabs.query({}, pTabs => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            i = 0;
            while (i < pTabs.length) {
              lObjValue  = pTabs[i];
              lNumResult = checkExcludeList(lObjValue.url);
              if (lNumResult & NORMAL && !isReleasePage(lObjValue.url)) {
                setTick(lObjValue.id);
              }
              ++i;
            }

            lastProcess()
            .then(resolve)
            .catch(reject);
          });
        } else {
          iter = sMapTicked.entries();
          for (i = iter.next(); !i.done; i = iter.next()) {
            clearInterval(i.value[1]);
          }
          sMapTicked.clear();

          lastProcess()
          .then(resolve)
          .catch(reject);
        }
      });
    };
  })();//}}}

  /**
   * onActivatedFunc
   *
   * @param pTabId the id of the tab.
   * @return {Promise} promiseが返る。
   */
  function onActivatedFunc(pTabId)//{{{
  {
    console.info('onActivatedFunc', pTabId);

    return new Promise((resolve, reject) => {
      chrome.tabs.get(pTabId, pTab => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // 前にアクティブにされていたタブのアンロード時間を更新
        if (sMapOldActiveIds.has(pTab.WindowId)) {
          setTick(sMapOldActiveIds.get(pTab.windowId));
        }
        sMapOldActiveIds.set(pTab.windowId, pTabId);

        // アイコンの状態を変更
        reloadBrowserIcon(pTab).then(resolve).catch(reject);
      });
    });
  }//}}}

  function updateOptionValues()//{{{
  {
    return new Promise((resolve, reject) => {
      getInitAndLoadOptions()
      .then(pOptions => {
        sMapOptions = pOptions;
        return initializeIntervalProcess();
      })
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
    console.info('initializeIntervalUpdateCheck', pNumCheckTime);

    var lStrIntervalName = 'updateCheck';
    var lStrIntervalId = '';

    return new Promise(resolve => {
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
        resolve
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
        resolve
      );
    });
  }//}}}

  chrome.webRequest.onBeforeRequest.addListener(pObjDetails => {//{{{
    console.info('webRequest.onBeforeRequest', pObjDetails);

    if (sMapOptions.get('new_tab_opens_with_purged_tab')) {
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
    if (sObjUnloaded.hasOwnProperty(pObjActiveInfo.tabId) &&
        sMapOptions.get('no_release') === false) {
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

    delete sObjUnloaded[pTabId];
    sMapIconState.delete(pTabId);
  });//}}}

  chrome.tabs.onAttached.addListener(pTabId => {//{{{
    console.info('chrome.tabs.onAttached.', pTabId);

    setTick(pTabId).catch(e => console.error(e));
  });//}}}

  chrome.tabs.onDetached.addListener(pTabId => {//{{{
    console.info('chrome.tabs.onDetached.', pTabId);

    delete sObjUnloaded[pTabId];
    sMapIconState.delete(pTabId);
  });//}}}

  chrome.tabs.onUpdated.addListener((pTabId, pObjChangeInfo, pTab) => {//{{{
    if (pObjChangeInfo.status === 'loading') {
      console.info(
        'chrome.tabs.onUpdated. loading.', pTabId, pObjChangeInfo, pTab);

      if (!isReleasePage(pTab.url) && sObjUnloaded.hasOwnProperty(pTabId)) {
        delete sObjUnloaded[pTabId];
      }
    } else {
      console.info(
        'chrome.tabs.onUpdated. complete.', pTabId, pObjChangeInfo, pTab);

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
      console.info('chrome.runtime.onMessage.', pObjMessage, pObjSender);

      var lArrayPromise   = [];
      var lArrayTarget    = [];
      var lNumTabId       = 0;
      var lNumState       = 0;
      var lNumResultState = 0;

      switch (pObjMessage.event) {
        case 'initialize':
          initialize();
          break;
        case 'release':
          getCurrentTab()
          .then(pObjTab => {
            return new Promise((resolve, reject) => {
              purgeToggle(pObjTab.id)
              .then(() => {
                resolve(pObjTab);
              })
              .catch(reject);
            });
          })
          .then(searchUnloadedTabNearPosition)
          .catch(e => console.error(e));
          break;
        case 'switch_not_release':
          getCurrentTab()
          .then(tempReleaseToggle)
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
                (CHROME_EXCLUDE | EXTENSION_EXCLUDE | INVALID_EXCLUDE) ^
                   lNumState : NORMAL & lNumState;
               return !sObjUnloaded.hasOwnProperty(v.id) &&
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
          Object.keys(sObjUnloaded).forEach(pStrKey => {
            unPurge(parseInt(pStrKey, 10)).catch(e => console.error(e));
          });
          break;
        case 'add_to_temp_exclude_list':
          getCurrentTab()
          .then(pObjTab => {
            if (!sMapTempRelease.has(pObjTab.url)) {
              sMapTempRelease.add(pObjTab.url);

              return setTick(pObjTab.id)
                     .then(reloadBrowserIconInAllActiveTab);
            } else {
              return;
            }
          })
          .catch(e => console.error(e));
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
          if (!sObjUnloaded.hasOwnProperty(lNumTabId)) {
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
        case 'switchTimerState':
          switchDisableTimerState()
          .catch(e => console.error(e));
          break;
        case 'excludeDialogMenu':
          getCurrentTab()
          .then(pObjTab => {
            return new Promise(resolve => {
              chrome.tabs.sendMessage(
                pObjTab.id, { event: 'showExcludeDialog' }, resolve);
            });
          })
          .catch(e => console.error(e));
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
      console.info(
        'nortifications.onButtonClicked', pStrNotificationId, pButtonIndex);

      switch (pStrNotificationId) {
      case UPDATE_CONFIRM_DIALOG:
        if (pButtonIndex === 0) {
          writeSession(sObjUnloaded)
          // reload the extension, and update the extension.
          .then(() => chrome.runtime.reload())
          .catch(e => console.error(e));
        }
        break;
      case RESTORE_PREVIOUS_SESSION:
        if (pButtonIndex === 0) {
          getInitAndLoadOptions()
          .then(pObjOptions =>
              restoreSessionBeforeUpdate(
                  pObjOptions.get(gStrPreviousSessionTimeKey)))
          .then(deletePreviousSessionTime)
          .catch(e => console.error(e));
        } else {
          deletePreviousSessionTime()
          .catch(e => console.error(e));
        }
        break;
      }
    }
  );//}}}

  initialize();
})();
