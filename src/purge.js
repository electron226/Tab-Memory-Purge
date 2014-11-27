(function() {
  "use strict";

  var myOptions = null; // my option settings.

  /**
   * set setInterval return value.
   * key = tabId
   * value = return setInterval value.
   */
  var ticked = {};

  /**
   * タブの解放を解除したタブのスクロール量(x, y)を一時的に保存する連想配列
   * key = tabId
   * value = スクロール量(x, y)を表す連想配列
   */
  var tempScrollPositions = {};

  // the string that represents the temporary exclusion list
  var tempRelease = [];

  var oldActiveIds = {}; // アクティブなタブを選択する前に選択していたタブのID
  // the session of released tabs.
  var tabSession = new TabSession(sessionKey, currentSessionKey);
  var tabHistory = new TabHistory(historyKey); // the history of released tabs.

  var currentIcon = null;
  var displayPageOfOption = null;
  var disableTimer = false;

  /**
   * メモリ解放を行ったタブの情報が入ってる辞書型
   *
   * key = tabId
   * value = 下記のプロパティがあるオブジェクト
   *         title: タイトル
   *         iconURI: アイコンのdateURI
   *         url: 解放前のURL
   *         purgeurl: 休止ページのURL
   *         scrollPosition: スクロール量(x, y)を表すオブジェクト
   */
  var unloaded = {};
  var unloadedCount = 0;
  Object.observe(unloaded, function(changes) {
    debug('unloaded was changed.', changes);

    var tabId;
    changes.forEach(function(v) {
      tabId = parseInt(v.name, 10);
      switch (v.type) {
        case 'add':
          unloadedCount++;
          break;
        case 'delete':
          unloadedCount--;
          tempScrollPositions[tabId] = v.oldValue.scrollPosition;
          break;
      }

      // If the tab of tabId isn't existed, these process are skipped.
      deleteTick(tabId);
      setTick(tabId);
    });
    chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });
    tabSession.update(unloaded);
  });

  function PromiseCatchFunction(mes)
  {
    error(mes);
  }

  function isReleasePage(url)
  {
    debug('isReleasePage', url);

    for (var i in blankUrls) {
      if (blankUrls.hasOwnProperty(i) && url.indexOf(blankUrls[i]) === 0) {
        return true;
      }
    }
    if (myOptions.relase_page === 'assignment' &&
        url.indexOf(myOptions.release_url) === 0) {
      return true;
    }
    return false;
  }

  /**
  * 指定した除外リストの正規表現に指定したアドレスがマッチするか調べる
  * @param {String} url マッチするか調べるアドレス.
  * @param {Object} excludeOptions 除外リストの設定を表すオブジェクト.
  *                        list    除外リストの値。複数のものは\nで区切る.
  *                        options 正規表現のオプション.
  *                        returnValue 一致したときに返す返り値
  * @return {Number} 引数にはnullかreturnValueの値が入る
  */
  function checkMatchUrlString(url, excludeOptions)
  {
    debug('checkMatchUrlString');

    var excludeArray = excludeOptions.list.split('\n');
    for (var i = 0, len = excludeArray.length; i < len; i++) {
      if (excludeArray[i] !== '') {
        var re = new RegExp(excludeArray[i], excludeOptions.options);
        if (re.test(url)) {
          return excludeOptions.returnValue;
        }
      }
    }
    return null;
  }

  function getTargetExcludeList(target)
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
        return {
          list: myOptions.keybind_exclude_url,
          options: myOptions.keybind_regex_insensitive ? 'i' : '',
          returnValue: KEYBIND_EXCLUDE,
        };
      default:
        return {
          list: myOptions.exclude_url,
          options: myOptions.regex_insensitive ? 'i' : '',
          returnValue: USE_EXCLUDE,
        };
    }
    error('getTargetExcludeList was error.', target);
    return null;
  }

  /**
  * 与えられたURLが全ての除外リストに一致するか検索する。
  * @param {String} url 対象のURL.
  * @param {Number} どのリストと一致したの数値が入る。
  *                   EXTENSION_EXCLUDE = 拡張機能内の除外リストと一致
  *                   USE_EXCLUDE    = ユーザー指定の除外アドレスと一致
  *                   TEMP_EXCLUDE   = 一時的な非解放リストと一致
  *                   NORMAL_EXCLUDE = 一致しなかった。
  */
 function checkExcludeList(url)
  {
    debug('checkExcludeList');

    // Check the keybind exclude list.
    var keybind = checkMatchUrlString(
      url, getTargetExcludeList('keybind')) || 0;

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
                  TEMP_EXCLUDE : NORMAL_EXCLUDE) | keybind;
  }

  /**
   * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
   * @param {Tab} tab 対象のタブ.
   * @param {Promise} promiseが返る。
   */
  function reloadBrowserIcon(tab)
  {
    debug('reloadBrowserIcon');

    var deferred = Promise.defer();

    var changeIcon = disableTimer ? DISABLE_TIMER : checkExcludeList(tab.url);
    chrome.browserAction.setIcon(
      { path: icons[changeIcon], tabId: tab.id }, function() {
        if (chrome.runtime.lastError) {
          deferred.reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        currentIcon = changeIcon;

        var ALL_VALUES_EXCEPT_KEYBIND =
          DISABLE_TIMER |
          NORMAL_EXCLUDE | USE_EXCLUDE | TEMP_EXCLUDE | EXTENSION_EXCLUDE;
        var title = 'Tab Memory Purge\n';
        switch (changeIcon & ALL_VALUES_EXCEPT_KEYBIND) {
          case DISABLE_TIMER:
            title += "The purging timer of the all tabs has stopped.";
            break;
          case NORMAL_EXCLUDE:
            title += "The url of this tab isn't include exclude list.";
            break;
          case USE_EXCLUDE:
            title += "The url of this tab is included your exclude list.";
            break;
          case TEMP_EXCLUDE:
            title += "The url of this tab is included" +
                    " your temporary exclude list.";
            break;
          case EXTENSION_EXCLUDE:
            title += "The url of this tab is included" +
                    " exclude list of in this extension.";
            break;
          default:
            deferred.reject(new Error('Invalid state. ' + changeIcon));
            break;
        }
        if (changeIcon & KEYBIND_EXCLUDE) {
          title += "\nAnd also included in the exclude list of key bindings.";
        }

        chrome.browserAction.setTitle({ tabId: tab.id, title: title });
        deferred.resolve();
      }
    );

    return deferred.promise;
  }

  /**
   * getParameterByName
   *
   * @param url the url of getting parameters.
   * @param name the target parameter name.
   * @return {null or string} null or the string of a parameter.
   */
  function getParameterByName(url, name) {
    debug('getParameterByName', url, name);

    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(decodeURIComponent(url));
    return results === null ?
      "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function getPurgeURL(tab) {
    debug('getPurgeURL', tab);
    function getURL(tab, iconDataURI)
    {
      debug('getURL', tab, iconDataURI);

      var deferred = Promise.defer();

      setTimeout(function() {
        var args = '' ;

        args += tab.title ?
        '&title=' + encodeURIComponent(tab.title) : '';
        if (iconDataURI) {
          args += '&favicon=' + encodeURIComponent(iconDataURI);
        } else {
          args += tab.favIconUrl ?
            '&favicon=' + encodeURIComponent(tab.favIconUrl) : '';
        }

        // 解放に使うページを設定
        var page = null;
        switch (myOptions.release_page) {
          default:
            deferred.reject(new Error(
              "'release page' setting error. so to set default value."));
            /* falls through */
          case 'author': // 作者サイト
            page = blankUrls.normal;
            break;
          case 'normal': // 拡張機能内
            page = blankUrls.local;
            break;
          case 'assignment': // 指定URL
            page = myOptions.release_url;
            break;
        }

        if (tab.url) {
          args += '&url=' + encodeURIComponent(tab.url);
        }

        deferred.resolve(encodeURI(page) + '?' + encodeURIComponent(args));
      }, 0);

      return deferred.promise;
    }

    var deferred = Promise.defer();
    setTimeout(function() {
      if (!(angular.isObject(tab))) {
        deferred.reject(new Error('getPurgeURL is invalid arguments.'));
        return;
      }

      if (tab.favIconUrl) {
        getDataURI(tab.favIconUrl).then(function(iconDataURI) {
          getURL(tab, iconDataURI).then(function(url) {
            deferred.resolve({ url: url, iconDataURI: iconDataURI });
          });
        });
      } else {
        getURL(tab, null).then(function(url) {
          deferred.resolve(url);
        });
      }
    }, 0);

    return deferred.promise;
  }

  /**
  * タブの解放を行います。
  * @param {Number} tabId タブのID.
  * @param {Promise} promiseが返る。
  */
  function purge(tabId)
  {
    debug('purge');

    var deferred = Promise.defer();
    setTimeout(function() {
      if (!angular.isNumber(tabId)) {
        deferred.reject(new Error("tabId is not number."));
        return;
      }

      if (unloaded.hasOwnProperty(tabId)) {
        deferred.reject(new Error('Already purging. "' + tabId + '"'));
        return;
      }

      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) {
          deferred.reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        var state = checkExcludeList(tab.url);
        if (state & EXTENSION_EXCLUDE) {
          deferred.reject(new Error(
            'The tabId have been included exclude list of extension. ' + tabId
          ));
          return;
        }

        // objScroll = タブのスクロール量(x, y)
        chrome.tabs.executeScript(
          tabId, { file: getScrollPosScript }, function(objScroll) {
            if (chrome.runtime.lastError) {
              deferred.reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            getPurgeURL(tab).then(function(returnObject) {
              var url = returnObject.url;
              var iconURI = returnObject.iconDataURI;

              function afterPurge(updated) {
                if (chrome.runtime.lastError) {
                  deferred.reject(new Error(chrome.runtime.lastError.message));
                  return;
                }

                unloaded[updated.id] = {
                  title: tab.title,
                  iconDataURI: iconURI || icons[NORMAL_EXCLUDE],
                  url: tab.url,
                  purgeurl: url,
                  scrollPosition: objScroll[0] || { x: 0 , y: 0 }
                };

                // the histories are writing.
                tabHistory.write(tab).then(deferred.resolve);
              }

              if (myOptions.release_page === 'assignment') {
                chrome.tabs.update(tabId, { url: url }, function(updated) {
                  afterPurge(updated);
                });
              } else {
                chrome.tabs.executeScript(tabId, {
                  code: 'window.location.replace("' + url + '");' },
                function() {
                  chrome.tabs.get(tabId, function(updated) {
                    afterPurge(updated);
                  });
                });
              }
            }).catch(PromiseCatchFunction);
          });
        });
    }, 0);
    return deferred.promise;
  }

  /**
  * 解放したタブを復元します。
  * @param {Number} tabId 復元するタブのID.
  * @return {Promise} promiseが返る。
  */
  function unPurge(tabId)
  {
    debug('unPurge', tabId);
    var deferred = Promise.defer();
    setTimeout(function() {
      if (!angular.isNumber(tabId)) {
        deferred.reject(new Error("tabId is not number."));
        return;
      }

      var url = unloaded[tabId].url;
      if (myOptions.release_page === 'normal') {
        // when release page is in the extension.
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
      } else {
        chrome.tabs.executeScript(
          tabId,
          { code: 'window.location.replace("' + url + '");' },
          deferred.resolve);
      }
    }, 0);
    return deferred.promise;
  }

  /**
  * 解放状態・解放解除を交互に行う
  * @param {Number} tabId 対象のタブのID.
  * @return {Promise} promiseが返る。
  */
   function purgeToggle(tabId)
  {
    debug('purgeToggle');
    var deferred = Promise.defer();
    setTimeout(function() {
      if (!angular.isNumber(tabId)) {
        deferred.reject(new Error("tabId is not number."));
        return;
      }

      if (unloaded.hasOwnProperty(tabId)) {
        unPurge(tabId).then(deferred.resolve, deferred.reject);
      } else {
        purge(tabId).then(deferred.resolve, deferred.reject);
      }
    }, 0);
    return deferred.promise;
  }

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} tabId 処理を行うタブのID.
  * @return {Promise} Promiseが返る。
  */
  function tick(tabId)
  {
    debug('tick');
    var deferred = Promise.defer();
    setTimeout(function() {
      if (!angular.isNumber(tabId) || unloaded.hasOwnProperty(tabId)) {
        deferred.reject(new Error(
          "tabId isn't number or added to unloaded already. " + tabId));
        return;
      }

      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) {
          log('tick function is skipped.', tabId);
          deferred.reject(new Error('tick function is skipped. ' + tabId));
          return;
        }

        // アクティブタブへの処理の場合、行わない
        if (tab.active) {
          // アクティブにしたタブのアンロード時間更新
          setTick(tabId).then(deferred.resolve);
        } else {
          purge(tabId).then(deferred.resolve);
        }
      });
    }, 0);
    return deferred.promise;
  }

  /**
  * 定期的な処理を停止
  * @param {Number} tabId 停止するタブのID.
  */
  function deleteTick(tabId)
  {
    debug('deleteTick');
    if (ticked.hasOwnProperty(tabId)) {
      clearInterval(ticked[tabId]);
      delete ticked[tabId];
    }
  }

  /**
  * 定期的に解放処理の判断が行われるよう設定します。
  * 既に設定済みなら時間を延長します。
  * @param {Number} tabId 設定するタブのID.
  * @return {Promise} Promiseが返る。
  */
  function setTick(tabId)
  {
    debug('setTick');
    var deferred = Promise.defer();

    setTimeout(function() {
      if (disableTimer) {
        deferred.resolve();
        return;
      }

      if (!angular.isNumber(tabId)) {
        deferred.reject(new Error("tabId is not number."));
        return;
      }

      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) {
          deferred.reject(new Error('setTick function is skipped.'));
          return;
        }

        // 全ての除外アドレス一覧と比較
        var state = checkExcludeList(tab.url);
        if (state & NORMAL_EXCLUDE) { // 除外アドレスに含まれていない場合
          // 分(設定) * 秒数 * ミリ秒
          var timer = parseInt(myOptions.timer, 10) * 60 * 1000;

          // Update.
          deleteTick(tabId);
          ticked[tabId] = setInterval(function() { tick(tabId); } , timer);
        } else { // include exclude list
          deleteTick(tabId);
        }

        deferred.resolve();
      });
    }, 0);
    
    return deferred.promise;
  }

  /**
  * 指定した辞書型の再帰処理し、タブを復元する。
  * 引数は第一引数のみを指定。
  *
  * @param {Object} object オブジェクト型。これのみを指定する.
  *                        基本的にオブジェクト型unloaded変数のバックアップを渡す.
  * @param {Array} keys オブジェクト型のキー名の配列.省略可能.
  * @param {Number} index keysの再帰処理開始位置.デフォルトは0、省略可能.
  * @param {Number} end keysの最後の要素から一つ後の位置.
  *                     デフォルトはkeys.length、省略可能.
  * @return {Promise} promiseが返る。
  */
 function restore(object, keys, index, end)
 {
   debug('restore');

   var deferred = Promise.defer();
   setTimeout(function restore_inner(object, keys, index, end) {
     // 最後まで処理を行ったらunloadedに上書き
     if (index >= end) {
       for (var k in object) {
         if (object.hasOwnProperty(k) && !unloaded.hasOwnProperty(k)) {
           unloaded[k] = object[k];
         }
       }
       deferred.resolve(true);
       return;
     }

     // 初期値
     if (toType(keys) !== 'array') {
       keys = [];
       for (var key in object) {
         if (object.hasOwnProperty(key)) {
           keys.push(key);
         }
       }
       index = 0;
       end = keys.length;
     }

     var tabId = parseInt(keys[index], 10);
     chrome.tabs.get(tabId, function(tab) {
       // If occur a error and tab is undefined, it is ignore.
       if (chrome.runtime.lastError || angular.isUndefined(tab)) {
         if (!angular.isUndefined(tab) && isReleasePage(tab.url)) {
           restore_inner(object, keys, ++index, end);
           return;
         }

         // タブが存在しない場合、新規作成
         var purgeurl = object[tabId].purgeurl;
         chrome.tabs.create({ url: purgeurl, active: false }, function(tab) {
           if (chrome.runtime.lastError) {
             error(chrome.runtime.lastError.message);
           } else {
             var temp = object[tabId];
             delete object[tabId];
             object[tab.id] = temp;
           }

           restore_inner(object, keys, ++index, end);
         });
       } else {
         restore_inner(object, keys, ++index, end);
       }
     });
   }(object, keys, index, end), 0);
   return deferred.promise;
  }

  function switchTempRelease(url)
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
  }

  /**
  * 非解放・非解放解除を交互に行う
  * @param {Tab} tab 対象のタブオブジェクト.
  */
  function tempReleaseToggle(tab)
  {
    debug('tempReleaseToggle');

    switchTempRelease(tab.url);
    setTick(tab.id);
    reloadBrowserIcon(tab).catch(PromiseCatchFunction);
  }

  /**
  * 指定されたタブに最も近い未解放のタブをアクティブにする。
  * 右側から探索され、見つからなかったら左側を探索する。
  * 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
  * @param {Tab} tab 基準点となるタブ.
  * @return {Promise} promiseが返る。
  */
 function searchUnloadedTabNearPosition(tab)
  {
    debug('searchUnloadedTabNearPosition');

    var deferred = Promise.defer();

    // 現在のタブの左右の未解放のタブを選択する
    chrome.windows.get(tab.windowId, { populate: true }, function(win) {
      if (chrome.runtime.lastError) {
        deferred.reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      var tabs = win.tabs.filter(function(v) {
        return !unloaded.hasOwnProperty(v.id);
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
  }

  /**
   * initializeContextMenu
   * the context menu is initializing.
   * @return {Promise} promiseが返る。
   */
  function initializeContextMenu()
  {
    debug('initializeContextMenu');

    var deferred = Promise.defer();

    // Remove all context menu.
    // then create context menu on the browser action.
    chrome.contextMenus.removeAll(function() {
      var parentMenuId = 'parentMenu';
      chrome.contextMenus.create(
        { id: parentMenuId,
          title: chrome.i18n.getMessage('optionPage'),
          contexts: ['browser_action'] },
        function() {
          angular.forEach(optionMenus, function(value, i) {
            var opt = chrome.i18n.getMessage(value.name);
            chrome.contextMenus.create(
              { id: i.toString(),
                title: opt,
                parentId: parentMenuId,
                contexts: ['browser_action'] });
          });

          deferred.resolve(true);
        }
      );
      chrome.contextMenus.create(
        { id: switchDisableTimerMenuItemId,
          title: chrome.i18n.getMessage('switchTimer'),
          contexts: ['browser_action'] });
      chrome.contextMenus.create(
        { id: excludeDialogMenuItemId,
          title: chrome.i18n.getMessage('add_current_tab_exclude_list'),
          contexts: ['browser_action'] });
    });

    return deferred.promise;
  }

  /**
   * 拡張機能がインストールされたときの処理
   */
  function onInstall() {
    debug('Extension Installed.');

    // インストール時にオプションページを表示
    chrome.tabs.create({ url: optionPage });
  }

  /**
   * 拡張機能がアップデートされたときの処理
   */
  function onUpdate() {
    debug('Extension Updated.');

    displayPageOfOption = 4; // the changed history of the option menu.
    chrome.tabs.create({ url: optionPage });
  }

  /**
   * 拡張機能のバージョンを返す
   * @return {String} 拡張機能のバージョン.
   */
  function getVersion() {
    debug('getVersion');
    var details = chrome.app.getDetails();
    return details.version;
  }

  function versionCheckAndUpdate()
  {
    debug('versionCheckUpdate');

    var currVersion = getVersion();
    chrome.storage.local.get(versionKey, function(storages) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
      }

      // ver chrome.storage.
      var prevVersion = storages[versionKey];
      if (currVersion !== prevVersion) {
        // この拡張機能でインストールしたかどうか
        if (prevVersion === void 0) {
          onInstall();
        } else {
          onUpdate();
        }

        var write = {};
        write[versionKey] = currVersion;
        chrome.storage.local.set(write);
      }
    });
  }

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
  function getInitAndLoadOptions()
  {
    debug('getInitAndLoadOptions');

    var deferred = Promise.defer();
    chrome.storage.local.get(null, function(items) {
      if (chrome.runtime.lastError) {
        deferred.reject(new Error(chrome.runtime.lastError.message));
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
          deferred.reject(new Error(chrome.runtime.lastError.message));
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
  }

  /**
   * 初期化.
   */
  function initialize()
  {
    debug('initialize');
    versionCheckAndUpdate();

    chrome.storage.local.get(null, function(items) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
      }
      // from 2.2.7 to 2.2.8 later.
      var prevVersion = items[versionKey];
      var session = [];
      if (prevVersion === '2.2.7' && items.backup) {
        session.push(
          { date: new Date(0).getTime(), session: JSON.parse(items.backup) });

        var write = {};
        write[sessionKey] = JSON.stringify(session);
        chrome.storage.local.set(write, function() {
          debug('move backup to sessions');
        });
      }

      getInitAndLoadOptions().then(function(options) {
        myOptions = options;

        // initialize badge.
        chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });

        // initialize history.
        tabHistory.read(myOptions.history).then(function() {
          tabHistory.setMaxHistory(parseInt(myOptions.max_history, 10));
        }, PromiseCatchFunction);

        // initialize session.
        if (prevVersion === '2.2.7') {
          tabSession.read(session);
        } else {
          tabSession.read(myOptions.sessions);
        }
        tabSession.setMaxSession(parseInt(myOptions.max_sessions, 10));
        
        // Apply timer to exist tabs.
        chrome.windows.getAll({ populate: true }, function(wins) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }

          function toAdd(current, iconURI)
          {
            if (isReleasePage(current.url)) {
              unloaded[current.id] = {
                title          : current.title,
                iconURI        : iconURI || icons[NORMAL_EXCLUDE],
                url            : getParameterByName(current.url, 'url'),
                purgeurl       : current.url,
                scrollPosition : { x: 0 , y: 0 },
              };

              setTick(current.id);
            }
          }

          // If already purging tab, be adding the object of purging tab.
          wins.forEach(function(v) {
            v.tabs.forEach(function(v2) {
              var result = checkExcludeList(v2.url);
              if (result & NORMAL_EXCLUDE) {
                if (v2.favIconUrl) {
                  getDataURI(v2.favIconUrl).then(function(response) {
                    toAdd(v2, response);
                  });
                } else {
                  toAdd(v2);
                }
              }
            });
          });
        });

        initializeContextMenu();
        chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF' });
      }).catch(PromiseCatchFunction);
    });
  }

  /**
   * isLackTheMemory
   * This function will check memory capacity.
   * If the memory is shortage, return true.
   *
   * @param criteria_memory_size criteria memory size(MByte).
   * @return {Promise} promiseが返る。
   */
  function isLackTheMemory(criteria_memory_size)
  {
    debug('isLackTheMemory');

    var deferred = Promise.defer();
    chrome.system.memory.getInfo(function(info) {
      if (chrome.runtime.lastError) {
        deferred.reject(new Error(chrome.runtime.lastError.message));
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
  }

  /**
   * autoPurgeLoop
   * This function repeats the process of releasing the tab
   * when the memory is shortage.
   *
   * @param ids target array of the id of the tabs.
   * @param index first index of the array.
   * @return {Promise} promiseが返る。
   */
  function autoPurgeLoop(ids, index)
  {
    debug('autoPurgeLoop');

    var deferred = Promise.defer();

    setTimeout(function autoPurgeLoop_inner(ids, index) {
      index = angular.isNumber(index) ? index : 0;
      if (ids.length <= index) {
        log('autoPurgeLoop is out of length.');
        deferred.resolve('autoPurgeLoop is out of length.');
        return;
      }

      tick(ids[index]).then(function() {
        isLackTheMemory(myOptions.remaiming_memory).then(function(result) {
          if (result) {
            autoPurgeLoop_inner(ids, index + 1);
          } else {
            deferred.resolve();
          }
        });
      });
    }(ids, index), 0);

    return deferred.promise;
  }

  /**
   * autoPurgeCheck
   * check run auto purge or not.
   * @return {Promise} promiseが返る。
   */
  function autoPurgeCheck()
  {
    debug('autoPurgeCheck');
    var deferred = Promise.defer();
    setTimeout(function() {
      if (myOptions.enable_auto_purge) {
        isLackTheMemory(myOptions.remaiming_memory).then(function(result) {
          if (result) {
            var ids = [];
            for (var i in ticked) {
              if (ticked.hasOwnProperty(i)) {
                ids.push(parseInt(i, 10));
              }
            }
            autoPurgeLoop(ids).then(deferred.resolve);
          } else {
            deferred.resolve();
          }
        });
      }
    }, 0);
    return deferred.promise;
  }

  /**
   * onActivatedFunc
   *
   * @param tabId the id of the tab.
   * @return {Promise} promiseが返る。
   */
  function onActivatedFunc(tabId)
  {
    debug('onActivatedFunc', tabId);
    var deferred = Promise.defer();
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        deferred.reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (myOptions.purging_all_tabs_except_active) {
        purgingAllTabsExceptForTheActiveTab();
      }

      // アイコンの状態を変更
      reloadBrowserIcon(tab).catch(deferred.reject);

      // 前にアクティブにされていたタブのアンロード時間を更新
      if (oldActiveIds[tab.windowId]) {
        setTick(oldActiveIds[tab.windowId]);
      }
      oldActiveIds[tab.windowId] = tabId;

      // 自動開放処理が有効かつメモリ不足の場合は
      // アクティブタブと除外対象以外を自動開放。
      autoPurgeCheck().then(deferred.resolve).catch(deferred.reject);
    });
    return deferred.promise;
  }

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    debug('chrome.tabs.onActivated.', activeInfo);
    if (unloaded.hasOwnProperty(activeInfo.tabId) && !myOptions.no_release) {
      unPurge(activeInfo.tabId).then(function() {
        onActivatedFunc(activeInfo.tabId);
      }).catch(PromiseCatchFunction);
    } else {
      onActivatedFunc(activeInfo.tabId).catch(PromiseCatchFunction);
    }
  });

  chrome.tabs.onCreated.addListener(function(tab) {
    debug('chrome.tabs.onCreated.', tab);
    setTick(tab.id);

    if (myOptions.purging_all_tabs_except_active) {
      purgingAllTabsExceptForTheActiveTab();
    }

    autoPurgeCheck().catch(PromiseCatchFunction);
  });

  chrome.tabs.onRemoved.addListener(function(tabId) {
    debug('chrome.tabs.onRemoved.', tabId);
    delete unloaded[tabId];
  });

  chrome.tabs.onAttached.addListener(function(tabId) {
    debug('chrome.tabs.onAttached.', tabId);
    setTick(tabId).catch(PromiseCatchFunction);
    if (myOptions.purging_all_tabs_except_active) {
      purgingAllTabsExceptForTheActiveTab();
    }
  });

  chrome.tabs.onDetached.addListener(function(tabId) {
    debug('chrome.tabs.onDetached.', tabId);
    delete unloaded[tabId];
  });

  function purgingAllTabsExceptForTheActiveTab()
  {
    /*jshint loopfunc: true*/
    debug('purgingAllTabsExceptForTheActiveTab');

    var deferred = Promise.defer();
    chrome.windows.getAll({ populate: true }, function(wins) {
      var maxPurgingTabs = myOptions.max_opening_tabs;
      for (var i = 0, len = wins.length; i < len; i++) {
        var tabs = wins[i].tabs.filter(function(v) {
          return !v.active;
        });
        var t = tabs.filter(function(v) {
          return !isReleasePage(v.url);
        });

        var alreadyPurgedLength = tabs.length - t.length;
        if (maxPurgingTabs <= alreadyPurgedLength) {
          break;
        }

        t = t.filter(function(v) {
          return (checkExcludeList(v.id) & NORMAL_EXCLUDE) !== 0;
        });

        var maxLength =
            wins[i].tabs.length - alreadyPurgedLength - maxPurgingTabs;
        for (var j = 0, lenJ = t.length; j < lenJ && j < maxLength; j++) {
          purge(t[j].id).catch(PromiseCatchFunction);
        }
      }
      deferred.resolve();
    });
    return deferred.promise;
  }

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
      debug('chrome.tabs.onUpdated. loading.', tabId, changeInfo, tab);

      if (!isReleasePage(tab.url) && unloaded.hasOwnProperty(tabId)) {
        delete unloaded[tabId];
      }

      if (myOptions.purging_all_tabs_except_active) {
        purgingAllTabsExceptForTheActiveTab();
      }
    } else {
      debug('chrome.tabs.onUpdated. complete.', tabId, changeInfo, tab);
      reloadBrowserIcon(tab).catch(PromiseCatchFunction);

      // 解放解除時に動作。
      // 指定したタブの解放時のスクロール量があった場合、それを復元する
      var scrollPos = tempScrollPositions[tabId];
      if (angular.isObject(scrollPos)) {
        chrome.tabs.executeScript(
          tabId, { code: 'scroll(' + scrollPos.x + ', ' + scrollPos.y + ');' },
          function() {
            if (chrome.runtime.lastError) {
              error(chrome.runtime.lastError.message);
            }

            delete tempScrollPositions[tabId];
          }
        );
      } else {
        delete tempScrollPositions[tabId];
      }
    }
  });

  chrome.windows.onRemoved.addListener(function(windowId) {
    debug('chrome.tabs.onRemoved.', windowId);
    delete oldActiveIds[windowId];
  });

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    debug('chrome.tabs.onMessage.', message, sender, sendResponse);
    switch (message.event) {
      case 'initialize':
        initialize();
        break;
      case 'release':
        chrome.tabs.getSelected(function(tab) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }

          purgeToggle(tab.id).then(function() {
            searchUnloadedTabNearPosition(tab);
          }).catch(PromiseCatchFunction);
        });
        break;
      case 'switch_not_release':
        chrome.tabs.getSelected(function(tab) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }

          tempReleaseToggle(tab);
        });
        break;
      case 'add_to_temp_exclude_list':
        chrome.tabs.getSelected(function(tab) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }

          var index = tempRelease.indexOf(tab.url);
          if (index === -1) {
            tempRelease.push(tab.url);
            setTick(tab.id).then(function() {
              reloadBrowserIcon(tab);
            }).catch(PromiseCatchFunction);
          }
        });
        break;
      case 'load_options_and_reload_current_tab':
        chrome.tabs.getSelected(function(tab) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }

          getInitAndLoadOptions().then(function(options) {
            myOptions = options;

            setTick(tab.id).then(function() {
              reloadBrowserIcon(tab);
            });
          }).catch(PromiseCatchFunction);
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
            return !unloaded.hasOwnProperty(v.id) &&
                   ((message.event === 'all_purge') ?
                    EXTENSION_EXCLUDE ^ state : NORMAL_EXCLUDE & state) !== 0;
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
              chrome.tabs.getSelected(function(tab) {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }

                searchUnloadedTabNearPosition(tab).then(resolve);
              });
            });
          }).catch(PromiseCatchFunction);
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
      case 'deleteHistory':
        tabHistory.remove(new Date(message.date));
        break;
      case 'deleteHistoryItem':
        tabHistory.removeItem(new Date(message.date), message.item);
        break;
      case 'deleteSession':
        tabSession.remove(new Date(message.session.date));
        break;
      case 'deleteSessionItem':
        tabSession.removeItem(new Date(message.session.date), message.key);
        break;
      case 'restore':
        restore(message.session).then(function() {
          log('restore is completed.');
        });
        break;
      case 'current_icon':
        sendResponse(currentIcon);
        break;
      case 'display_option_page':
        sendResponse(displayPageOfOption);
        displayPageOfOption = null;
        break;
      case 'keybind_check_exclude_list':
        var state = checkExcludeList(message.location.href);
        sendResponse(state ^ (EXTENSION_EXCLUDE | KEYBIND_EXCLUDE));
        break;
    }
  });

  function switchDisableTimerState()
  {
    debug('switchDisableTimerState');

    return new Promise(function(resolve, reject) {
      function lastProcess()
      {
        disableTimer = disableTimer ? false : true;
        chrome.tabs.getSelected(function(tab) {
          reloadBrowserIcon(tab).then(resolve, reject);
        });
      }

      if (disableTimer) {
        chrome.windows.getAll({ populate: true }, function(wins) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
            return;
          }

          wins.forEach(function(v) {
            v.tabs.forEach(function(v2) {
              var result = checkExcludeList(v2.url);
              if (result & NORMAL_EXCLUDE) {
                if (!isReleasePage(v2.url)) {
                  setTick(v2.id);
                }
              }
            });
          });
          lastProcess();
        });
      } else {
        for (var i in ticked) {
          if (ticked.hasOwnProperty(i)) {
            clearInterval(ticked[i]);
          }
        }
        ticked = {};
        lastProcess();
      }
    });
  }

  chrome.contextMenus.onClicked.addListener(function(info) {
    debug('chrome.contextMenus.onClicked.addListener', info);
    if (info.menuItemId === excludeDialogMenuItemId) {
      chrome.tabs.getSelected(function(tab) {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
          return;
        }

        chrome.tabs.sendMessage(tab.id, { event: 'showExcludeDialog' });
      });
      return;
    } else if (info.menuItemId === switchDisableTimerMenuItemId) {
      switchDisableTimerState();
      return;
    }

    chrome.tabs.query({ url: optionPage }, function(results) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        return;
      }

      if (results.length === 0) {
        displayPageOfOption = info.menuItemId;
        chrome.tabs.create({ url: optionPage });
      } else {
        chrome.tabs.update(results[0].id, { active: true }, function() {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
          }

          chrome.tabs.sendMessage(results[0].id,
            { event: 'contextMenus', index: info.menuItemId });
        });
      }
    });
  });

  initialize();
})();
