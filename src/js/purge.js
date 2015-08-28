(function() {
  "use strict";

  // my option settings.//{{{
  var myOptions = null;

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
  var tempRelease = [];

  // Before selecting the active tab, and the user has been selected tab.
  var oldActiveIds = {};

  var db                  = null; // indexedDB.
  var currentSessionTime  = null;

  var currentIcon         = null;
  var displayPageOfOption = null;
  var disableTimer        = false;
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
  Object.observe(unloaded, function(changes) {//{{{
    debug('unloaded was changed.', changes);

    var tabId;
    changes.forEach(function(v) {
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
    debug('loadScrollPosition', tabId);

    return new Promise(function(resolve, reject) {
      var pos = tempScrollPositions.get(tabId);
      if (pos) {
        chrome.tabs.executeScript(
          tabId, { code: 'scroll(' + pos.x + ', ' + pos.y + ');' }, function() {
            if (chrome.runtime.lastError) {
              error(chrome.runtime.lastError.message);
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
    debug('purgingAllTabsExceptForTheActiveTab');

    var deferred = Promise.defer();
    chrome.tabs.query({}, function(tabs) {
      if (!myOptions) {
        error('myOptions is not loaded yet.');
        deferred.reject();
        return;
      }

      var t = tabs.filter(function(v) {
        return !isReleasePage(v.url);
      });

      var maxOpeningTabs      = myOptions.max_opening_tabs;
      var alreadyPurgedLength = tabs.length - t.length;
      var maxPurgeLength = tabs.length - alreadyPurgedLength - maxOpeningTabs;
      if (maxPurgeLength <= 0) {
        debug("The counts of open tabs are within set value.");
        deferred.reject();
        return;
      }

      t = t.filter(function(v) {
        return !v.active && (checkExcludeList(v.url) & NORMAL) !== 0;
      });

      for (var i = 0; i < t.length; i = (i + 1) | 0) {
        if (maxPurgeLength-- <= 0) {
          break;
        }
        purge(t[i].id);
      }

      deferred.resolve();
    });
    return deferred.promise;
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
    debug('isLackTheMemory', criteria_memory_size);

    var deferred = Promise.defer();
    chrome.system.memory.getInfo(function(info) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        deferred.reject();
        return;
      }

      var ratio = info.availableCapacity / Math.pow(1024.0, 2);
      debug('availableCapacity(MByte):', ratio);
      if (ratio < parseFloat(criteria_memory_size)) {
        deferred.resolve(true);
      } else {
        deferred.resolve(false);
      }
    });
    return deferred.promise;
  }//}}}

  /**
   * check run auto purge or not.
   * @return {Promise} promiseが返る。
   */
  function autoPurgeCheck()//{{{
  {
    debug('autoPurgeCheck');

    var deferred = Promise.defer();
    setTimeout(function() {
      if (!myOptions) {
        error('myOptions is not loaded yet.');
        deferred.reject();
        return;
      }

      isLackTheMemory(myOptions.remaiming_memory)
      .then(function(result) {
        return new Promise(function(resolve, reject) {
          if (result === false) {
            resolve();
            return;
          }

          var ids = [];
          for (var key in ticked) {
            ids.push(parseInt(key, 10));
          }

          ids.forEach(function(v) {
            tick(v)
            .then(function() {
              return isLackTheMemory(myOptions.remaiming_memory);
            })
            .then(function(result) {
              if (result === false) {
                resolve();
              }
            }, reject);
          });
          resolve();
        });
      })
      .then(deferred.resolve)
      .catch(function(e) {
        e ? error(e) : function() {};
        deferred.reject();
      });
    }, 0);
    return deferred.promise;
  }//}}}

  // These processes are If you called at normal function,
  // May called multiple times at the same time.
  // Therefore, the callback function of setInterval is called.
  function initializeIntervalProcess(intervalTime)//{{{
  {
    debug('initializeIntervalProcess', intervalTime);

    return new Promise(function(resolve, reject) {
      if (!myOptions) {
        error('myOptions is not loaded yet.');
        reject();
        return;
      }

      var runWriteSession   = false;
      var runPurgingAllTabs = false;
      var runAutoPurgeCheck = false;
      setInterval(function() {//{{{
        debug('run callback funciton of setInterval.');
        if (db === void 0 || db === null) {
          error('IndexedDB is not initialized yet.');
          return;
        }

        if (unloadedChange && !runWriteSession) {
          debug('update session history');
          unloadedChange = false;

          // If this function was called the observe function of unloaded,
          // When user close multiple tabs, continuously call more than once.
          // Thus, the same session is added more than once.
          // So call at here.
          runWriteSession = true;
          writeSession(unloaded)
          .then(function() {
            runWriteSession = false;
          }, function() {
            runWriteSession = false;
          });
        }

        if (!disableTimer) {
          if (myOptions.purging_all_tabs_except_active && !runPurgingAllTabs) {
            runPurgingAllTabs = true;
            purgingAllTabsExceptForTheActiveTab()
            .then(function() {
              runPurgingAllTabs = false;
            }, function() {
              runPurgingAllTabs = false;
            });
          }

          if (myOptions.enable_auto_purge && !runAutoPurgeCheck) {
            runAutoPurgeCheck = true;
            autoPurgeCheck()
            .then(function() {
              runAutoPurgeCheck = false;
            }, function() {
              runAutoPurgeCheck = false;
            });
          }
        }
      }, intervalTime * 1000);//}}}

      resolve();
    });
  }//}}}
  
  function getHostName(url)//{{{
  {
    debug('getHostName', url);

    var result = /\/\/([\w-.~]*)\//i.exec(url);
    if (result) {
      return result[1];
    } else {
      error("Don't get hostname.");
      return null;
    }
  }//}}}

  function deleteOldDatabase()//{{{
  {
    debug('deleteOldDatabase');

    return new Promise(function(resolve, reject) {
      var p = [];
      p.push( deleteOldSession() );
      p.push( deleteOldHistory() );
      Promise.all(p).then(function() {
        return new Promise(function(resolve2, reject2) {
          deleteNotUsePageInfo()
          .then(deleteNotUseDataURI)
          .then(resolve2)
          .catch(reject2);
        });
      }, function(e) {
        e ? error(e) : function() {};
        reject();
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteOldSession()//{{{
  {
    debug('deleteOldSession');

    return new Promise(function(resolve, reject) {
      if (!myOptions) {
        error('myOptions is not loaded yet.');
        reject();
        return;
      }

      db.getAll({
        name: dbSessionName,
      })
      .then(function(histories) {
        return new Promise(function(resolve2) {
          // -1 is the current session.
          var max_sessions = parseInt(myOptions.max_sessions, 10) - 1;

          var tempList = {};
          var dateList = [];
          histories.forEach(function(v) {
            if (!tempList.hasOwnProperty(v.date)) {
              tempList[v.date] = true;
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
      .then(function(dateList) {
        return new Promise(function(resolve2, reject2) {
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
          .then(function(sessions) {
            var delKeys = sessions.map(function(v) {
              return v.id;
            });

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
    debug('deleteOldHistory');

    return new Promise(function(resolve, reject) {
      if (!myOptions) {
        error('myOptions is not loaded yet.');
        reject();
        return;
      }

      var length = parseInt(myOptions.max_history, 10);

      var now = new Date();
      db.getCursor({
        name: dbHistoryName,
        range: IDBKeyRange.upperBound(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() - length,
                   23, 59, 59, 999).getTime()
        ),
      })
      .then(function(histories) {
        var delKeys = histories.map(function(v) {
          return v.date;
        });
        return db.delete({ name: dbHistoryName, keys: delKeys });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteNotUsePageInfo()//{{{
  {
    debug('deleteNotUsePageInfo');

    return new Promise(function(resolve, reject) {
      var p = [];
      p.push( db.getAll({ name: dbPageInfoName     } ) );
      p.push( db.getAll({ name: dbHistoryName      } ) );
      p.push( db.getAll({ name: dbSessionName      } ) );
      p.push( db.getAll({ name: dbSavedSessionName } ) );
      Promise.all(p).then(function(results) {
        return new Promise(function(resolve2, reject2) {
          function check(array, target)
          {
            return new Promise(function(resolve, reject) {
              var result = array.some(function(v) {
                return v.url === target.url;
              });

              if (result) {
                reject();
              } else {
                resolve();
              }
            });
          }

          var pageInfos     = results[0];
          var histories     = results[1];
          var sessions      = results[2];
          var savedSessions = results[3];

          var p2 = [];
          pageInfos.forEach(function(v) {
            p2.push(
              new Promise(function(resolve3) {
                var p3 = [];
                p3.push( check(histories, v) );
                p3.push( check(sessions, v) );
                p3.push( check(savedSessions, v) );
                Promise.all(p3).then(function() {
                  resolve3(v.url);
                }, function() {
                  resolve3(null);
                });
              })
            );
          });
          Promise.all(p2).then(function(results2) {
            var delKeys = results2.filter(function(v) {
              return v !== null;
            });

            return db.delete({ name: dbPageInfoName, keys: delKeys });
          })
          .then(resolve2)
          .catch(reject2);
        });
      }, function(e) {
        e ? error(e) : function() {};
        reject();
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteNotUseDataURI()//{{{
  {
    debug('deleteNotUseDataURI');

    return new Promise(function(resolve, reject) {
      var p = [];
      p.push( db.getAll({ name: dbDataURIName } ) );
      p.push( db.getAll({ name: dbPageInfoName } ) );
      Promise.all(p).then(function(results) {
        return new Promise(function(resolve2, reject2) {
          var dataURIs = results[0];
          var pageInfos = results[1];

          var p2 = [];
          dataURIs.forEach(function(v) {
            p2.push(
              new Promise(function(resolve3) {
                var result = pageInfos.some(function(v2) {
                  return v2.host === v.host;
                });
                resolve3(result ? null : v.host);
              })
            );
          });
          Promise.all(p2).then(function(results2) {
            var delKeys = results2.filter(function(v) {
              return v !== null;
            });

            return db.delete({ name: dbDataURIName, keys: delKeys });
          })
          .then(resolve2)
          .catch(reject2);
        });
      }, function(e) {
        e ? error(e) : function() {};
        reject();
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function writeSession(unloaded)//{{{
  {
    debug('writeSession', unloaded);

    return new Promise(function(resolve, reject) {
      var nowTime = Date.now();

      // currentSessionTimeの処理
      (function() {
        return new Promise(function(resolve2, reject2) {
          debug('currentSessionTime', currentSessionTime);
          if (currentSessionTime) {
            // previous current session is delete.
            db.getCursor({
              name: dbSessionName,
              range: IDBKeyRange.only(currentSessionTime),
              indexName: 'date',
            })
            .then(function(histories) {
              var delKeys = histories.map(function(v) {
                return v.id;
              });

              return db.delete({ name: dbSessionName, keys: delKeys });
            })
            .then(resolve2)
            .catch(reject2);
          } else {
            resolve2();
          }
        });
      })()
      .then(function() {
        return new Promise(function(resolve2, reject2) {
          var sessionWrites = [];
          for (var tabId in unloaded) {
            if (unloaded.hasOwnProperty(tabId)) {
              var item = unloaded[tabId];
              if (item.url) {
                // session
                sessionWrites.push({ date: nowTime, url: item.url });
              } else {
                error("Don't find url.", item.url);
                reject2();
              }
            }
          }

          db.add({ name: dbSessionName, data: sessionWrites })
          .then(resolve2)
          .catch(reject2);
        });
      })
      .then(function() {
        return new Promise(function(resolve2, reject2) {
          currentSessionTime = nowTime;

          var write = {};
          write[previousSessionTimeKey] = nowTime;
          chrome.storage.local.set(write, function() {
            if (chrome.runtime.lastError) {
              error(chrome.runtime.lastError.message);
              reject2();
              return;
            }

            resolve2();
          });
        });
      })
      .then(resolve)
      .catch(function(e) {
        e ? error(e) : function() {};
        reject();
      });
    });
  }//}}}

  function writeHistory(tab)//{{{
  {
    debug('writeHistory', tab);

    return new Promise(function(resolve, reject) {
      var now = new Date();
      var begin = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                           0, 0, 0, 0);
      var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                           23, 59, 59, 999);

      db.getCursor({
        name: dbHistoryName,
        range: IDBKeyRange.bound(begin.getTime(), end.getTime()),
      })
      .then(function(histories) {
        var delKeys = histories.filter(function(v) {
          return v.url === tab.url;
        });
        delKeys = delKeys.map(function(v) {
          return v.date;
        });

        return db.delete({ name: dbHistoryName, keys: delKeys });
      })
      .then(function() {
        // history
        return db.add({
          name: dbHistoryName,
          data: {
            date: now.getTime(),
            url: tab.url,
          },
        });
      })
      .then(function() {
        return new Promise(function(resolve2) {
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
            new Promise(function(resolve3, reject3) {
              if (tab.favIconUrl) {
                getDataURI(tab.favIconUrl)
                .then(function(iconDataURI) {
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
                log("Don't find favIconUrl.");
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
      .then(resolve)
      .catch(function(e) {
        e ? error(e) : function() {};
        reject();
      });
    });
  }//}}}

  function deleteAllPurgedTabUrlFromHistory()//{{{
  {
    return new Promise(function(resolve, reject) {
      function deleteUrl(url)
      {
        return new Promise(function(resolve) {
          chrome.history.deleteUrl({ url: url }, resolve);
        });
      }

      var regex = new RegExp('^' + blankUrl, 'i');
      chrome.history.search({ text: '' }, function(histories) {
        var deleteUrls = {};
        histories.forEach(function(v) {
          if (regex.test(v.url) && !deleteUrls.hasOwnProperty(v.url)) {
            deleteUrls[v.url] = true;
          }
        });

        var p = [];
        for (var url in deleteUrls) {
          if (deleteUrls.hasOwnProperty(url)) {
            p.push( deleteUrl(url) );
          }
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
    return new Promise(function(resolve, reject) {
      chrome.tabs.getSelected(function(tab) {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError.message);
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
    debug('isReleasePage', url);
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
    debug('checkMatchUrlString');

    var excludeArray = excludeObj.list.split('\n');
    for (var i = 0; i < excludeArray.length; i = (i + 1) | 0) {
      if (excludeArray[i] !== '') {
        var re = new RegExp(trim(excludeArray[i]), excludeObj.options);
        if (re.test(url)) {
          return excludeObj.returnValue;
        }
      }
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
    debug('getTargetExcludeList', target);
    switch (target) {
      case 'extension':
        return {
          list: extensionExcludeUrl,
          options: 'i',
          returnValue: EXTENSION_EXCLUDE,
        };
      case 'keybind':
        if (myOptions) {
          return {
            list: myOptions.keybind_exclude_url,
            options: myOptions.keybind_regex_insensitive ? 'i' : '',
            returnValue: KEYBIND_EXCLUDE,
          };
        }
        break;
      default:
        if (myOptions) {
          return {
            list: myOptions.exclude_url,
            options: myOptions.regex_insensitive ? 'i' : '',
            returnValue: USE_EXCLUDE,
          };
        }
    }
    error('getTargetExcludeList was error.', target);
    return { list: '', options: '', returnValue: null };
  }//}}}

  /**
  * 与えられたURLが全ての除外リストに一致するか検索する。
  * @param {String} url - 対象のURL.
  * @return {Promise} return promise object.
  *             If be ran resolve function, return value is following.
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
    debug('checkExcludeList');

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
    return ((tempRelease.indexOf(url) !== -1) ?
              TEMP_EXCLUDE : NORMAL) | keybind;
  }//}}}

  /**
   * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
   * @param {Tab} tab 対象のタブ.
   * @param {Promise} promiseが返る。
   */
  function reloadBrowserIcon(tab)//{{{
  {
    debug('reloadBrowserIcon');

    var deferred = Promise.defer();

    var changeIcon = disableTimer ? DISABLE_TIMER : checkExcludeList(tab.url);
    chrome.browserAction.setIcon(
      { path: icons[changeIcon], tabId: tab.id }, function() {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
          deferred.reject();
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
          error('Invalid state. ' + changeIcon);
          deferred.reject();
          return;
        }

        if (changeIcon & KEYBIND_EXCLUDE) {
          title += "\nAnd also included in the exclude list of key bindings.";
        }

        chrome.browserAction.setTitle({ tabId: tab.id, title: title });
        deferred.resolve();
      }
    );

    return deferred.promise;
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
    debug('getParameterByName', url, name);

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
    debug('getPurgeURL', url);

    var deferred = Promise.defer();
    setTimeout(function() {
      var page = blankUrl;
      var args = '&url=' + encodeURIComponent(url);
      deferred.resolve(encodeURI(page) + '?' + encodeURIComponent(args));
    }, 0);
    return deferred.promise;
  }//}}}

  /**
  * タブの解放を行います。
  * @param {Number} tabId タブのID.
  * @param {Promise} promiseが返る。
  */
  function purge(tabId)//{{{
  {
    debug('purge');

    var deferred = Promise.defer();
    setTimeout(function() {
      if (toType(tabId) !== 'number') {
        error("tabId is not number.");
        deferred.reject();
        return;
      }

      if (unloaded.hasOwnProperty(tabId)) {
        log('Already purging. "' + tabId + '"');
        deferred.reject();
        return;
      }

      var p = [];
      p.push(
        new Promise(function(resolve, reject) {
          chrome.tabs.get(tabId, function(tab) {
            if (chrome.runtime.lastError) {
              error(chrome.runtime.lastError.message);
              reject();
              return;
            }
            resolve(tab);
          });
        })
      );
      p.push(
        new Promise(function(resolve, reject) {
          chrome.tabs.executeScript(
            tabId, { file: getScrollPosScript }, function(scrollPosition) {
              if (chrome.runtime.lastError) {
                error(chrome.runtime.lastError.message);
                reject();
                return;
              }
              resolve(scrollPosition);
            }
          );
        })
      );
      Promise.all(p)
      .then(function(results) {
        return new Promise(function(resolve, reject) {
          var tab = results[0];
          var scrollPosition = results[1];

          if (tab.status !== 'complete') {
            error("The target tab has not been completed loading yet.", tab);
            reject();
            return;
          }

          var state = checkExcludeList(tab.url);
          if (state & EXTENSION_EXCLUDE) {
            warn('The tabId have been included the exclusion list' +
                 ' of extension.', tabId);
            reject();
            return;
          } else if (state & INVALID_EXCLUDE) {
            error("Don't get the url of the tab.", tabId);
            reject();
            return;
          }

          var p2 = [];
          p2.push( getPurgeURL(tab.url) );
          p2.push( writeHistory(tab) );
          p2.push(
            new Promise(function(resolve2) {
              chrome.tabs.sendMessage(tabId, { event: 'form_cache' }, resolve2);
            })
          );
          Promise.all(p2)
          .then(function(results2) {
            return new Promise(function(resolve2, reject2) {
              var url = results2[0];

              chrome.tabs.executeScript(tabId, {
                code: 'window.location.replace("' + url + '");' }, function() {
                  if (chrome.runtime.lastError) {
                    error(chrome.runtime.lastError.message);
                    reject2();
                    return;
                  }
                  resolve2();
                }
              );
            });
          })
          .then(function() {
            unloaded[tabId] = {
              url            : tab.url,
              scrollPosition : scrollPosition[0] || { x : 0 , y : 0 },
            };

            return deleteAllPurgedTabUrlFromHistory();
          })
          .then(resolve)
          .catch(reject);
        });
      })
      .then(deferred.resolve)
      .catch(deferred.reject);
    }, 0);
    return deferred.promise;
  }//}}}

  /**
  * 解放したタブを復元します。
  * @param {Number} tabId 復元するタブのID.
  * @return {Promise} promiseが返る。
  */
  function unPurge(tabId)//{{{
  {
    debug('unPurge', tabId);

    var deferred = Promise.defer();
    setTimeout(function() {
      if (toType(tabId) !== 'number') {
        error("tabId is not number.");
        deferred.reject();
        return;
      }

      var url = unloaded[tabId].url;
      chrome.tabs.sendMessage(tabId,
        { event: 'location_replace' }, function(useChrome) {
          // If the url is empty in purge page.
          if (useChrome) {
            chrome.tabs.update(tabId, { url: url }, deferred.resolve);
          } else {
            deferred.resolve();
          }
        }
      );
    }, 0);
    return deferred.promise;
  }//}}}

  /**
  * 解放状態・解放解除を交互に行う
  * @param {Number} tabId 対象のタブのID.
  * @return {Promise} promiseが返る。
  */
  function purgeToggle(tabId)//{{{
  {
    debug('purgeToggle');
    var deferred = Promise.defer();
    setTimeout(function() {
      if (toType(tabId) !== 'number') {
        error("tabId is not number.");
        deferred.reject();
        return;
      }

      if (unloaded.hasOwnProperty(tabId)) {
        unPurge(tabId)
        .then(deferred.resolve, deferred.reject);
      } else {
        purge(tabId)
        .then(deferred.resolve, deferred.reject);
      }
    }, 0);
    return deferred.promise;
  }//}}}

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} tabId 処理を行うタブのID.
  * @return {Promise} Promiseが返る。
  */
  function tick(tabId)//{{{
  {
    debug('tick');

    var deferred = Promise.defer();
    setTimeout(function() {
      if (toType(tabId) !== 'number' || unloaded.hasOwnProperty(tabId)) {
        error("tabId isn't number or added to unloaded already. " + tabId);
        deferred.reject();
        return;
      }

      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) {
          log('tick function is skipped.', tabId);
          deferred.reject();
          return;
        }

        // アクティブタブへの処理の場合、行わない
        if (tab.active) {
          // アクティブにしたタブのアンロード時間更新
          setTick(tabId)
          .then(deferred.resolve, deferred.reject);
        } else {
          purge(tabId)
          .then(deferred.resolve, deferred.reject);
        }
      });
    }, 0);
    return deferred.promise;
  }//}}}

  /**
  * 定期的な処理を停止
  * @param {Number} tabId 停止するタブのID.
  */
  function deleteTick(tabId)//{{{
  {
    debug('deleteTick');

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
    debug('setTick');

    var deferred = Promise.defer();
    setTimeout(function() {
      if (!myOptions) {
        error('myOptions is not loaded yet.');
        deferred.reject();
        return;
      }

      if (disableTimer) {
        deferred.resolve();
        return;
      }

      if (toType(tabId) !== 'number') {
        error("tabId is not number.");
        deferred.reject();
        return;
      }

      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) {
          log('setTick function is skipped.');
          deferred.resolve();
          return;
        }

        // 全ての除外アドレス一覧と比較
        var state = checkExcludeList(tab.url);
        if (state & NORMAL) { // 除外アドレスに含まれていない場合
          // 分(設定) * 秒数 * ミリ秒
          var timer = parseInt(myOptions.timer, 10) * 60 * 1000;

          // Update.
          ticked.delete(tabId);
          ticked.set(tabId, setInterval(function() { tick(tabId); } , timer));
        } else { // include exclude list
          deleteTick(tabId);
        }

        deferred.resolve();
      });
    }, 0);
    
    return deferred.promise;
  }//}}}

  /**
  * 指定した辞書型の再帰処理し、タブを復元する。
  * 引数は第一引数のみを指定。
  *
  * @param {Array} sessions You want to restore the array of sessions.
  * @return {Promise} promiseが返る。
  */
  function restore(sessions)//{{{
  {
   debug('restore', sessions);

   var deferred = Promise.defer();
   setTimeout(function() {
     var p = [];

     sessions.forEach(function(v) {
       p.push(
         new Promise(function(resolve, reject) {
           getPurgeURL(v.url)
           .then(function(purgeurl) {
             return new Promise(function(resolve2, reject2) {
               chrome.tabs.create(
                 { url: purgeurl, active: false }, function(tab) {
                   if (chrome.runtime.lastError) {
                     error(chrome.runtime.lastError.message);
                     reject2(chrome.runtime.lastError);
                     return;
                   }

                   var unloadedObj = {};
                   unloadedObj[tab.id] = {
                     url            : v.url,
                     scrollPosition : { x : 0 , y : 0 },
                   };
                   resolve2(unloadedObj);
                 }
               );
             });
           })
           .then(resolve)
           .catch(reject);
         })
       );
     });
     Promise.all(p).then(function(results) {
       results.forEach(function(v) {
         var tabId;
         for (var key in v) {
           if (!v.hasOwnProperty(key)) {
             continue;
           }

           tabId = parseInt(key, 10);
           if (!unloaded.hasOwnProperty(tabId)) {
             unloaded[tabId] = v[key];
           }
         }
       });
       deferred.resolve();
     })
     .catch(function(e) {
       e ? error(e) : function() {};
       deferred.reject();
     });
   }, 0);

   return deferred.promise;
  }//}}}

  function switchTempRelease(url)//{{{
  {
    debug('switchTempRelease', url);

    var index = tempRelease.indexOf(url);
    if (index === -1) {
      // push url in tempRelease.
      tempRelease.push(url);
    } else {
      // remove url in tempRelease.
      tempRelease.splice(index, 1);
    }
  }//}}}

  /**
  * 非解放・非解放解除を交互に行う
  * @param {Tab} tab 対象のタブオブジェクト.
  */
  function tempReleaseToggle(tab)//{{{
  {
    debug('tempReleaseToggle');

    switchTempRelease(tab.url);
    setTick(tab.id);
    reloadBrowserIcon(tab);
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
    debug('searchUnloadedTabNearPosition');

    var deferred = Promise.defer();

    // 現在のタブの左右の未解放のタブを選択する
    chrome.windows.get(tab.windowId, { populate: true }, function(win) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        deferred.reject();
        return;
      }

      var tabs = win.tabs.filter(function(v) {
        return !unloaded.hasOwnProperty(v.id) && !isReleasePage(v.url);
      });
      var t = tabs.filter(function(v) {
        return v.index >= tab.index;
      });

      var tLength = 0;
      if (t.length === 0) {
        t = tabs.filter(function(v) {
          return v.index < tab.index;
        });
        tLength = t.length - 1;
      }

      if (t.length > 0) {
        // If found tab, It's active.
        chrome.tabs.update(t[tLength].id, { active: true }, deferred.resolve);
      } else {
        // If can not find the tab to activate to create a new tab.
        chrome.tabs.create({ active: true }, deferred.resolve);
      }
    });

    return deferred.promise;
  }//}}}

  /**
   * 拡張機能がインストールされたときの処理
   */
  function onInstall()//{{{
  {
    debug('Extension Installed.');

    return new Promise(function(resolve) {
      // インストール時にオプションページを表示
      chrome.tabs.create({ url: optionPage }, resolve);
    });
  }//}}}

  /**
   * 拡張機能がアップデートされたときの処理
   */
  function onUpdate()//{{{
  {
    debug('Extension Updated.');

    return new Promise(function(resolve, reject) {
      (function() {
        return new Promise(function(resolve2) {
          // the changed history of the option menu.
          displayPageOfOption = "updated";
          chrome.tabs.create({ url: optionPage }, resolve2);
        });
      })()
      .then(getInitAndLoadOptions)
      .then(function(options) {
        return new Promise(function(resolve2, reject2) {
          // restore process.
          if (options.when_updated_restore_session) {
            loadSession(db, dbSessionName)
            .then(function(sessions) {
              return new Promise(function(resolve3, reject3) {
                if (sessions.length === 0) {
                  resolve3();
                  return;
                }

                var previousSessionTime = options[previousSessionTimeKey];
                if (previousSessionTime) {
                  var restoreSession = sessions.filter(function(v) {
                    return previousSessionTime === v.date;
                  });

                  if (restoreSession.length > 0) {
                    if (restoreSession.length > 1) {
                     warn('the length of restoreSession is greater than 1.');
                    }

                    restore(restoreSession[0].data)
                    .then(resolve3)
                    .catch(reject3);
                  } else {
                    resolve3();
                  }
                } else {
                  resolve3();
                }
              });
            })
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
    debug('getVersion');
    var details = chrome.app.getDetails();
    return details.version;
  }//}}}

  function versionCheckAndUpdate()//{{{
  {
    debug('versionCheckUpdate');

    function updateVersion(currVersion)
    {
      return new Promise(function(resolve) {
        var write = {};
        write[versionKey] = currVersion;
        chrome.storage.local.set(write, resolve);
      });
    }

    var deferred = Promise.defer();
    var currVersion = getVersion();
    chrome.storage.local.get(versionKey, function(storages) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        deferred.reject();
        return;
      }

      // ver chrome.storage.
      var prevVersion = storages[versionKey];
      if (currVersion !== prevVersion) {
        // この拡張機能でインストールしたかどうか
        if (prevVersion === void 0) {
          updateVersion(currVersion)
          .then(onInstall)
          .then(deferred.resolve)
          .catch(deferred.reject);
        } else {
          updateVersion(currVersion)
          .then(onUpdate)
          .then(deferred.resolve)
          .catch(deferred.reject);
        }
      } else {
        deferred.resolve();
      }
    });
    return deferred.promise;
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
    debug('getInitAndLoadOptions');

    var deferred = Promise.defer();
    chrome.storage.local.get(null, function(items) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        deferred.reject();
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

      chrome.storage.local.remove(removeKeys, function() {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
          deferred.reject();
          return;
        }

        // My options are initialized.
        var options = items;
        for (key in defaultValues) {
          if (defaultValues.hasOwnProperty(key) &&
              !options.hasOwnProperty(key)) {
            options[key] = defaultValues[key];
          }
        }

        deferred.resolve(options);
      });
    });
    return deferred.promise;
  }//}}}

  function initializeUseOptions(options)//{{{
  {
    debug('initializeUseOptions');

    var deferred = Promise.defer();
    setTimeout(function() {
      myOptions = options;

      // initialize badge.
      chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF' });

      deferred.resolve();
    }, 0);
    return deferred.promise;
  }//}}}

  function initializeAlreadyPurgedTabs()//{{{
  {
    debug('initializeAlreadyPurgedTabs');

    var deferred = Promise.defer();
    setTimeout(function() {
      chrome.tabs.query({}, function(tabs) {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
          deferred.reject();
          return;
        }

        function toAdd(current)
        {
          if (isReleasePage(current.url)) {
            unloaded[current.id] = {
              url            : getParameterByName(current.url, 'url'),
              scrollPosition : { x: 0 , y: 0 },
            };
          }
          setTick(current.id);
        }

        // If already purging tab, be adding the object of purging tab.
        var p = [];
        tabs.forEach(function(v) {
          p.push(
            new Promise(function(resolve) {
              var result = checkExcludeList(v.url);
              if (result ^ (NORMAL & INVALID_EXCLUDE)) {
                toAdd(v);
              }
              resolve();
            })
          );
        });

        Promise.all(p)
        .then(deferred.resolve)
        .catch(deferred.reject);
      });
    }, 0);
    return deferred.promise;
  }//}}}

  function initializeDatabase()//{{{
  {
    function dbOpen()
    {
      db = new Database(dbName, dbVersion);
      return db.open(dbCreateStores);
    }

    return new Promise(function(resolve, reject) {
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
    debug('initialize');

    initializeDatabase()
    .then(versionCheckAndUpdate)
    .then(getInitAndLoadOptions)
    .then(initializeUseOptions)
    .then(initializeAlreadyPurgedTabs)
    .then(deleteOldDatabase)
    .then(function() {
      return initializeIntervalProcess(myOptions.interval_timing || 5);
    })
    .catch(function(e) {
      error(e || 'initialize error.');
    });
  }//}}}

  function switchDisableTimerState()//{{{
  {
    debug('switchDisableTimerState');

    return new Promise(function(resolve, reject) {
      function lastProcess()
      {
        disableTimer = disableTimer ? false : true;
        getCurrentTab()
        .then(reloadBrowserIcon)
        .then(resolve, reject);
      }

      if (disableTimer) {
        chrome.tabs.query({}, function(tabs) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            reject();
            return;
          }

          tabs.forEach(function(v) {
            var result = checkExcludeList(v.url);
            if (result & NORMAL && !isReleasePage(v.url)) {
              setTick(v.id);
            }
          });
          lastProcess();
        });
      } else {
        for (var key in ticked) {
          clearInterval(ticked.get(key));
        }
        ticked.clear();
        lastProcess();
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
    debug('onActivatedFunc', tabId);
    var deferred = Promise.defer();
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        deferred.reject();
        return;
      }

      // アイコンの状態を変更
      reloadBrowserIcon(tab);

      // 前にアクティブにされていたタブのアンロード時間を更新
      if (oldActiveIds[tab.windowId]) {
        setTick(oldActiveIds[tab.windowId]);
      }
      oldActiveIds[tab.windowId] = tabId;

      deferred.resolve();
    });
    return deferred.promise;
  }//}}}

  chrome.tabs.onActivated.addListener(function(activeInfo) {//{{{
    debug('chrome.tabs.onActivated.', activeInfo);
    if (unloaded.hasOwnProperty(activeInfo.tabId) &&
        myOptions &&
        !myOptions.no_release) {
      unPurge(activeInfo.tabId).then(function() {
        return onActivatedFunc(activeInfo.tabId);
      });
    } else {
      onActivatedFunc(activeInfo.tabId);
    }
  });//}}}

  chrome.tabs.onCreated.addListener(function(tab) {//{{{
    debug('chrome.tabs.onCreated.', tab);
    setTick(tab.id);
  });//}}}

  chrome.tabs.onRemoved.addListener(function(tabId) {//{{{
    debug('chrome.tabs.onRemoved.', tabId);
    delete unloaded[tabId];
  });//}}}

  chrome.tabs.onAttached.addListener(function(tabId) {//{{{
    debug('chrome.tabs.onAttached.', tabId);
    setTick(tabId);
  });//}}}

  chrome.tabs.onDetached.addListener(function(tabId) {//{{{
    debug('chrome.tabs.onDetached.', tabId);
    delete unloaded[tabId];
  });//}}}

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {//{{{
    if (changeInfo.status === 'loading') {
      debug('chrome.tabs.onUpdated. loading.', tabId, changeInfo, tab);

      if (!isReleasePage(tab.url) && unloaded.hasOwnProperty(tabId)) {
        delete unloaded[tabId];
      }
    } else {
      debug('chrome.tabs.onUpdated. complete.', tabId, changeInfo, tab);

      loadScrollPosition(tabId)
      .then(function() {
        return reloadBrowserIcon(tab);
      });
    }
  });//}}}

  chrome.windows.onRemoved.addListener(function(windowId) {//{{{
    debug('chrome.windows.onRemoved.', windowId);
    delete oldActiveIds[windowId];
  });//}}}

  chrome.runtime.onMessage.addListener(//{{{
    function(message, sender, sendResponse) {
      debug('chrome.runtime.onMessage.', message, sender);
      switch (message.event) {
        case 'initialize':
          initialize();
          break;
        case 'release':
          getCurrentTab()
          .then(function(tab) {
            return new Promise(function(resolve, reject) {
              purgeToggle(tab.id).then(function() {
                return searchUnloadedTabNearPosition(tab);
              }, reject)
              .then(resolve, reject);
            });
          });
          break;
        case 'switch_not_release':
          getCurrentTab()
          .then(function(tab) {
            return new Promise(function(resolve) {
              tempReleaseToggle(tab);
              resolve();
            });
          });
          break;
        case 'all_purge':
        case 'all_purge_without_exclude_list':
          chrome.tabs.query({}, function(results) {
            if (chrome.runtime.lastError) {
              error(chrome.runtime.lastError.message);
              return;
            }

            var t = results.filter(function(v) {
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
            results.forEach(function(v) {
              p.push(purge(v.id));
            });
            Promise.all(p).then(function() {
              return new Promise(function(resolve, reject) {
                getCurrentTab()
                .then(searchUnloadedTabNearPosition)
                .then(resolve, reject);
              });
            });
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
        case 'option':
          // オプションページを開く
          chrome.tabs.create({ url: optionPage });
          break;
        case 'add_to_temp_exclude_list':
          getCurrentTab()
          .then(function(tab) {
            return new Promise(function(resolve, reject) {
              var index = tempRelease.indexOf(tab.url);
              if (index === -1) {
                tempRelease.push(tab.url);
                setTick(tab.id).then(function() {
                  return reloadBrowserIcon(tab);
                }, reject)
                .then(resolve, reject);
              } else {
                resolve();
              }
            });
          });
          break;
        case 'load_options_and_reload_current_tab':
          getCurrentTab()
          .then(function(tab) {
            return new Promise(function(resolve, reject) {
              getInitAndLoadOptions()
              .then(function(options) {
                myOptions = options;

                setTick(tab.id)
                .then(function() {
                  return reloadBrowserIcon(tab);
                }, reject)
                .then(resolve, reject);
              });
            });
          });
          break;
        case 'restore':
          restore(message.session)
          .then(function() {
            return new Promise(function(resolve) {
              log('restore is completed.');
              resolve();
            });
          });
          break;
        case 'current_icon':
          sendResponse(currentIcon);
          break;
        case 'current_session':
          sendResponse(currentSessionTime);
          break;
        case 'display_option_page':
          sendResponse(displayPageOfOption);
          displayPageOfOption = null;
          break;
        case 'keybind_check_exclude_list':
          var state = checkExcludeList(message.location.href);
          sendResponse(state ^
            (EXTENSION_EXCLUDE | KEYBIND_EXCLUDE | INVALID_EXCLUDE));
          break;
        case 'switchTimerState':
          switchDisableTimerState()
          .catch(function(e) {
            error(e);
          });
          break;
        case 'excludeDialogMenu':
          getCurrentTab()
          .then(function(tab) {
            return new Promise(function(resolve) {
              chrome.tabs.sendMessage(
                tab.id, { event: 'showExcludeDialog' }, resolve);
            });
          })
          .catch(function(e) {
            error(e);
          });
          break;
      }
    }
  );//}}}

  initialize();
})();
