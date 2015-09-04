(function() {
  "use strict";

  /**
   * return the function of autoPurgeCheck.
   *
   * @return {Function} return the function of autoPurgeCheck.
   */
  function closureAutoPurgeCheck()//{{{
  {
    console.log('closureAutoPurgeCheck');

    /**
     * call Function after isLackTheMemory function.
     *
     * @param {Boolean} result - a result of isLackTheMemory.
     * @return {Promise} to call resolve if result is false only.
     */
    function resolveAfterIsLackTheMemory(result)//{{{
    {
      console.log(
        'resolveAfterIsLackTheMemory() in closureAutoPurgeCheck', result);

      return new Promise(resolve => {
        if (result === false) {
          resolve();
          return;
        }
        // doesn't call resolve.
      });
    }//}}}

    /**
     * check run auto purge or not.
     * @return {Promise} return an promise object.
     */
    function purgeCheck()//{{{
    {
      console.log('purgeCheck() in closureAutoPurgeCheck');

      return new Promise((resolve, reject) => {
        if (myOptions.size === 0) {
          console.error('myOptions is not loaded yet.');
          reject();
          return;
        }

        var remaiming_memory = myOptions.get('remaiming_memory');

        isLackTheMemory(remaiming_memory)
        .then(result => {
          return new Promise((resolve2, reject2) => {
            if (result === false) {
              resolve();
              return;
            }

            /* for-of is slow. this writing is fastest.
             * https://jsperf.com/es6-map-vs-object-properties/10
             * */
            var iter = ticked.entries();
            for (var i = iter.next(); !i.done; i = iter.next()) {
              tick(i.value[1])
              .then(isLackTheMemory(remaiming_memory))
              .then(resolveAfterIsLackTheMemory)
              .catch(reject2);
            }

            resolve2();
          });
        })
        .then(resolve)
        .catch(e => {
          console.error(e);
          reject();
        });
      });
    }//}}}

    return purgeCheck;
  }//}}}

  /**
   * return an exclusive process function for function.
   *
   * @return {Function} return a function.
   */
  function closureExclusiveProcessForFunction()//{{{
  {
    console.log('closureExclusiveProcessForFunction');

    var locks = new Set();

    /**
     * exclusive process for function.
     *
     * @param {string} name - to add a name of Function.
     * @param {function} callback -
     *     Function that performs an exclusive processing.
     * @param {Any} callbackArgs - pass arguments to Function.
     * @return {promise} return promise.
     */
    function exclusiveProcess()//{{{
    {
      console.log('exclusiveProcess', arguments);

      var args = Array.prototype.slice.call(arguments);
      return new Promise((resolve, reject) => {
        if (args.length < 2) {
          console.error('Number of arguments is not enough: ', args.length);
          reject();
          return;
        }

        var name = args[0];
        var callback = args[1];
        var callbackArgs = args.length > 2 ? args.slice(2) : void 0;

        if (locks.has(name)) {
          console.warn('Already running process of:', name);
          resolve();
          return;
        }

        if (toType(callback) !== 'function') {
          console.error(
            'Invalid arguments. callback is not function.', toType(callback));
          reject();
          return;
        }

        locks.add(name);

        callback.apply(null, callbackArgs)
        .then(() => {
          locks.delete(name);
          resolve();
        })
        .catch(e => {
          locks.delete(name);
          reject(e);
        });
      });
    }//}}}

    return exclusiveProcess;
  }//}}}

  // my option settings.//{{{
  var myOptions = new Map();

  /**
   * set setInterval returned value.
   * key   = tabId
   * value = return setInterval value.
   */
  var ticked = new Map();

  /**
   * When purge tabs, the object that the scroll position of purging tabs
   * is saved.
   * key   = tabId
   * value = the object that represent the scroll position(x, y).
   */
  var tempScrollPositions = new Map();

  // the string that represents the temporary exclusion list
  var tempRelease = new Set();

  // Before selecting the active tab, and the user has been selected tab.
  var oldActiveIds = new Map() ;

  var db                 = null; // indexedDB.
  var currentSessionTime = null;
  var currentIcon        = null;
  var disableTimer       = false;

  /** @function */
  var exclusiveProcessForFunc = closureExclusiveProcessForFunction();
  /** @function */
  var autoPurgeCheck          = closureAutoPurgeCheck();
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
   */
  var unloaded       = {};
  var unloadedCount  = 0;
  var unloadedChange = false;
  Object.observe(unloaded, changes => {//{{{
    console.log('unloaded was changed.', changes);

    var tabId;
    changes.forEach(v => {
      tabId = parseInt(v.name, 10);
      switch (v.type) {
        case 'add':
          unloadedCount++;
          deleteTick(tabId);
          break;
        case 'delete':
          unloadedCount--;
          tempScrollPositions.set(tabId, v.oldValue.scrollPosition);
          setTick(tabId);
          break;
      }
    });
    chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });

    unloadedChange = true;
  });//}}}

  function loadScrollPosition(tabId)//{{{
  {
    console.log('loadScrollPosition', tabId);

    return new Promise((resolve, reject) => {
      if (tempScrollPositions.has(tabId)) {
        var pos = tempScrollPositions.get(tabId);
        chrome.tabs.executeScript(
          tabId, { code: 'scroll(' + pos.x + ', ' + pos.y + ');' }, () => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError.message);
              reject();
              return;
            }

            tempScrollPositions.delete(tabId);
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
    console.log('purgingAllTabsExceptForTheActiveTab');

    return new Promise((resolve, reject) => {
      chrome.tabs.query({}, tabs => {
        var maxOpeningTabs = myOptions.get('max_opening_tabs');
        if (!maxOpeningTabs) {
          console.error('myOptions is not loaded yet.');
          reject();
          return;
        }

        var t = tabs.filter(v => !isReleasePage(v.url));

        var alreadyPurgedLength = tabs.length - t.length;
        var maxPurgeLength = tabs.length - alreadyPurgedLength - maxOpeningTabs;
        if (maxPurgeLength <= 0) {
          console.log("The counts of open tabs are within set value.");
          resolve();
          return;
        }

        t = t.filter(v =>
          !v.active && (checkExcludeList(v.url) & NORMAL) !== 0);

        var p = [];
        var i = 0;
        while (i < t.length) {
          if (maxPurgeLength-- <= 0) {
            break;
          }

          p.push( purge(t[i].id) );
          ++i;
        }

        Promise.all(p).then(resolve).catch(reject);
      });
    });
  }//}}}

  /**
   * This function will check memory capacity.
   * If the memory is shortage, return true.
   *
   * @param criteria_memory_size criteria memory size(MByte).
   * @return {Promise} promiseが返る。
   */
  function isLackTheMemory(criteria_memory_size)//{{{
  {
    console.log('isLackTheMemory', criteria_memory_size);

    return new Promise((resolve, reject) => {
      chrome.system.memory.getInfo(info => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }

        var ratio = info.availableCapacity / Math.pow(1024.0, 2);
        console.log('availableCapacity(MByte):', ratio);
        if (ratio < parseFloat(criteria_memory_size)) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }//}}}


  // These processes are If you called at normal function,
  // May called multiple times at the same time.
  // Therefore, the callback function of setInterval is called.
  function initializeIntervalProcess(intervalTime)//{{{
  {
    console.log('initializeIntervalProcess', intervalTime);

    return new Promise(resolve => {
      setInterval(() => {//{{{
        console.log('run callback funciton of setInterval.');
        if (db === void 0 || db === null) {
          console.error('IndexedDB is not initialized yet.');
          return;
        }

        if (unloadedChange) {
          unloadedChange = false;

          // If this function was called the observe function of unloaded,
          // When user close multiple tabs, continuously call more than once.
          // Thus, the same session is added more than once.
          // So call at here.
          exclusiveProcessForFunc('writeSession', writeSession, unloaded);
        }

        if (!disableTimer) {
          if (myOptions.get('purging_all_tabs_except_active')) {
            exclusiveProcessForFunc(
              'purgingAllTabs', purgingAllTabsExceptForTheActiveTab);
          }

          if (myOptions.get('enable_auto_purge')) {
            exclusiveProcessForFunc('autoPurgeCheck', autoPurgeCheck);
          }
        }
      }, intervalTime * 1000);//}}}

      resolve();
    });
  }//}}}
  
  function getHostName(url)//{{{
  {
    console.log('getHostName', url);

    var result = /\/\/([\w-.~]*)\//i.exec(url);
    if (result) {
      return result[1];
    } else {
      console.error("Don't get hostname.");
      return null;
    }
  }//}}}

  function deleteOldDatabase()//{{{
  {
    console.log('deleteOldDatabase');

    return new Promise((resolve, reject) => {
      var p = [];
      p.push( deleteOldSession() );
      p.push( deleteOldHistory() );

      Promise.all(p)
      .then(deleteNotUsePageInfo)
      .then(deleteNotUseDataURI)
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject();
      });
    });
  }//}}}

  function deleteOldSession()//{{{
  {
    console.log('deleteOldSession');

    return new Promise((resolve, reject) => {
      if (myOptions.size === 0) {
        console.error('myOptions is not loaded yet.');
        reject();
        return;
      }

      db.getAll({
        name: dbSessionName,
      })
      .then(histories => {
        return new Promise(resolve2 => {
          // -1 is the current session.
          var max_sessions = parseInt(myOptions.get('max_sessions'), 10) - 1;

          var tempList = new Set();
          var dateList = [];
          histories.forEach(v => {
            if (!tempList.has(v.date)) {
              tempList.add(v.date);
              dateList.push(v.date);
            }
          });

          if (dateList.length < max_sessions) {
            resolve2(null);
            return;
          }

          resolve2(dateList.slice(0, dateList.length - max_sessions));
        });
      })
      .then(dateList => {
        return new Promise((resolve2, reject2) => {
          if (dateList === null || dateList.length === 0) {
            resolve2();
            return;
          }

          var range = (dateList.length === 1) ?
                      IDBKeyRange.only(dateList[0]) :
                      IDBKeyRange.bound(
                        dateList[0], dateList[dateList.length - 1]);
          db.getCursor({
            name: dbSessionName,
            range: range,
            indexName: 'date',
          })
          .then(sessions => {
            var delKeys = sessions.map(v => v.id);
            return db.delete({ name: dbSessionName, keys: delKeys });
          })
          .then(resolve2)
          .catch(reject2);
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteOldHistory()//{{{
  {
    console.log('deleteOldHistory');

    return new Promise((resolve, reject) => {
      if (myOptions.size === 0) {
        console.error('myOptions is not loaded yet.');
        reject();
        return;
      }

      var length = parseInt(myOptions.get('max_history'), 10);

      var now = new Date();
      db.getCursor({
        name: dbHistoryName,
        range: IDBKeyRange.upperBound(
          new Date(
            now.getFullYear(), now.getMonth(), now.getDate() - length,
            23, 59, 59, 999).getTime()
        ),
      })
      .then(histories => {
        var delKeys = histories.map(v => v.date);
        return db.delete({ name: dbHistoryName, keys: delKeys });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteNotUsePageInfo()//{{{
  {
    console.log('deleteNotUsePageInfo');

    return new Promise((resolve, reject) => {
      var p = [];
      p.push( db.getAll({ name: dbPageInfoName     } ) );
      p.push( db.getAll({ name: dbHistoryName      } ) );
      p.push( db.getAll({ name: dbSessionName      } ) );
      p.push( db.getAll({ name: dbSavedSessionName } ) );

      Promise.all(p)
      .then(results => {
        return new Promise((resolve2, reject2) => {
          function check(array, target)
          {
            return new Promise((resolve3, reject3) => {
              var result = array.some(v => (v.url === target.url));

              if (result) {
                reject3();
              } else {
                resolve3();
              }
            });
          }

          var pageInfos     = results[0];
          var histories     = results[1];
          var sessions      = results[2];
          var savedSessions = results[3];

          var p2 = [];
          pageInfos.forEach(v => {
            p2.push(
              new Promise(resolve3 => {
                var p3 = [];
                p3.push( check(histories, v) );
                p3.push( check(sessions, v) );
                p3.push( check(savedSessions, v) );
                Promise.all(p3).then(
                  () => resolve3(v.url),
                  () => resolve3(null)
                );
              })
            );
          });

          Promise.all(p2).then(results2 => {
            var delKeys = results2.filter(v => (v !== null));
            return db.delete({ name: dbPageInfoName, keys: delKeys });
          })
          .then(resolve2)
          .catch(reject2);
        });
      }, e => {
        console.error(e);
        reject();
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteNotUseDataURI()//{{{
  {
    console.log('deleteNotUseDataURI');

    return new Promise((resolve, reject) => {
      var p = [];
      p.push( db.getAll({ name: dbDataURIName } ) );
      p.push( db.getAll({ name: dbPageInfoName } ) );

      Promise.all(p)
      .then(results => {
        return new Promise((resolve2, reject2) => {
          var dataURIs = results[0];
          var pageInfos = results[1];

          var p2 = [];
          dataURIs.forEach(v => {
            p2.push(
              new Promise(resolve3 => {
                var result = pageInfos.some(v2 => (v2.host === v.host));
                resolve3(result ? null : v.host);
              })
            );
          });

          Promise.all(p2).then(results2 => {
            var delKeys = results2.filter(v => (v !== null));
            return db.delete({ name: dbDataURIName, keys: delKeys });
          })
          .then(resolve2)
          .catch(reject2);
        });
      }, e => {
        console.error(e);
        reject();
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function writeSession(unloaded)//{{{
  {
    console.log('writeSession', unloaded);

    return new Promise((resolve, reject) => {
      var date = new Date();
      var nowTime = date.getTime();

      // currentSessionTimeの処理
      (() => {
        return new Promise((resolve2, reject2) => {
          console.log('currentSessionTime', currentSessionTime);

          if (currentSessionTime) {
            // previous current session is delete.
            db.getCursor({
              name: dbSessionName,
              range: IDBKeyRange.only(currentSessionTime),
              indexName: 'date',
            })
            .then(histories => {
              var delKeys = histories.map(v => v.id);
              return db.delete({ name: dbSessionName, keys: delKeys });
            })
            .then(resolve2)
            .catch(reject2);
          } else {
            resolve2();
          }
        });
      })()
      .then(() => {
        return new Promise((resolve2, reject2) => {
          var sessionWrites = [];
          for (var tabId in unloaded) {
            if (unloaded.hasOwnProperty(tabId)) {
              var item = unloaded[tabId];
              if (item.url) {
                // session
                sessionWrites.push({ date: nowTime, url: item.url });
              } else {
                console.error("Don't find url.", item.url);
                reject2();
              }
            }
          }

          db.add({ name: dbSessionName, data: sessionWrites })
          .then(resolve2)
          .catch(reject2);
        });
      })
      .then(() => {
        return new Promise((resolve2, reject2) => {
          currentSessionTime = nowTime;

          var write = {};
          write[previousSessionTimeKey] = nowTime;
          chrome.storage.local.set(write, () => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError.message);
              reject2();
              return;
            }

            resolve2();
          });
        });
      })
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject();
      });
    });
  }//}}}

  function closureOfWriteHistory() {//{{{
    var writeSet = new Set();

    function writeHistory(tab)//{{{
    {
      console.log('writeHistory', tab);

      return new Promise((resolve, reject) => {
        if (writeSet.has(tab.url)) {
          console.warn(
            'Be running to write the same URL of a history to Database' +
            ' already.');
          resolve();
          return;
        }
        writeSet.add(tab.url);

        var now   = new Date();
        var year  = now.getFullYear();
        var month = now.getMonth();
        var day   = now.getDate();
        var begin = new Date(year, month, day, 0, 0, 0, 0);

        db.getCursor({
          name: dbHistoryName,
          range: IDBKeyRange.lowerBound(begin.getTime()),
        })
        .then(histories => {
          var delKeys = histories.filter(v => (v.url === tab.url));
          delKeys = delKeys.map(v => v.date);
          return db.delete({ name: dbHistoryName, keys: delKeys });
        })
        .then(() => {
          // history
          return db.add({
            name: dbHistoryName,
            data: {
              date: now.getTime(),
              url: tab.url,
            },
          });
        })
        .then(() => {
          return new Promise(resolve2 => {
            var host = getHostName(tab.url);
            var p = [];

            // pageInfo
            p.push(
              db.add({
                name: dbPageInfoName,
                data: {
                  url: tab.url,
                  title: tab.title || 'Unknown',
                  host: host,
                },
              })
            );
            // dataURI.
            p.push(
              new Promise((resolve3, reject3) => {
                if (tab.favIconUrl) {
                  getDataURI(tab.favIconUrl)
                  .then(iconDataURI => {
                    return db.add({
                      name: dbDataURIName,
                      data: {
                        host: host,
                        dataURI: iconDataURI,
                      }
                    });
                  })
                  .then(resolve3)
                  .catch(reject3);
                } else {
                  console.log("Don't find favIconUrl.");
                  resolve3();
                }
              })
            );
            // If Promise was error, it is transaction error.
            // When its error was shown, to occur in the key already exist.
            // Therefore, I call the resolve function.
            Promise.all(p).then(resolve2, resolve2);
          });
        })
        .then(() => {
          writeSet.delete(tab.url);
          resolve();
        })
        .catch(e => {
          console.error(e);
          reject();
        });
      });
    }//}}}

    return writeHistory;
  }//}}}

  var writeHistory = closureOfWriteHistory();

  function deleteAllPurgedTabUrlFromHistory()//{{{
  {
    return new Promise((resolve, reject) => {
      function deleteUrl(url)
      {
        return new Promise(
          resolve => chrome.history.deleteUrl({ url: url }, resolve));
      }

      var regex = new RegExp('^' + blankUrl, 'i');
      chrome.history.search({ text: '' }, histories => {
        var deleteUrls = new Set();
        histories.forEach(v => {
          if (regex.test(v.url)) {
            deleteUrls.add(v.url);
          }
        });

        var p = [];
        var iter = deleteUrls.entries();
        for (var i = iter.next(); !i.done; i = iter.next()) {
          p.push( deleteUrl(i.value[1]) );
        }
        Promise.all(p)
        .then(resolve)
        .catch(reject);
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
      chrome.tabs.getSelected(tab => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }
        resolve(tab);
      });
    });
  }//}}}

  /**
   * check If the url has contained the release pages.
   *
   * @param {String} url - the target url.
   * @return {Boolean} If the url is contained, return true.
   *                   if the different, return false.
   */
  function isReleasePage(url)//{{{
  {
    console.log('isReleasePage', url);
    return url.indexOf(blankUrl) === 0;
  }//}}}

  /**
  * Check whether the user matches that set the exclusion list.
  * @param {String} url - the url to check whether matches.
  * @param {Object} excludeObj - the object represent exclusion list settings.
  *                        list    - 除外リストの値。複数のものは\nで区切る.
  *                        options - 正規表現のオプション.
  *                        returnValue - 一致したときに返す返り値
  * @return {Number} 引数にはnullかreturnValueの値が入る
  */
  function checkMatchUrlString(url, excludeObj)//{{{
  {
    console.log('checkMatchUrlString', url, excludeObj);

    var excludeArray = excludeObj.list.split('\n');
    var i = 0;
    while (i < excludeArray.length) {
      if (excludeArray[i] !== '') {
        var re = new RegExp(excludeArray[i].trim(), excludeObj.options);
        if (re.test(url)) {
          return excludeObj.returnValue;
        }
      }
      ++i;
    }
    return null;
  }//}}}

  /**
   * return the exclusion list have been set argument,
   *
   * @param {String} target - the name of the target list.
   *                   If the value is undefined, return normal exlusion list.
   * @return {Object} the object of the list relation.
   */
  function getTargetExcludeList(target)//{{{
  {
    console.log('getTargetExcludeList', target);
    switch (target) {
      case 'extension':
        return {
          list:        extensionExcludeUrl,
          options:     'i',
          returnValue: EXTENSION_EXCLUDE,
        };
      case 'keybind':
        if (myOptions.size !== 0) {
          return {
            list:        myOptions.get('keybind_exclude_url'),
            options:     myOptions.get('keybind_regex_insensitive') ? 'i' : '',
            returnValue: KEYBIND_EXCLUDE,
          };
        }
        break;
      default:
        if (myOptions.size !== 0) {
          return {
            list:        myOptions.get('exclude_url'),
            options:     myOptions.get('regex_insensitive') ? 'i' : '',
            returnValue: USE_EXCLUDE,
          };
        }
    }
    console.error('getTargetExcludeList was error.', target);
    return { list: '', options: '', returnValue: null };
  }//}}}

  /**
  * 与えられたURLが全ての除外リストに一致するか検索する。
  * @param {String} url - 対象のURL.
  * @return {Value} If be ran resolve function, return value is following.
  *               EXTENSION_EXCLUDE = 拡張機能内の除外リストと一致
  *               USE_EXCLUDE    = ユーザー指定の除外アドレスと一致
  *               TEMP_EXCLUDE   = 一時的な非解放リストと一致
  *               NORMAL = 一致しなかった。
  *             And if match the exclusion list of key bindings,
  *             make a bit addition of KEYBIND_EXCLUDE.
  *
  *             When you compare these values, you should use bit addition.
  */
  function checkExcludeList(url)//{{{
  {
    console.log('checkExcludeList');

    if (url === void 0 || url === null || url.length === 0) {
      return INVALID_EXCLUDE;
    }

    // Check the keybind exclude list.
    var keybind =
      checkMatchUrlString(url, getTargetExcludeList('keybind')) || 0;

    // Check the exclude list in the extension.
    var result = checkMatchUrlString(url, getTargetExcludeList('extension'));
    if (result) {
      return result | keybind;
    }

    // Check the normal exclude list.
    result = checkMatchUrlString(url, getTargetExcludeList());
    if (result) {
      return result | keybind;
    }

    // Check to the temporary exclude list or don't match the exclude lists.
    return (tempRelease.has(url) ? TEMP_EXCLUDE : NORMAL) | keybind;
  }//}}}

  /**
   * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
   * @param {Tab} tab 対象のタブ.
   * @param {Promise} promiseが返る。
   */
  function reloadBrowserIcon(tab)//{{{
  {
    console.log('reloadBrowserIcon', tab);

    return new Promise((resolve, reject) => {
      var changeIcon = disableTimer ? DISABLE_TIMER : checkExcludeList(tab.url);
      chrome.browserAction.setIcon(
        { path: icons.get(changeIcon), tabId: tab.id }, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            reject();
            return;
          }
          currentIcon = changeIcon;

          var title = 'Tab Memory Purge\n';
          if (changeIcon & DISABLE_TIMER) {
            title += "The purging timer of the all tabs has stopped.";
          } else if (changeIcon & NORMAL) {
            title += "The url of this tab isn't include exclude list.";
          } else if (changeIcon & USE_EXCLUDE) {
            title += "The url of this tab is included your exclude list.";
          } else if (changeIcon & TEMP_EXCLUDE) {
            title += "The url of this tab is included" +
                     " your temporary exclude list.";
          } else if (changeIcon & EXTENSION_EXCLUDE) {
            title += "The url of this tab is included" +
                    " exclude list of in this extension.";
          } else {
            console.error('Invalid state. ' + changeIcon);
            reject();
            return;
          }

          if (changeIcon & KEYBIND_EXCLUDE) {
            title += "\nAnd also included in the exclude list of key bindings.";
          }

          chrome.browserAction.setTitle({ tabId: tab.id, title: title });
          resolve(changeIcon);
        }
      );
    });
  }//}}}

  /**
   * Return the split object of the arguments of the url.
   *
   * @param {String} url -  the url of getting parameters.
   * @param {String} name -  the target parameter name.
   * @return {String} the string of a parameter.
   */
  function getParameterByName(url, name)//{{{
  {
    console.log('getParameterByName', url, name);

    var regex   = new RegExp("[\\?&]" + name + "       = ([^&#]*)");
    var results = regex.exec(decodeURIComponent(url));
    return results === null ?
           "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }//}}}

  /**
   * When purged tabs, return the url for reloading tab.
   *
   * @param {Object} url - the url of the tab.
   * @return {Promise} return the promise object.
   *                   When be resolved, return the url for to purge.
   */
  function getPurgeURL(url)//{{{
  {
    console.log('getPurgeURL', url);

    var page = blankUrl;
    var args = '&url=' + encodeURIComponent(url);
    return encodeURI(page) + '?' + encodeURIComponent(args);
  }//}}}

  /**
  * タブの解放を行います。
  * @param {Number} tabId タブのID.
  * @param {Promise} promiseが返る。
  */
  function purge(tabId)//{{{
  {
    console.log('purge');

    return new Promise((resolve, reject) => {
      if (toType(tabId) !== 'number') {
        console.error("tabId is not number.");
        reject();
        return;
      }

      if (unloaded.hasOwnProperty(tabId)) {
        console.log('Already purging. "' + tabId + '"');
        reject();
        return;
      }

      var p = [];
      p.push(
        new Promise((resolve2, reject2) => {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError.message);
              reject2();
              return;
            }
            resolve2(tab);
          });
        })
      );

      p.push(
        new Promise((resolve2, reject2) => {
          chrome.tabs.executeScript(
            tabId, { file: getScrollPosScript }, scrollPosition => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                reject2();
                return;
              }
              resolve2(scrollPosition);
            }
          );
        })
      );

      Promise.all(p)
      .then(results => {
        return new Promise((resolve2, reject2) => {
          var tab            = results[0];
          var scrollPosition = results[1];

          if (tab.status !== 'complete') {
            console.error(
              "The target tab has not been completed loading yet.", tab);
            reject2();
            return;
          }

          var state = checkExcludeList(tab.url);
          if (state & EXTENSION_EXCLUDE) {
            console.warn('The tabId have been included the exclusion list' +
                 ' of extension.', tabId);
            reject2();
            return;
          } else if (state & INVALID_EXCLUDE) {
            console.error("Don't get the url of the tab.", tabId);
            reject2();
            return;
          }

          var p2 = [];
          p2.push( writeHistory(tab) );
          p2.push(
            new Promise(resolve3 => {
              chrome.tabs.sendMessage(tabId, { event: 'form_cache' }, resolve3);
            })
          );

          Promise.all(p2)
          .then(() => {
            return new Promise((resolve3, reject3) => {
              var url = getPurgeURL(tab.url);

              chrome.tabs.executeScript(tabId, {
                code: 'window.location.replace("' + url + '");' }, () => {
                  if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    reject3();
                    return;
                  }
                  resolve3();
                }
              );
            });
          })
          .then(() => {
            unloaded[tabId] = {
              url            : tab.url,
              scrollPosition : scrollPosition[0] || { x : 0 , y : 0 },
            };

            return deleteAllPurgedTabUrlFromHistory();
          })
          .then(resolve2)
          .catch(reject2);
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
  * 解放したタブを復元します。
  * @param {Number} tabId 復元するタブのID.
  * @return {Promise} promiseが返る。
  */
  function unPurge(tabId)//{{{
  {
    console.log('unPurge', tabId);

    return new Promise((resolve, reject) => {
      if (toType(tabId) !== 'number') {
        console.error("tabId is not number.");
        reject();
        return;
      }

      var url = unloaded[tabId].url;
      chrome.tabs.sendMessage(tabId,
        { event: 'location_replace' }, useChrome => {
          // If the url is empty in purge page.
          if (useChrome) {
            chrome.tabs.update(tabId, { url: url }, resolve);
          } else {
            resolve();
          }
        }
      );
    });
  }//}}}

  /**
  * 解放状態・解放解除を交互に行う
  * @param {Number} tabId 対象のタブのID.
  * @return {Promise} promiseが返る。
  */
  function purgeToggle(tabId)//{{{
  {
    console.log('purgeToggle', tabId);

    return new Promise((resolve, reject) => {
      if (toType(tabId) !== 'number') {
        console.error("tabId is not number.");
        reject();
        return;
      }

      if (unloaded.hasOwnProperty(tabId)) {
        unPurge(tabId).then(resolve, reject);
      } else {
        purge(tabId).then(resolve, reject);
      }
    });
  }//}}}

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} tabId 処理を行うタブのID.
  * @return {Promise} Promiseが返る。
  */
  function tick(tabId)//{{{
  {
    console.log('tick');

    return new Promise((resolve, reject) => {
      if (toType(tabId) !== 'number' || unloaded.hasOwnProperty(tabId)) {
        console.error(
          "tabId isn't number or added to unloaded already. " + tabId);
        reject();
        return;
      }

      chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError) {
          console.log('tick function is skipped.', tabId);
          reject();
          return;
        }

        // アクティブタブへの処理の場合、行わない
        if (tab.active) {
          // アクティブにしたタブのアンロード時間更新
          setTick(tabId).then(resolve, reject);
        } else {
          purge(tabId).then(resolve, reject);
        }
      });
    });
  }//}}}

  /**
  * 定期的な処理を停止
  * @param {Number} tabId 停止するタブのID.
  */
  function deleteTick(tabId)//{{{
  {
    console.log('deleteTick');

    if (ticked.has(tabId)) {
      clearInterval(ticked.get(tabId));
      ticked.delete(tabId);
    }
  }//}}}

  /**
  * 定期的に解放処理の判断が行われるよう設定します。
  * 既に設定済みなら時間を延長します。
  * @param {Number} tabId 設定するタブのID.
  * @return {Promise} Promiseが返る。
  */
  function setTick(tabId)//{{{
  {
    console.log('setTick');

    return new Promise((resolve, reject) => {
      if (myOptions.size === 0 || toType(tabId) !== 'number') {
        console.error('myOptions is not loaded yet. or tabId is not number.');
        reject();
        return;
      }

      if (disableTimer) {
        resolve();
        return;
      }

      chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError) {
          console.log('setTick function is skipped.');
          resolve();
          return;
        }

        // 全ての除外アドレス一覧と比較
        var state = checkExcludeList(tab.url);
        if (state & NORMAL) { // 除外アドレスに含まれていない場合
          // 分(設定) * 秒数 * ミリ秒
          var timer = parseInt(myOptions.get('timer'), 10) * 60 * 1000;

          // Update.
          deleteTick(tabId);
          var t = setInterval(() => tick(tabId),timer);
          ticked.set(tabId, t);
        } else { // include exclude list
          deleteTick(tabId);
        }

        resolve();
      });
    });
  }//}}}

  function restoreTab(url)
  {
    return new Promise((resolve, reject) => {
      chrome.tabs.create(
        { url: getPurgeURL(url), active: false }, tab => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            reject();
            return;
          }

          var ret = new Map();
          ret.set(tab.id, {
            url            : url,
            scrollPosition : { x : 0 , y : 0 },
          });
          resolve(ret);
        }
      );
    });
  }

  /**
  * 指定した辞書型の再帰処理し、タブを復元する。
  * 引数は第一引数のみを指定。
  *
  * @param {Array} sessions You want to restore the array of sessions.
  * @return {Promise} promiseが返る。
  */
  function restore(sessions)//{{{
  {
   console.log('restore', sessions);

   return new Promise((resolve, reject) => {
     var i, j;
     var tabId, iter;
     var p = [];

     i = 0;
     while (i < sessions.length) {
       p.push( restoreTab(sessions[i].url) );
       ++i;
     }

     Promise.all(p).then(results => {
       i = 0;
       while (i < results.length) {
         iter = results[i].entries();
         for (j = iter.next(); !j.done; j = iter.next()) {
           tabId = j.value[0];
           if (!unloaded.hasOwnProperty(tabId)) {
             unloaded[tabId] = j.value[1];
           } else {
             console.error('same tabId is found in unloaded object.');
           }
         }
         ++i;
       }
       resolve();
     })
     .catch(e => {
       console.error(e);
       reject();
     });
   });
  }//}}}

  function switchTempRelease(url)//{{{
  {
    console.log('switchTempRelease', url);

    if (tempRelease.has(url)) {
      // remove url in tempRelease.
      tempRelease.delete(url);
    } else {
      // push url in tempRelease.
      tempRelease.add(url);
    }
  }//}}}

  /**
  * 非解放・非解放解除を交互に行う
  * @param {Tab} tab 対象のタブオブジェクト.
  */
  function tempReleaseToggle(tab)//{{{
  {
    console.log('tempReleaseToggle', tab);

    return new Promise((resolve, reject) => {
      switchTempRelease(tab.url);

      setTick(tab.id)
      .then(reloadBrowserIcon(tab))
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
  * 指定されたタブに最も近い未解放のタブをアクティブにする。
  * 右側から探索され、見つからなかったら左側を探索する。
  * 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
  * @param {Tab} tab 基準点となるタブ.
  * @return {Promise} promiseが返る。
  */
  function searchUnloadedTabNearPosition(tab)//{{{
  {
    console.log('searchUnloadedTabNearPosition', tab);

    return new Promise((resolve, reject) => {
      // 現在のタブの左右の未解放のタブを選択する
      chrome.windows.get(tab.windowId, { populate: true }, win => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }

        var tabs = win.tabs.filter(v =>
          !unloaded.hasOwnProperty(v.id) && !isReleasePage(v.url));
        var t = tabs.filter(v => (v.index >= tab.index));
        var tLength = 0;
        if (t.length === 0) {
          t = tabs.filter(v => (v.index < tab.index));
          tLength = t.length - 1;
        }

        if (t.length > 0) {
          // If found tab, It's active.
          chrome.tabs.update(t[tLength].id, { active: true }, resolve);
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
    console.log('Extension Installed.');

    return new Promise(resolve => {
      chrome.runtime.openOptionsPage().then(resolve);
    });
  }//}}}

  function restoreSessionBeforeUpdate(previousSessionTime)//{{{
  {
    return new Promise((resolve, reject) => {
      if (previousSessionTime === void 0 ||
          previousSessionTime === null) {
        console.error("previousSessionTime is undefined or null");
        reject();
        return;
      }

      getHistoryListFromIndexedDB(db, dbSessionName)
      .then(sessions => {
        return new Promise((resolve2, reject2) => {
          if (sessions.length === 0) {
            resolve2();
            return;
          }

          var restoreSession = sessions.filter(
            v => (previousSessionTime === v.date));

          if (restoreSession.length > 0) {
            if (restoreSession.length > 1) {
             console.warn('the length of restoreSession is greater than 1.');
            }

            restore(restoreSession[0].data)
            .then(resolve2)
            .catch(reject2);
            return;
          }

          resolve2();
        });
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
    console.log('Extension Updated.');

    return new Promise((resolve, reject) => {
      getInitAndLoadOptions()
      .then(options => {
        return new Promise((resolve2, reject2) => {
          if (options.get('previousSessionTimeKey')) {
            showDialogOfRestoreSessionBeforeUpdate()
            .then(resolve2)
            .catch(reject2);
          } else {
            resolve2();
          }
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
    console.log('getVersion');
    var details = chrome.app.getDetails();
    return details.version;
  }//}}}

  function versionCheckAndUpdate()//{{{
  {
    console.log('versionCheckUpdate');

    function updateVersion(currVersion)
    {
      return new Promise(resolve => {
        var write = {};
        write[versionKey] = currVersion;
        chrome.storage.local.set(write, resolve);
      });
    }

    return new Promise((resolve, reject) => {
      var currVersion = getVersion();
      chrome.storage.local.get(versionKey, storages => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }

        var prevVersion = storages[versionKey];
        if (currVersion !== prevVersion) {
          // この拡張機能でインストールしたかどうか
          var runFunc = (prevVersion === void 0) ? onInstall : onUpdate;

          updateVersion(currVersion)
          .then(runFunc)
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
      chrome.storage.local.remove(previousSessionTimeKey, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
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
    console.log('getInitAndLoadOptions');

    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, items => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }
        var key;

        // All remove invalid options. but exclude version.
        var removeKeys = [];
        for (key in items) {
          if (items.hasOwnProperty(key) && !defaultValues.hasOwnProperty(key)) {
            removeKeys.push(key);
            delete items[key];
          }
        }

        chrome.storage.local.remove(removeKeys, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            reject();
            return;
          }

          // My options are initialized.
          var options = new Map();
          Object.keys(items).forEach(v => options.set(v, items[v]));
          for (key in defaultValues) {
            if (defaultValues.hasOwnProperty(key) && !options.has(key)) {
              options.set(key, defaultValues[key]);
            }
          }

          resolve(options);
        });
      });
    });
  }//}}}

  function initializeUseOptions(options)//{{{
  {
    console.log('initializeUseOptions');

    return new Promise(resolve => {
      myOptions = options;

      // initialize badge.
      chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF' });

      resolve();
    });
  }//}}}

  function initializeAlreadyPurgedTabs()//{{{
  {
    console.log('initializeAlreadyPurgedTabs');

    function toAdd(current)
    {
      return new Promise((resolve, reject) => {
        var result = checkExcludeList(current.url);
        if (result ^ (NORMAL & INVALID_EXCLUDE)) {
          if (isReleasePage(current.url)) {
            unloaded[current.id] = {
              url            : getParameterByName(current.url, 'url'),
              scrollPosition : { x: 0 , y: 0 },
            };
          }

          setTick(current.id)
          .then(resolve)
          .catch(reject);
        } else {
          resolve();
        }
      });
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.query({}, tabs => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }

        // If already purging tab, be adding the object of purging tab.
        var p = [];
        var i = 0;
        while (i < tabs.length) {
          p.push( toAdd(tabs[i]) );
          ++i;
        }

        Promise.all(p)
        .then(resolve)
        .catch(reject);
      });
    });
  }//}}}

  function initializeDatabase()//{{{
  {
    function dbOpen()
    {
      db = new Database(dbName, dbVersion);
      return db.open(dbCreateStores);
    }

    return new Promise((resolve, reject) => {
      if (db !== null) {
        db.close()
        .then(dbOpen)
        .then(resolve)
        .catch(reject);
      } else {
        dbOpen()
        .then(resolve)
        .catch(reject);
      }
    });
  }//}}}

  /**
   * be initializing.
   */
  function initialize()//{{{
  {
    console.log('initialize');

    initializeDatabase()
    .then(versionCheckAndUpdate)
    .then(getInitAndLoadOptions)
    .then(initializeUseOptions)
    .then(initializeAlreadyPurgedTabs)
    .then(deleteOldDatabase)
    .then(() => {
      return initializeIntervalProcess(myOptions.get('interval_timing') || 5);
    })
    .then(initializeIntervalUpdateCheck(updateCheckTime))
    .catch(e => console.error(e || 'initialize error.'));
  }//}}}

  function switchDisableTimerState()//{{{
  {
    console.log('switchDisableTimerState');

    function lastProcess()
    {
      disableTimer = disableTimer ? false : true;

      return new Promise((resolve, reject) => {
        getCurrentTab()
        .then(reloadBrowserIcon)
        .then(resolve)
        .catch(reject);
      });
    }

    return new Promise((resolve, reject) => {
      if (disableTimer) {
        chrome.tabs.query({}, tabs => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            reject();
            return;
          }

          tabs.forEach(v => {
            var result = checkExcludeList(v.url);
            if (result & NORMAL && !isReleasePage(v.url)) {
              setTick(v.id);
            }
          });
          lastProcess().then(resolve).catch(reject);
        });
      } else {
        var iter = ticked.entries();
        for (var i = iter.next(); !i.done; i = iter.next()) {
          clearInterval(i.value[1]);
        }
        ticked.clear();
        lastProcess().then(resolve).catch(reject);
      }
    });
  }//}}}

  /**
   * onActivatedFunc
   *
   * @param tabId the id of the tab.
   * @return {Promise} promiseが返る。
   */
  function onActivatedFunc(tabId)//{{{
  {
    console.log('onActivatedFunc', tabId);

    return new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject();
          return;
        }

        // 前にアクティブにされていたタブのアンロード時間を更新
        if (oldActiveIds.has(tab.WindowId)) {
          setTick(oldActiveIds.get(tab.windowId));
        }
        oldActiveIds.set(tab.windowId, tabId);

        // アイコンの状態を変更
        reloadBrowserIcon(tab)
        .then(resolve)
        .catch(reject);
      });
    });
  }//}}}

  function updateOptionValues()//{{{
  {
    return new Promise((resolve, reject) => {
      getInitAndLoadOptions()
      .then(options => {
        myOptions = options;
        resolve();
      })
      .catch(reject);
    });
  }//}}}

  chrome.tabs.onActivated.addListener(activeInfo => {//{{{
    console.log('chrome.tabs.onActivated.', activeInfo);
    if (unloaded.hasOwnProperty(activeInfo.tabId) &&
        myOptions.get('no_release') === false) {
        unPurge(activeInfo.tabId)
        .then(onActivatedFunc(activeInfo.tabId))
        .catch(e => console.error(e));
    } else {
      onActivatedFunc(activeInfo.tabId)
      .catch(e => console.error(e));
    }
  });//}}}

  chrome.tabs.onCreated.addListener(tab => {//{{{
    console.log('chrome.tabs.onCreated.', tab);
    setTick(tab.id);
  });//}}}

  chrome.tabs.onRemoved.addListener(tabId => {//{{{
    console.log('chrome.tabs.onRemoved.', tabId);
    delete unloaded[tabId];
  });//}}}

  chrome.tabs.onAttached.addListener(tabId => {//{{{
    console.log('chrome.tabs.onAttached.', tabId);
    setTick(tabId);
  });//}}}

  chrome.tabs.onDetached.addListener(tabId => {//{{{
    console.log('chrome.tabs.onDetached.', tabId);
    delete unloaded[tabId];
  });//}}}

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {//{{{
    if (changeInfo.status === 'loading') {
      console.log('chrome.tabs.onUpdated. loading.', tabId, changeInfo, tab);

      if (!isReleasePage(tab.url) && unloaded.hasOwnProperty(tabId)) {
        delete unloaded[tabId];
      }
    } else {
      console.log('chrome.tabs.onUpdated. complete.', tabId, changeInfo, tab);

      loadScrollPosition(tabId)
      .then(reloadBrowserIcon(tab));
    }
  });//}}}

  chrome.windows.onRemoved.addListener(windowId => {//{{{
    console.log('chrome.windows.onRemoved.', windowId);
    oldActiveIds.delete(windowId);
  });//}}}

  chrome.runtime.onMessage.addListener(//{{{
    (message, sender, sendResponse) => {
      console.log('chrome.runtime.onMessage.', message, sender);
      switch (message.event) {
        case 'initialize':
          initialize();
          break;
        case 'release':
          getCurrentTab()
          .then(tab => {
            return new Promise((resolve, reject) => {
              purgeToggle(tab.id).then(
                () => searchUnloadedTabNearPosition(tab),
                reject)
              .then(resolve, reject);
            });
          })
          .catch(e => console.error(e));
          break;
        case 'switch_not_release':
          getCurrentTab()
          .then(tempReleaseToggle)
          .catch(e => console.error(e));
          break;
        case 'all_purge':
        case 'all_purge_without_exclude_list':
          chrome.tabs.query({}, results => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError.message);
              return;
            }

            var t = results.filter(v => {
              var state = checkExcludeList(v.url);
              var retState = (message.event === 'all_purge') ?
                             (EXTENSION_EXCLUDE & INVALID_EXCLUDE) ^ state :
                             NORMAL & state;
              return !unloaded.hasOwnProperty(v.id) && retState !== 0;
            });
            if (t.length === 0) {
              return;
            }
            results = t;

            var p = [];
            results.forEach(v => p.push(purge(v.id)));

            Promise.all(p)
            .then(() => {
              return new Promise((resolve, reject) => {
                getCurrentTab()
                .then(searchUnloadedTabNearPosition)
                .then(resolve)
                .catch(reject);
              });
            })
            .catch(e => console.error(e));
          });
          break;
        case 'all_unpurge':
          // 解放されている全てのタブを解放解除
          for (var key in unloaded) {
            if (unloaded.hasOwnProperty(key)) {
              unPurge(parseInt(key, 10));
            }
          }
          break;
        case 'add_to_temp_exclude_list':
          getCurrentTab()
          .then(tab => {
            return new Promise((resolve, reject) => {
              if (!tempRelease.has(tab.url)) {
                tempRelease.add(tab.url);

                setTick(tab.id)
                .then(reloadBrowserIcon(tab))
                .then(resolve)
                .catch(reject);
              } else {
                resolve();
              }
            });
          })
          .catch(e => console.error(e));
          break;
        case 'reload_option_value':
          updateOptionValues();
          break;
        case 'load_options_and_reload_current_tab':
          getCurrentTab()
          .then(tab => {
            updateOptionValues()
            .then(setTick(tab.id))
            .then(reloadBrowserIcon(tab))
            .catch(e => console.error(e));
          })
          .catch(e => console.error(e));
          break;
        case 'restore':
          restore(message.session)
          .then(() => {
            return new Promise(resolve => {
              console.log('restore is completed.');
              resolve();
            });
          })
          .catch(e => console.error(e));
          break;
        case 'current_icon':
          sendResponse(currentIcon);
          break;
        case 'keybind_check_exclude_list':
          var state = checkExcludeList(message.location.href);
          sendResponse(state ^
            (EXTENSION_EXCLUDE | KEYBIND_EXCLUDE | INVALID_EXCLUDE));
          break;
        case 'switchTimerState':
          switchDisableTimerState()
          .catch(e => console.error(e));
          break;
        case 'excludeDialogMenu':
          getCurrentTab()
          .then(tab => {
            return new Promise(resolve => {
              chrome.tabs.sendMessage(
                tab.id, { event: 'showExcludeDialog' }, resolve);
            });
          })
          .catch(e => console.error(e));
          break;
      }
    }
  );//}}}

  function updateCheck()//{{{
  {
    console.log('updateCheck');

    return new Promise(resolve => {
      chrome.runtime.requestUpdateCheck((status, version) => {
        switch (status) {
        case 'update_available':
          console.log('update is avaliable now.');
          resolve(version);
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

  function initializeIntervalUpdateCheck(checkTime)//{{{
  {
    console.log('initializeIntervalUpdateCheck', checkTime);

    return new Promise(resolve => {
      setInterval(updateCheck, checkTime);
      resolve();
    });
  }//}}}

  chrome.runtime.onUpdateAvailable.addListener(details => {//{{{
    console.log("runtime.onUpdateAvailable", details);
    showUpdateConfirmationDialog();
  });//}}}

  chrome.notifications.onButtonClicked.addListener(//{{{
    (notificationId, buttonIndex) => {
      console.log(
        'nortifications.onButtonClicked', notificationId, buttonIndex);

      switch (notificationId) {
      case UPDATE_CONFIRM_DIALOG:
        if (buttonIndex === 0) {
          writeSession(unloaded)
          .then(
            // reload the extension, and update the extension.
            () => chrome.runtime.reload())
          .catch(e => console.error(e));
        }
        break;
      case RESTORE_PREVIOUS_SESSION:
        if (buttonIndex === 0) {
          getInitAndLoadOptions()
          .then(options =>
              restoreSessionBeforeUpdate(options.get('previousSessionTimeKey')))
          .then(deletePreviousSessionTime)
          .catch(e => console.error(e));
        } else {
          deletePreviousSessionTime();
        }
        break;
      }
    }
  );//}}}

  function showDialogOfRestoreSessionBeforeUpdate() {//{{{
    return new Promise(resolve => {
      chrome.notifications.create(
        RESTORE_PREVIOUS_SESSION,
        {
          type:    'basic',
          title:   'Restore the session before update.',
          message: 'Do want to restore the session before update?',
          iconUrl: chrome.runtime.getURL('../icon/icon_128.png'),
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
          iconUrl: chrome.runtime.getURL('../icon/icon_128.png'),
          buttons: [
            { title: 'Update' },
            { title: 'Later' },
          ],
        },
        resolve
      );
    });
  }//}}}

  initialize();
})();
