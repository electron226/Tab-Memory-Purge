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

  /* purge関数が実行された際に追加される。
   * その後、chrome.tabs.unloaded.addlistenerに定義された関数が呼び出され、
   * 全ての処理が終わった際に削除される。
   *
   * key: タブのID
   * value: 常にtrue
   */
  var runPurge = {};

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
        default:
          break;
      }

      // If the tab of tabId isn't existed, these process are skipped.
      deleteTick(tabId);
      setTick(tabId);
    });
    chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });

    tabSession.update(unloaded);
  });

  /**
  * 指定した除外リストの正規表現に指定したアドレスがマッチするか調べる
  * @param {String} url マッチするか調べるアドレス.
  * @param {Object} excludeOptions 除外リストの設定を表すオブジェクト.
  *                        list    除外リストの値。複数のものは\nで区切る.
  *                        options 正規表現のオプション.
  *                        returnValue 一致したときに返す返り値
  * @param {Function} [callback=excludeOptions.returnValue] callback function.
  *                            引数にはnullかreturnValueの値が入る
  */
  function checkMatchUrlString(url, excludeOptions, callback)
  {
    debug('checkMatchUrlString');

    var excludeArray = excludeOptions.list.split('\n');
    for (var i = 0, len = excludeArray.length; i < len; i++) {
      if (excludeArray[i] !== '') {
        var re = new RegExp(excludeArray[i], excludeOptions.options);
        if (re.test(url)) {
          (callback || angular.noop)(excludeOptions.returnValue);
          return;
        }
      }
    }
    (callback || angular.noop)(null);
  }

  function getTargetExcludeList(target)
  {
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
  * @param {String} [excludeTarget=normal] 使用するユーザ指定の除外リストの種類
          *                                normalかkeybindを指定
  * @param {Function} callback callback function.
  *                   コールバック関数の引数にはどのリストと一致したの数値が入る。
  *                   EXTENSION_EXCLUDE = 拡張機能内の除外リストと一致
  *                   USE_EXCLUDE    = ユーザー指定の除外アドレスと一致
  *                   TEMP_EXCLUDE   = 一時的な非解放リストと一致
  *                   NORMAL_EXCLUDE = 一致しなかった。
  */
 function checkExcludeList(url, excludeTarget, callback)
  {
    debug('checkExcludeList');

    var targetList;
    if (angular.isString(excludeTarget)) {
      targetList = getTargetExcludeList(excludeTarget);
    } else if (angular.isFunction(excludeTarget)) {
      targetList = getTargetExcludeList();
      callback = excludeTarget;
    }

    // Check exclusion list in the extension.
    checkMatchUrlString(url,
      getTargetExcludeList('extension'),
      function(extensionMatch) {
        if (extensionMatch) {
          (callback || angular.noop)(extensionMatch);
          return;
        }

        checkMatchUrlString(url, targetList, function(normalMatch) {
          if (normalMatch) {
            (callback || angular.noop)(normalMatch);
            return;
          }

          // Compared to the temporary exclusion list.
          if (tempRelease.indexOf(url) !== -1) {
            (callback || angular.noop)(TEMP_EXCLUDE);
            return;
          }

          (callback || angular.noop)(NORMAL_EXCLUDE);
        });
      }
    );
  }

  /**
   * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
   * @param {Tab} tab 対象のタブ.
   */
  function reloadBrowserIcon(tab)
  {
    debug('reloadBrowserIcon');

    checkExcludeList(tab.url, function(changeIcon) {
      chrome.browserAction.setIcon(
        { path: icons[changeIcon], tabId: tab.id }, function() {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }
          currentIcon = changeIcon;

          var title = 'Tab Memory Purge\n';
          switch (changeIcon) {
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
              error('Invalid state.');
              break;
          }
          chrome.browserAction.setTitle({ tabId: tab.id, title: title });
        }
      );
    });
  }

  /**
   * getParameterByName
   *
   * @param url the url of getting parameters.
   * @param name the target parameter name.
   * @return {null or string} null or the string of a parameter.
   */
  function getParameterByName(url, name) {
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(decodeURIComponent(url));
    return results === null ?
      "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function getPurgeURL(tab, callback) {
    function getURL(tab, iconDateURI, callback)
    {
      var args = '' ;

      args += tab.title ?
      '&title=' + encodeURIComponent(tab.title) : '';
      if (iconDateURI) {
        args += '&favicon=' + encodeURIComponent(iconDateURI);
      } else {
        args += tab.favIconUrl ?
          '&favicon=' + encodeURIComponent(tab.favIconUrl) : '';
      }

      // 解放に使うページを設定
      var page = null;
      switch (myOptions.release_page) {
        default:
          error("'release page' setting error. so to set default value.");
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

      // Do you reload tab when you focus tab?.
      args += '&focus=' + (myOptions.no_release ? 'false' : 'true');

      if (tab.url) {
        args += '&url=' + encodeURIComponent(tab.url);
      }

      callback(encodeURI(page) + '?' + encodeURIComponent(args));
    }

    if (!(angular.isObject(tab) || angular.isFunction(callback))) {
      error('getPurgeURL is invalid arguments.');
      return;
    }

    if (tab.favIconUrl) {
      getDataURI(tab.favIconUrl, function(iconURI) {
        getURL(tab, iconURI, function(url) {
          callback(url, iconURI);
        });
      });
    } else {
      getURL(tab, null, callback);
    }
  }

  /**
  * タブの解放を行います。
  * @param {Number} tabId タブのID.
  * @param {Function} callback コールバック関数。
  *                            引数は解放したタブのオブジェクトかnull.
  */
  function purge(tabId, callback)
  {
    debug('purge');
    if (!angular.isNumber(tabId)) {
      error("tabId is not number.");
      (callback || angular.noop)(null);
      return;
    }

    if (unloaded.hasOwnProperty(tabId)) {
      error('Already purging. "' + tabId + '"');
      (callback || angular.noop)(null);
      return;
    }

    runPurge[tabId] = true;

    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        (callback || angular.noop)(null);
        return;
      }

      checkExcludeList(tab.url, function(state) {
        if (state === EXTENSION_EXCLUDE) {
          (callback || angular.noop)(null);
          return;
        }

        // objScroll = タブのスクロール量(x, y)
        chrome.tabs.executeScript(
          tabId, { file: getScrollPosScript }, function(objScroll) {
            if (chrome.runtime.lastError) {
              error(chrome.runtime.lastError.message);
              (callback || angular.noop)(null);
              return;
            }

            getPurgeURL(tab, function(url, iconURI) {
              function afterPurge(updated, callback) {
                if (chrome.runtime.lastError) {
                  error(chrome.runtime.lastError.message);
                  (callback || angular.noop)(null);
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
                tabHistory.write(tab, function() {
                  (callback || angular.noop)(updated);
                });
              }

              if (myOptions.release_page === 'assignment') {
                chrome.tabs.update(tabId, { url: url }, afterPurge);
              } else {
                chrome.tabs.executeScript(tabId, {
                  code: 'window.location.replace("' + url + '");' },
                  function() {
                    chrome.tabs.get(tabId, afterPurge);
                });
              }
            });
          });
        });
      });
  }

  /**
  * 解放したタブを復元します。
  * @param {Number} tabId 復元するタブのID.
  */
  function unPurge(tabId, callback)
  {
    debug('unPurge');
    if (!angular.isNumber(tabId)) {
      error("tabId is not number.");
      return;
    }

    var url = unloaded[tabId].url;
    if (myOptions.release_page === 'normal') {
      // when release page is in the extension.
      chrome.runtime.sendMessage(
        { event: 'location_replace' }, function(useChrome) {
          // If the url is empty in purge page.
          if (useChrome) {
            chrome.tabs.update(tabId, { url: url }, callback);
          } else {
            callback();
          }
        }
      );
    } else {
      chrome.tabs.executeScript(tabId,
        { code: 'window.location.replace("' + url + '");' }, callback);
    }
  }

  /**
  * 解放状態・解放解除を交互に行う
  * @param {Number} tabId 対象のタブのID.
  */
   function purgeToggle(tabId, callback)
  {
    debug('purgeToggle');
    if (!angular.isNumber(tabId)) {
      error("tabId is not number.");
      return;
    }

    if (unloaded.hasOwnProperty(tabId)) {
      unPurge(tabId, callback);
    } else {
      purge(tabId, callback);
    }
  }

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} tabId 処理を行うタブのID.
  * @param {Function} callback コールバック関数。引数はなし.
  */
  function tick(tabId, callback)
  {
    debug('tick');

    if (!angular.isNumber(tabId) || unloaded.hasOwnProperty(tabId)) {
      error("tabId isn't number or added to unloaded already.", tabId);
      (callback || angular.noop)(null);
      return;
    }

    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        log('tick function is skipped.', tabId);
        (callback || angular.noop)(null);
        return;
      }

      // アクティブタブへの処理の場合、行わない
      if (tab.active) {
        // アクティブにしたタブのアンロード時間更新
        setTick(tabId, callback);
      } else {
        purge(tabId, callback);
      }
    });
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
  * @param {Function} callback コールバック関数。引数はなし.
  */
  function setTick(tabId, callback)
  {
    debug('setTick');
    if (!angular.isNumber(tabId)) {
      error("tabId is not number.");
      (callback || angular.noop)(null);
      return;
    }

    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        log('setTick function is skipped.');
        (callback || angular.noop)(null);
        return;
      }

      // 全ての除外アドレス一覧と比較
      checkExcludeList(tab.url, function(state) {
          // 除外アドレスに含まれていない場合
        if (state === NORMAL_EXCLUDE) {
          // 分(設定) * 秒数 * ミリ秒
          var timer = parseInt(myOptions.timer, 10) * 60 * 1000;

          // Update.
          deleteTick(tabId);
          ticked[tabId] = setInterval(function() { tick(tabId); } , timer);
        } else { // include exclude list
          deleteTick(tabId);
        }

        (callback || angular.noop)(null);
      });
    });
  }

  /**
  * 指定した辞書型の再帰処理し、タブを復元する。
  * 引数は第一引数のみを指定。
  *
  * @param {Object} object オブジェクト型。これのみを指定する.
  *                        基本的にオブジェクト型unloaded変数のバックアップを渡す.
  * @param {Function} callback コールバック関数。省略可能.
  * @param {Array} keys オブジェクト型のキー名の配列.省略可能.
  * @param {Number} index keysの再帰処理開始位置.デフォルトは0、省略可能.
  * @param {Number} end keysの最後の要素から一つ後の位置.
  *                     デフォルトはkeys.length、省略可能.
  */
 function restore(object, callback, keys, index, end)
 {
   debug('restore');

   // 最後まで処理を行ったらunloadedに上書き
   if (index >= end) {
     unloaded = object;
     (callback || angular.noop)(null);
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
   if (chrome.runtime.lastError) { // If occur a error, it is ignore.
      if (!angular.isUndefined(tab)) {
         for (var i in blankUrls) {
           if (blankUrls.hasOwnProperty(i) &&
               tab.url.indexOf(blankUrls[i]) === 0) {
             return;
           }
         }
         if (myOptions.relase_page === 'assignment' &&
             tab.url.indexOf(myOptions.release_url) === 0) {
           return;
         }
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
           runPurge[tab.id] = true;
         }

         restore(object, callback, keys, ++index, end);
       });
     }
   });
  }

  /**
  * 非解放・非解放解除を交互に行う
  * @param {Tab} tab 対象のタブオブジェクト.
  */
  function tempReleaseToggle(tab)
  {
    debug('tempReleaseToggle');

    var index = tempRelease.indexOf(tab.url);
    if (index === -1) {
      // push url in tempRelease.
      tempRelease.push(tab.url);
    } else {
      // remove url in tempRelease.
      tempRelease.splice(index, 1);
    }
    reloadBrowserIcon(tab);
    setTick(tab.id);
  }

  /**
  * 指定されたタブに最も近い未解放のタブをアクティブにする。
  * 右側から探索され、見つからなかったら左側を探索する。
  * 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
  * @param {Tab} tab 基準点となるタブ.
  * @param {Function} callback コールバック関数.
  */
 function searchUnloadedTabNearPosition(tab, callback)
  {
    debug('searchUnloadedTabNearPosition');

    // 現在のタブの左右の未解放のタブを選択する
    chrome.windows.get(tab.windowId, { populate: true }, function(win) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        (callback || angular.noop)(null);
        return;
      }

      // current tab index.
      var i = tab.index;

      // Search right than current tab.
      var j = i + 1;
      var len = win.tabs.length;
      while (j < len && unloaded.hasOwnProperty(win.tabs[j].id)) {
        j++;
      }

      // Search the left if can't find.
      if (j >= len) {
        j = i - 1;
        while (0 <= j && unloaded.hasOwnProperty(win.tabs[j].id)) {
          j--;
        }
      }

      if (0 <= j && j < len) {
        // If found tab, It's active.
        chrome.tabs.update(win.tabs[j].id, { active: true }, callback);
      } else {
        // If can not find the tab to activate to create a new tab.
        chrome.tabs.create({ active: true }, callback);
      }
    });
  }

  /**
   * initializeContextMenu
   * the context menu is initializing.
   */
  function initializeContextMenu()
  {
    debug('initializeContextMenu');
    // Remove all context menu.
    // then create context menu on the browser action.
    chrome.contextMenus.removeAll(function() {
      angular.forEach(optionMenus, function(value, i) {
        var opt = chrome.i18n.getMessage(value.name);
        chrome.contextMenus.create(
          { id: i.toString(), title: opt, contexts: ['browser_action'] });
      });
    });
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
    // この拡張機能のバージョンチェック
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
      var key;

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

      // All remove invalid options. but exclude version.
      var removeKeys = [];
      for (key in items) {
        if (items.hasOwnProperty(key)) {
          if (!defaultValues.hasOwnProperty(key) && key !== versionKey) {
            removeKeys.push(key);
            delete items[key];
          }
        }
      }

      chrome.storage.local.remove(removeKeys, function() {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
        }

        // My options are initialized.
        myOptions = items;
        for (key in defaultValues) {
          if (defaultValues.hasOwnProperty(key)) {
            if (!myOptions.hasOwnProperty(key)) {
              myOptions[key] = defaultValues[key];
            }
          }
        }

        // initialize badge.
        chrome.browserAction.setBadgeText({ text: unloadedCount.toString() });

        // initialize history.
        tabHistory.read(myOptions.history);
        tabHistory.setMaxHistory(parseInt(myOptions.max_history, 10));

        // initialize session.
        if (prevVersion === '2.2.7') {
          tabSession.read(session);
        } else {
          tabSession.read(myOptions.sessions);
        }
        tabSession.setMaxSession(parseInt(myOptions.max_sessions, 10));
//
        // Apply timer to exist tabs.
        chrome.windows.getAll({ populate: true }, function(wins) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }
          
          var regexs = [];
          for (var key in blankUrls) {
            if (blankUrls.hasOwnProperty(key)) {
              regexs.push(new RegExp('^' + blankUrls[key], 'i'));
            }
          }
           if (myOptions.relase_page === 'assignment' &&
               myOptions.release_url.length !== 0) {
             regexs.push(new RegExp('^' + myOptions.release_url, 'i'));
           }

          // If already purging tab, be adding the object of purging tab.
          function addingPurgedTabs(current) {
            function toAdd(iconURI) {
              var alreadyFlag = false;
              for (var z = 0, regLen = regexs.length; z < regLen; z++) {
                if (regexs[z].test(current.url)) {
                  runPurge[current.id] = true;
                  unloaded[current.id] = {
                    title: current.title,
                    iconURI: iconURI || icons[NORMAL_EXCLUDE],
                    url: getParameterByName(current.url, 'url'),
                    purgeurl: current.url,
                    scrollPosition: { x: 0 , y: 0 },
                  };

                  alreadyFlag = true;
                  break;
                }
              }

              if (!alreadyFlag) {
                setTick(current.id);
              }
            }

            if (current.favIconUrl) {
              getDataURI(current.favIconUrl, toAdd);
            } else {
              toAdd();
            }
          }

          function checkBeforeAdding(current) {
            checkExcludeList(current.url, function(result) {
              if (result === NORMAL_EXCLUDE) {
                addingPurgedTabs(current);
              }
            });
          }

          for (var i = 0, winLen = wins.length; i < winLen; i++) {
            for (var j = 0, tabLen = wins[i].tabs.length; j < tabLen; j++) {
              checkBeforeAdding(wins[i].tabs[j]);
            }
          }
        });

        initializeContextMenu();
        chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF' });
      });
    });
  }

  /**
   * isLackTheMemory
   * This function will check memory capacity.
   * If the memory is shortage, return true.
   *
   * @param criteria_memory_size criteria memory size(MByte).
   * @param callback callback function. return values is boolean.
   */
  function isLackTheMemory(criteria_memory_size, callback)
  {
    debug('isLackTheMemory');
    chrome.system.memory.getInfo(function(info) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        (callback || angular.noop)(null);
        return;
      }

      var ratio = info.availableCapacity / Math.pow(1024.0, 2);
      debug('availableCapacity(MByte):', ratio);
      if (ratio < parseFloat(criteria_memory_size)) {
        (callback || angular.noop)(true);
      } else {
        (callback || angular.noop)(false);
      }
    });
  }

  /**
   * autoPurgeLoop
   * This function repeats the process of releasing the tab
   * when the memory is shortage.
   *
   * @param ids target array of the id of the tabs.
   * @param index first index of the array.
   * @param callback callback function.
   */
  function autoPurgeLoop(ids, index, callback)
  {
    debug('autoPurgeLoop');
    index = angular.isNumber(index) ? index : 0;

    if (ids.length <= index) {
      log('autoPurgeLoop is out of length.');
      (callback || angular.noop)();
      return;
    }

    tick(ids[index], function() {
      isLackTheMemory(myOptions.remaiming_memory, function(result) {
        if (result) {
          autoPurgeLoop(ids, index + 1, callback);
        }
      });
    });
  }

  /**
   * autoPurgeCheck
   * check run auto purge or not.
   */
  function autoPurgeCheck()
  {
    debug('autoPurgeCheck');
    if (myOptions.enable_auto_purge === null ||
        myOptions.enable_auto_purge === void 0) {
        return;
    }

    if (myOptions.enable_auto_purge === true) {
      isLackTheMemory(myOptions.remaiming_memory, function(result) {
        if (result) {
          var ids = [];
          for (var i in ticked) {
            if (ticked.hasOwnProperty(i)) {
              ids.push(parseInt(i, 10));
            }
          }
          autoPurgeLoop(ids);
        }
      });
    }
  }

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    debug('chrome.tabs.onActivated.');
    chrome.tabs.get(activeInfo.tabId, function(tab) {
      if (chrome.runtime.lastError) {
        error(chrome.runtime.lastError.message);
        return;
      }

      // アイコンの状態を変更
      reloadBrowserIcon(tab);

      // 前にアクティブにされていたタブのアンロード時間を更新
      if (oldActiveIds[tab.windowId]) {
        setTick(oldActiveIds[tab.windowId]);
      }
      oldActiveIds[tab.windowId] = activeInfo.tabId;

      // 自動開放処理が有効かつメモリ不足の場合は
      // アクティブタブと除外対象以外を自動開放。
      autoPurgeCheck();
    });
  });

  chrome.tabs.onCreated.addListener(function(tab) {
    debug('chrome.tabs.onCreated.');
    setTick(tab.id);

    autoPurgeCheck();
  });

  chrome.tabs.onRemoved.addListener(function(tabId) {
    debug('chrome.tabs.onRemoved.');
    delete unloaded[tabId];
  });

  chrome.tabs.onAttached.addListener(function(tabId) {
    debug('chrome.tabs.onAttached.');
    setTick(tabId);
  });

  chrome.tabs.onDetached.addListener(function(tabId) {
    debug('chrome.tabs.onDetached.');
    delete unloaded[tabId];
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
      debug('chrome.tabs.onUpdated. loading.');

      if (!runPurge.hasOwnProperty(tabId)) {
        delete unloaded[tabId];
      }
    } else {
      debug('chrome.tabs.onUpdated. complete.');
      reloadBrowserIcon(tab);

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
            delete runPurge[tabId];
          }
        );
      }
      delete tempScrollPositions[tabId];
    }
    delete runPurge[tabId];
  });

  chrome.windows.onRemoved.addListener(function(windowId) {
    debug('chrome.tabs.onRemoved.');
    delete oldActiveIds[windowId];
  });

  // switch the functions of all_purge process.
  var all_purge_functions = {
    'all_purge': function(tab, callback) {
      purge(tab.id, callback);
    },
    'all_purge_without_exclude_list': function(tab, callback) {
      checkExcludeList(tab.url, function(state) {
        if (state !== NORMAL_EXCLUDE) {
          (callback || angular.noop)();
          return;
        }
        purge(tab.id, callback);
      });
    },
  };

  // and run the functions after the process.
  var all_purge_after_functions = {
    'all_purge': function(callback) {
      chrome.tabs.create({ active: true }, callback);
    },
    'all_purge_without_exclude_list': function(callback) {
      chrome.tabs.getSelected(function(tab) {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.message);
          (callback || angular.noop)(null);
          return;
        }

        searchUnloadedTabNearPosition(tab, callback);
      });
    },
  };

  chrome.runtime.onMessage.addListener(function(message, _, sendResponse) {
    debug('chrome.tabs.onMessage.');
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

          purgeToggle(tab.id);
          searchUnloadedTabNearPosition(tab);
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
      case 'all_purge':
      case 'all_purge_without_exclude_list':
        chrome.tabs.query({}, function(results) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            return;
          }

          var tabId = null;
          for (var i = 0, len = results.length; i < len; i++) {
            tabId = results[i].id;
            if (!unloaded.hasOwnProperty(tabId)) {
              all_purge_functions[message.event](results[i]);
            }
          }
          all_purge_after_functions[message.event]();
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
        restore(message.session);
        break;
      case 'current_icon':
        sendResponse(currentIcon);
        break;
      case 'display_option_page':
        sendResponse(displayPageOfOption);
        displayPageOfOption = null;
        break;
      case 'keybind_check_exclude_list':
        checkExcludeList(message.location.href, 'keybind', function(state) {
          sendResponse(
            state !== EXTENSION_EXCLUDE && state !== KEYBIND_EXCLUDE);
        });
        break;
    }
  });

  chrome.contextMenus.onClicked.addListener(function(info) {
    debug('chrome.contextMenus.onClicked.addListener');
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

          chrome.runtime.sendMessage(
            { event: 'contextMenus', index: info.menuItemId });
        });
      }
    });
  });

  initialize();
})();
