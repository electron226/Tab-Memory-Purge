/*jshint unused: false*/
(function() {
  "use strict";

  /**
   * set setInterval return value.
   * key = tabId
   * value = return setInterval value.
   */
  var ticked = {};

  /**
   * メモリ解放を行ったタブの情報が入ってる辞書型
   *
   * key = tabId
   * value = 下記のプロパティがあるオブジェクト
   *         url: 解放前のURL
   *         purgeurl: 休止ページのURL
   *         scrollPosition: スクロール量(x, y)を表すオブジェクト
   */
  var unloaded = {};

  /**
   * タブの解放を解除したタブのスクロール量(x, y)を一時的に保存する連想配列
   * key = tabId
   * value = スクロール量(x, y)を表す連想配列
   */
  var tempScrollPositions = {};

  // the string that represents the temporary exclusion list
  var tempRelease = [];

  // アクティブなタブを選択する前に選択していたタブのID
  var oldActiveIds = {};

  // This items want to add to the context menu.
  // var adds_context_menu = ['keybind', 'history'];

  // the backup of released tabs.
  var tabBackup = new Backup("backup");

  /* purge関数が実行された際に追加される。
   * その後、chrome.tabs.unloaded.addlistenerに定義された関数が呼び出され、
   * 全ての処理が終わった際に削除される。
   *
   * key: タブのID
   * value: 常にtrue
   */
  var runPurge = {};

  // my option settings.
  var myOptions = null;

  // the history key name on the local storage.
  var historyKey = 'history';
  // the key name for the version of this extension on storage.
  var versionKey = 'version';

  /**
  * 指定した除外リストの正規表現に指定したアドレスがマッチするか調べる
  * @param {String} url マッチするか調べるアドレス.
  * @param {Object} excludeOptions 除外リストの設定を表すオブジェクト.
  *                        list    除外リストの値。複数のものは\nで区切る.
  *                        options 正規表現のオプション.
  * @param {Function} callback callback function.
  *                   コールバック関数の引数にはBoolean型の値が入る.
  *                   マッチしたらtrue, しなかったらfalse.
  */
  function checkMatchUrlString(url, excludeOptions, callback)
  {
    console.log('checkMatchUrlString');
    if (toType(url) !== 'string') {
      console.error("Invalid argument. the url isn't string.");
    }
    if (toType(excludeOptions) !== 'object') {
      console.error("Invalid argument. the excludeOptions isn't object.");
    }
    if (toType(excludeOptions.list) !== 'string') {
      console.error(
          "Invalid argument. the list in the excludeOptions isn't string.");
    }
    if (toType(excludeOptions.options) !== 'string') {
      console.error(
          "Invalid argument. the option in the excludeOptions isn't string.");
    }
    if (toType(callback) !== 'function') {
      console.error("Invalid argument. callback argument don't function type.");
    }

    var excludeArray = excludeOptions.list.split('\n');
    for (var i = 0; i < excludeArray.length; i++) {
      if (excludeArray[i] !== '') {
        var re = new RegExp(excludeArray[i], excludeOptions.options);
        if (re.test(url)) {
          callback(true);
          return;
        }
      }
    }
    callback(false);
  }

  /**
  * 与えられたURLが全ての除外リストに一致するか検索する。
  * @param {String} url 対象のURL.
  * @param {Function} callback callback function.
  *                   コールバック関数の引数にはどのリストと一致したの数値が入る。
  *                   USE_EXCLUDE    = 通常のユーザが変更できる除外アドレス
  *                   TEMP_EXCLUDE   = 一時的な非解放リスト
  *                   NORMAL_EXCLUDE = 一致しなかった。.
  */
  function checkExcludeList(url, callback)
  {
    console.log('checkExcludeList');
    if (toType(url) !== 'string') {
      console.error("Invalid argument. url isn't string.");
    }
    if (toType(callback) !== 'function') {
      console.error("Invalid argument. callback argument don't function type.");
    }

    // Check exclusion list in the extension.
    checkMatchUrlString(url,
      { list: extension_exclude_url, options: 'i' },
      function(extensionMatch) {
        if (extensionMatch) {
          callback(EXTENSION_EXCLUDE);
          return;
        }

        checkMatchUrlString(url,
          { list: myOptions.exclude_url,
            options: myOptions.regex_insensitive ? 'i' : '' },
          function(normalMatch) {
            if (normalMatch) {
              callback(USE_EXCLUDE);
              return;
            }

            // Compared to the temporary exclusion list.
            if (tempRelease.indexOf(url) !== -1) {
              callback(TEMP_EXCLUDE);
              return;
            }

            callback(NORMAL_EXCLUDE);
          }
        );
      }
    );
  }

  /**
   * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
   * 保存データには変更したアイコンファイルを表す文字列が入る。
   * この値はハッシュ変数(icons)のキー名でもある。
   * @param {Tab} tab 対象のタブ.
   */
  function reloadBrowserIcon(tab)
  {
    console.log('reloadBrowserIcon');
    if (toType(tab) !== 'object') {
      console.error("Invalid argument. tab isn't object.");
    }

    checkExcludeList(tab.url, function(changeIcon) {
      chrome.browserAction.setIcon(
        { path: icons[changeIcon], tabId: tab.id }, function() {
          var save = {};
          save.purgeIcon = changeIcon;
          chrome.storage.local.set(save);

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
              console.error('Invalid state.');
              break;
          }
          chrome.browserAction.setTitle({ tabId: tab.id, title: title });
        }
      );
    });
  }

  /**
   * 解放されているタブの数をブラウザアクションのアイコンの上に数値で表示する。
   * @return なし
   */
  function reloadBadge()
  {
    console.log('reloadBadge');
    var length = 0;
    for (var i in unloaded) {
      length++;
    }
    chrome.browserAction.setBadgeText({ text: length.toString() });
  }

  /**
   * deleteOldHistory
   * Search history and delete.
   */
  function deleteOldHistory()
  {
    var purgeHistory = myOptions[historyKey];
    if (purgeHistory === void 0 ||
        purgeHistory === null ||
        purgeHistory === {}) {
      return;
    }

    // Delete the history of pre-history
    // than the maximum number of days.
    var max_history = myOptions.max_history;
    // milliseconds * seconds * minutes * hours * days
    var now = new Date();
    var criterion = 1000 * 60 * 60 * 24 * max_history;
    var removeTime = now.getTime() - criterion;
    var removeDates = [];
    for (var dateTime in purgeHistory) {
      if (parseInt(dateTime, 10) < removeTime) {
        removeDates.push(dateTime);
      }
    }
    for (var i in removeDates) {
      delete purgeHistory[removeDates[i]];
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
    console.log('purge');
    if (toType(tabId) !== 'number') {
      console.error("Invalid argument. tabId isn't number.");
    }

    runPurge[tabId] = true;

    chrome.tabs.get(tabId, function(tab) {
      checkExcludeList(tab.url, function(state) {
        if (state === EXTENSION_EXCLUDE) {
          if (toType(callback) === 'function') {
            callback(null);
          }
          return;
        }

        // objScroll = タブのスクロール量(x, y)
        chrome.tabs.executeScript(
          tabId, { file: get_scrollPos_script }, function(objScroll) {
            var args = '';

            var t = tab.title;
            var title = tab.title ?
              '&title=' + encodeURIComponent(tab.title) : '';
            var favicon = tab.favIconUrl ?
              '&favicon=' + encodeURIComponent(tab.favIconUrl) : '';

            // 解放に使うページを設定
            var page = null;
            var storageName = 'release_page';
            switch (myOptions[storageName]) {
            case 'author': // 作者サイト
              page =  blank_urls.normal;
              args += title + favicon;
              break;
            case 'normal': // 拡張機能内
              page = blank_urls.local;
              args += title + favicon;
              break;
            case 'assignment': // 指定URL
              page = myOptions.release_url;

              if (myOptions.assignment_title) {
                args += title;
              }
              if (myOptions.assignment_favicon) {
                args += favicon;
              }
              break;
            default: // 該当なしの時は初期値を設定
              console.log(
                "'release page' setting error. so to set default value.");
              chrome.storage.local.remove(storageName);
              purge(tabId); // この関数を実行し直す
              break;
            }

            // Do you reload tab when you focus tab?.
            args += '&focus=' + (myOptions.no_release ? 'false' : 'true');

            if (tab.url) {
              args += '&url=' + encodeURIComponent(tab.url);
            }
            var url = encodeURI(page) + '?' + encodeURIComponent(args);

            var afterPurge = function(updated, callback) {
              unloaded[updated.id] = {
                url: tab.url,
                purgeurl: url,
                scrollPosition: objScroll[0] || { x: 0 , y: 0 }
              };
              reloadBadge();
              deleteTick(tabId);
              tabBackup.set(unloaded);

              // the histories are writing.
              var his = myOptions[historyKey];
              var purgeHistory = (his !== void 0 && his !== null) ?
                                 myOptions[historyKey] : {};
              
              // Save new history.
              var now = new Date();
              var date = new Date(
                now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
              var write_date = date.getTime();
              if (purgeHistory[write_date] === void 0 ||
                  purgeHistory[write_date] === null) {
                purgeHistory[write_date] = [];
              }
              purgeHistory[write_date].push({
                'title': tab.title ? tab.title : 'Unknown',
                'url': tab.url,
                'time': now.getTime(),
              });

              deleteOldHistory();

              var write = {};
              write[historyKey] = purgeHistory;
              chrome.storage.local.set(write, callback);
            };

            if (myOptions[storageName] === 'assignment') {
              chrome.tabs.update(tabId, { url: url }, afterPurge);
            } else {
              chrome.tabs.executeScript(tabId, {
                code: 'window.location.replace("' + url + '");' }, function() {
                chrome.tabs.get(tabId, afterPurge);
              });
            }
          });
        });
      });
  }

  /**
   * 解放処理後の処理。
   *
   * @param {Number} tabId 解放したタブのID.
   * @return なし
   */
  function afterUnPurge(tabId)
  {
    console.log('afterUnPurge');
    if (unloaded.hasOwnProperty(tabId)) {
      // スクロール位置を一時的に保存
      // chrome.tabs.updated.addlistenerで使用。
      tempScrollPositions[tabId] = unloaded[tabId].scrollPosition;

      delete unloaded[tabId];
      reloadBadge();
      tabBackup.set(unloaded);
      setTick(tabId);
    }
  }

  /**
  * 解放したタブを復元します。
  * @param {Number} tabId 復元するタブのID.
  */
  function unPurge(tabId)
  {
    console.log('unPurge');
    if (toType(tabId) !== 'number') {
      console.error("Invalid argument. tabId isn't number.");
      return;
    }

    var url = unloaded[tabId].url;
    if (toType(url) !== 'string') {
      console.error("Can't get url of tabId in unloaded.");
      return;
    }

    chrome.tabs.executeScript(tabId, {
      code: 'window.location.replace("' + url + '");', }, function() {
      afterUnPurge(tabId);
    });
  }

  /**
  * 解放状態・解放解除を交互に行う
  * @param {Number} tabId 対象のタブのID.
  */
  function purgeToggle(tabId)
  {
    console.log('purgeToggle');
    if (toType(tabId) !== 'number') {
      console.error("Invalid argument. tabId isn't number.");
    }

    if (unloaded[tabId]) {
      unPurge(tabId);
    } else {
      purge(tabId);
    }
  }

  /**
  * 定期的に実行される関数。アンロードするかどうかを判断。
  * @param {Number} tabId 処理を行うタブのID.
  * @param {Function} callback コールバック関数。引数はなし.
  */
  function tick(tabId, callback)
  {
    console.log('tick');
    if (toType(tabId) !== 'number') {
      console.error("Invalid argument. tabId isn't number.");
    }

    if (toType(unloaded[tabId]) !== 'object') {
      chrome.tabs.get(tabId, function(tab) {
        if (tab === void 0 || !tab.hasOwnProperty('active')) {
          console.log('tick function is skipped.', tabId);

          if (toType(callback) === 'function') {
            callback();
          }
          return 0;
        }

        // アクティブタブへの処理の場合、行わない
        if (tab.active) {
          // アクティブにしたタブのアンロード時間更新
          setTick(tabId, callback);
        } else {
          purge(tabId, callback);
        }
      });
    } else {
      callback();
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
    console.log('setTick');
    if (toType(tabId) !== 'number') {
      console.error("Invalid argument. tabId isn't number.");
    }

    chrome.tabs.get(tabId, function(tab) {
      if (tab === void 0 || !tab.hasOwnProperty('url')) {
        console.log('setTick function is skipped.');
        if (toType(callback) === 'function') {
          callback();
        }
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

        if (toType(callback) === 'function') {
          callback();
        }
      });
    });
  }

  /**
  * 定期的な処理を停止
  * @param {Number} tabId 停止するタブのID.
  */
  function deleteTick(tabId)
  {
    console.log('deleteTick');
    if (ticked.hasOwnProperty(tabId)) {
      clearInterval(ticked[tabId]);
      delete ticked[tabId];
    }
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
   console.log('restore');
   if (toType(object) !== 'object') {
     console.error("Invalid argument. object isn't object.");
   }
   if (keys !== void 0 && toType(keys) !== 'array') {
     console.error("Invalid argument. keys isn't array or undefined.");
   }
   if (index !== void 0 && toType(index) !== 'number') {
     console.error("Invalid argument. index isn't number or undefined.");
   }
   if (end !== void 0 && toType(end) !== 'number') {
     console.error("Invalid argument. end isn't number or undefined.");
   }

   // 最後まで処理を行ったらunloadedに上書き
   if (index >= end) {
     unloaded = object;
     if (toType(callback) === 'function') {
       callback();
     }
     return;
   }

   // 初期値
   if (toType(keys) !== 'array') {
     keys = [];
     for (var key in object) {
       keys.push(key);
     }
     index = 0;
     end = keys.length;
   }

   var tabId = parseInt(keys[index], 10);
   chrome.tabs.get(tabId, function(tab) {
     if (tab === void 0 || toType(tab) === 'object') {
       if (tab !== void 0) {
         for (var i in blank_urls) {
           if (tab.url.indexOf(blank_urls[i]) === 0) {
             return;
           }
         }
       }

       // タブが存在しない場合、新規作成
       var purgeurl = object[tabId].purgeurl;
       chrome.tabs.create({ url: purgeurl, active: false }, function(tab) {
         var temp = object[tabId];
         delete object[tabId];
         object[tab.id] = temp;
         runPurge[tab.id] = true;

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
    console.log('tempReleaseToggle');
    if (toType(tab) !== 'object') {
      console.error("Invalid argument. tab isn't object.");
    }

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
  */
  function searchUnloadedTabNearPosition(tab)
  {
    console.log('searchUnloadedTabNearPosition');
    if (toType(tab) !== 'object') {
      console.error("Invalid argument. tab isn't object.");
      return;
    }

    // 現在のタブの左右の未解放のタブを選択する
    chrome.windows.get(tab.windowId, { populate: true }, function(win) {
      // current tab index.
      var i = tab.index;

      // Search right than current tab.
      var j = i + 1;
      while (j < win.tabs.length && unloaded.hasOwnProperty(win.tabs[j].id)) {
        j++;
      }

      // Search the left if can't find.
      if (j >= win.tabs.length) {
        j = i - 1;
        while (0 <= j && unloaded.hasOwnProperty(win.tabs[j].id)) {
          j--;
        }
      }

      if (0 <= j && j < win.tabs.length) {
        // If found tab, It's active.
        chrome.tabs.update(win.tabs[j].id, { active: true });
      } else {
        // If can not find the tab to activate to create a new tab.
        chrome.tabs.create({ active: true });
      }
    });
  }

  /**
   * initializeContextMenu
   * the context menu is initializing.
   */
  // function initializeContextMenu()
  // {
  //   // Remove all context menu.
  //   // then create context menu on the browser action.
  //   chrome.contextMenus.removeAll(function() {
  //     var opt;
  //     for (var i in adds_context_menu) {
  //       opt = chrome.i18n.getMessage(adds_content_menus[i]);
  //       chrome.contextMenus.create(
  //         { id: adds_content_menus[i],
  //           title: opt,
  //           contexts: ['browser_action'] });
  //     }
  //   });
  // }

  /**
   * 拡張機能がインストールされたときの処理
   */
  function onInstall() {
    console.log('Extension Installed.');

    // インストール時にオプションページを表示
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  /**
   * 拡張機能がアップデートされたときの処理
   */
  function onUpdate() {
    console.log('Extension Updated.');
  }

  /**
   * 拡張機能のバージョンを返す
   * @return {String} 拡張機能のバージョン.
   */
  function getVersion() {
    var details = chrome.app.getDetails();
    return details.version;
  }

  function versionCheckAndUpdate()
  {
    // この拡張機能のバージョンチェック
    var currVersion = getVersion();
    chrome.storage.local.get(versionKey, function(storages) {
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
    console.log('initialize');
    versionCheckAndUpdate();

    chrome.storage.local.get(null, function(items) {
      // All remove invalid options. but exclude version.
      var removeKeys = [];
      for (var key in items) {
        if (!default_values.hasOwnProperty(key) && key !== versionKey) {
          removeKeys.push(key);
        }
      }

      chrome.storage.local.remove(removeKeys, function() {
        // My options are initialized.
        myOptions = items;
        for(var key in default_values) {
          if (!myOptions.hasOwnProperty(key)) {
            myOptions[key] = default_values[key];
          }
        }

        // Apply timer to exist tabs.
        chrome.windows.getAll({ populate: true }, function(wins) {
          for (var i = 0; i < wins.length; i++) {
            for (var j = 0; j < wins[i].tabs.length; j++) {
              setTick(wins[i].tabs[j].id);
            }
          }
        });

        // initializeContextMenu();
        chrome.browserAction.setBadgeBackgroundColor({ color: '#0066FF', });
        reloadBadge();

        // Old history is deleting.
        deleteOldHistory();

        /* オプション(強制終了された場合、起動時に以前の解放されたタブを復元) */
        if (items.forcibly_close_restore) {
          chrome.runtime.sendMessage({ event: 'restore' });
        }
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
    chrome.system.memory.getInfo(function(info) {
      var ratio = info.availableCapacity / Math.pow(1024.0, 2);
      console.log('availableCapacity(MByte):', ratio);
      if (ratio < parseFloat(criteria_memory_size)) {
        callback(true);
      } else {
        callback(false);
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
   */
  function autoPurgeLoop(ids, index)
  {
    if (index === void 0 || index == null) {
      index = 0;
    }

    if (ids.length <= index) {
      console.log('autoPurgeLoop is out of length.');
      return;
    }

    tick(ids[index], function() {
      isLackTheMemory(myOptions.remaiming_memory, function(result) {
        if (result) {
          autoPurgeLoop(ids, index + 1);
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
    if (myOptions.enable_auto_purge === true) {
      isLackTheMemory(myOptions.remaiming_memory, function(result) {
        if (result) {
          var ids = [];
          for (var i in ticked) {
            ids.push(parseInt(i, 10));
          }
          autoPurgeLoop(ids);
        }
      });
    }
  }

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    console.log('chrome.tabs.onActivated.');
    chrome.tabs.get(activeInfo.tabId, function(tab) {
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
    console.log('chrome.tabs.onCreated.');
    setTick(tab.id);

    autoPurgeCheck();
  });

  chrome.tabs.onRemoved.addListener(function(tabId) {
    console.log('chrome.tabs.onRemoved.');
    delete unloaded[tabId];
    deleteTick(tabId);
    tabBackup.set(unloaded);
    reloadBadge();
  });

  chrome.tabs.onAttached.addListener(function(tabId) {
    console.log('chrome.tabs.onAttached.');
    setTick(tabId);
  });

  chrome.tabs.onDetached.addListener(function(tabId) {
    console.log('chrome.tabs.onDetached.');
    delete unloaded[tabId];
    deleteTick(tabId);
    tabBackup.set(unloaded);
    reloadBadge();
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
      console.log('chrome.tabs.onUpdated. loading.');

      // 自動リロード機能を無効にしている際、
      // 手動で元ページに移動した際に解放処理の後処理を行う。
      if (!runPurge.hasOwnProperty(tabId)) {
        afterUnPurge(tabId);
      }
    } else {
      console.log('chrome.tabs.onUpdated. complete.');
      reloadBrowserIcon(tab);

      // 解放解除時に動作。
      // 指定したタブの解放時のスクロール量があった場合、それを復元する
      var scrollPos = tempScrollPositions[tabId];
      if (toType(scrollPos) === 'object') {
        chrome.tabs.executeScript(
          tabId, { code: 'scroll(' + scrollPos.x + ', ' + scrollPos.y + ');' },
          function() {
            delete tempScrollPositions[tabId];
            delete runPurge[tabId];
          }
        );
      }
    }
    delete runPurge[tabId];
  });

  chrome.windows.onRemoved.addListener(function(windowId) {
    console.log('chrome.tabs.onRemoved.');
    delete oldActiveIds[windowId];
    var count = 0;
    for (var i in oldActiveIds) {
      count++;
    }
    if (count <= 0) {
      tabBackup.remove();
    }
  });

  // switch the functions of all_purge process.
  var all_purge_functions = {
    'all_purge': function(tab, callback) {
      purge(tab.id, callback);
    },
    'all_purge_without_exclude_list': function(tab, callback) {
      checkExcludeList(tab.url, function(state) {
        if (state !== NORMAL_EXCLUDE) {
          if (toType(callback) === 'function') {
            callback();
          }
          return;
        }
        purge(tab.id, callback);
      });
    },
  };

  // and run the functions after the process.
  var all_purge_after_functions = {
    'all_purge': function(callback) {
      chrome.tabs.create({ active: true });
    },
    'all_purge_without_exclude_list': function(callback) {
      chrome.tabs.getSelected(function(tab) {
        searchUnloadedTabNearPosition(tab);
      });
    },
  };

  chrome.runtime.onMessage.addListener(function(message, _, sendResponse) {
    console.log('chrome.tabs.onMessage.');
    switch (message.event) {
      case 'initialize':
        initialize();
        break;
      case 'release':
        chrome.tabs.getSelected(function(tab) {
          purgeToggle(tab.id);
          searchUnloadedTabNearPosition(tab);
        });
        break;
      case 'switch_not_release':
        chrome.tabs.getSelected(function(tab) {
          tempReleaseToggle(tab);
        });
        break;
      case 'all_purge':
      case 'all_purge_without_exclude_list':
        chrome.tabs.query({}, function(results) {
          var tabId = null;
          for (var i = 0; i < results.length; i++) {
            tabId = results[i].id;
            if (!(tabId in unloaded)) {
              all_purge_functions[message.event](results[i]);
            }
          }
          all_purge_after_functions[message.event]();
        });
        break;
      case 'all_unpurge':
        // 解放されている全てのタブを解放解除
        for (var key in unloaded) {
          unPurge(parseInt(key, 10));
        }
        break;
      case 'restore':
        tabBackup.get(function(obj) {
          if (obj === null) {
            return;
          }
          restore(obj, function() {
            reloadBadge();
          });
        });
        break;
    }
  });

  // chrome.contextMenus.onClicked.addListener(function(info) {
  //   chrome.tabs.create({ url: option_page }, function(tab) {
  //   });
  // });

  initialize();
})();
