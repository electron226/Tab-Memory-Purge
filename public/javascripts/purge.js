;/* 拡張機能 動作部分本体 */


/**
 * set setInterval return value.
 * key = tabId
 * value = return setInterval value.
 */
var ticked = new Object();


/**
 * メモリ解放を行ったタブの情報が入ってる辞書型
 *
 * key = tabId
 * value = 下記のプロパティがあるオブジェクト
 *         url: 解放前のURL
 *         purgeurl: 休止ページのURL
 *         scrollPosition: スクロール量(x, y)を表すオブジェクト
 */
var unloaded = new Object();


/**
 * タブの解放を解除したタブのスクロール量(x, y)を一時的に保存する連想配列
 * key = tabId
 * value = スクロール量(x, y)を表す連想配列
 */
var tempScrollPositions = new Object();

// the string that represents the temporary exclusion list
var tempRelease = new Array();

// アクティブなタブを選択する前に選択していたタブのID
var oldActiveIds = new TabIdHistory(5);

// the name of key of backup in the local storage.
var backupKey = 'backup';

// the path of the release url of author
var release_author_url = {
  'normal': 'https://tabmemorypurge.appspot.com/blank.html',
  'noreload': 'https://tabmemorypurge.appspot.com/blank_noreload.html'
};

// the path of the blank page.
var local_blank_page = chrome.runtime.getURL('blank.html');

// file of get scroll position of tab.
var get_scrollPos_script = 'public/javascripts/getScrollPosition.js';

// the path of icons.
// defined NORMAL_EXCLUDE etc... in common.js.
var icons = new Object();
icons[NORMAL_EXCLUDE] = chrome.runtime.getURL('icon/icon_019.png');
icons[USE_EXCLUDE] = chrome.runtime.getURL('icon/icon_019_use_exclude.png');
icons[TEMP_EXCLUDE] = chrome.runtime.getURL('icon/icon_019_temp_exclude.png');
icons[EXTENSION_EXCLUDE] =
    chrome.runtime.getURL('icon/icon_019_extension_exclude.png');


/**
* タブの解放を行います。
* @param {Number} tabId タブのID.
*/
function Purge(tabId)
{
  if (getType(tabId) != 'number') {
    throw new Error("Invalid argument. tabId isn't number.");
  }

  chrome.storage.local.get(default_values, function(storages) {
    chrome.tabs.get(tabId, function(tab) {
      // objScroll = タブのスクロール量(x, y)
      chrome.tabs.executeScript(
          tabId, { file: get_scrollPos_script }, function(objScroll) {
            var args = new String();

            var title = '';
            if (tab.title) {
              title = '&title=' + encodeURIComponent(tab.title);
            }

            var favicon = '';
            if (tab.favIconUrl) {
              favicon = '&favicon=' + encodeURIComponent(tab.favIconUrl);
            }

            // 解放に使うページを設定
            var page = local_blank_page;
            var storageName = 'release_page_radio';
            var release_page = storages[storageName] !== undefined ?
                               storages[storageName] :
                               default_values[storageName];
            switch (release_page) {
              case 'author': // 作者サイト
                var storageName = 'no_release_checkbox';
                var no_release = storages[storageName] !== undefined ?
                                 storages[storageName] :
                                 default_values[storageName];
                if (no_release) {
                  // If release page is activated, it don't reload.
                  page = release_author_url['noreload'];
                } else {
                  // If release page is activated, it is reload.
                  page = release_author_url['normal'];
                }
              case 'normal': // 拡張機能内
                args += title + favicon;
                break;
              case 'assignment': // 指定URL
                var storageName = 'release_url_text';
                var release_url = storages[storageName] !== undefined ?
                                  storages[storageName] :
                                  default_values[storageName];
                if (release_url != '') {
                  page = release_url;
                }

                var storageName = 'assignment_title_checkbox';
                var checked_title = storages[storageName] !== undefined ?
                                    storages[storageName] :
                                    default_values[storageName];
                if (checked_title) {
                  args += title;
                }

                var storageName = 'assignment_favicon_checkbox';
                var checked_favicon = storages[storageName] !== undefined ?
                                      storages[storageName] :
                                      default_values[storageName];
                if (checked_favicon) {
                  args += favicon;
                }
                break;
              default: // 該当なしの時は初期値を設定
                console.log("'release page' setting error." +
                            ' so to set default value.');
                chrome.storage.local.remove('release_page_radio');
                Purge(tabId); // この関数を実行し直す
                break;
            }

            if (tab.url) {
              args += '&url=' + encodeURIComponent(tab.url);
            }
            var url = page + '?' + args;

            chrome.tabs.update(tabId, { 'url': url }, function(updated) {
              unloaded[updated.id] = {
                url: tab.url,
                purgeurl: url,
                scrollPosition: objScroll[0]
              };

              deleteTick(tabId);

              UpdateBackup();
            });
          });
    });
  });
}


/**
* 解放したタブを復元します。
* 引数urlが指定されていた場合、unloadedに該当するタブが
* 解放されているかどうかに関わらず、解放処理が行われる。
* @param {Number} tabId 復元するタブのID.
*/
function UnPurge(tabId)
{
  var url = unloaded[tabId]['url'];
  if (getType(url) != 'string') {
    throw new Error("Can't get url of tabId in unloaded.");
  }

  chrome.tabs.update(tabId, { url: url }, function(updated) {
    // スクロール位置を一時的に保存
    tempScrollPositions[tabId] = unloaded[tabId]['scrollPosition'];

    delete unloaded[tabId];
    setTick(tabId);

    UpdateBackup();
  });
}


/**
* 解放状態・解放解除を交互に行う
* @param {Number} tabId 対象のタブのID.
*/
function PurgeToggle(tabId)
{
  if (getType(tabId) != 'number') {
    throw new Error("Invalid argument. tabId isn't number.");
  }

  if (unloaded[tabId]) {
    UnPurge(tabId);
  } else {
    Purge(tabId);
  }
}


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
function CheckMatchUrlString(url, excludeOptions, callback)
{
  if (getType(url) != 'string') {
    throw new Error("Invalid argument. the url isn't string.");
  }
  if (getType(excludeOptions) != 'object') {
    throw new Error("Invalid argument. the excludeOptions isn't object.");
  }
  if (getType(excludeOptions.list) != 'string') {
    throw new Error(
        "Invalid argument. the list in the excludeOptions isn't string.");
  }
  if (getType(excludeOptions.options) != 'string') {
    throw new Error(
        "Invalid argument. the option in the excludeOptions isn't string.");
  }
  if (getType(callback) != 'function') {
    throw new Error("Invalid argument. callback argument don't function type.");
  }

  var exclude_array = excludeOptions.list.split('\n');
  for (var i = 0; i < exclude_array.length; i++) {
    if (exclude_array[i] != '') {
      var re = new RegExp(exclude_array[i], excludeOptions.options);
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
function CheckExcludeList(url, callback)
{
  if (getType(url) != 'string') {
    throw new Error("Invalid argument. url isn't string.");
  }
  if (getType(callback) != 'function') {
    throw new Error("Invalid argument. callback argument don't function type.");
  }

  chrome.storage.local.get(default_values, function(storages) {
    CheckMatchUrlString(
        url,
        { list: default_values['extension_exclude_url'], options: 'i' },
        function(extension_match) {
          if (extension_match) {
            callback(EXTENSION_EXCLUDE);
            return;
          }

          // 除外アドレスと比較
          var storageName = 'exclude_url_textarea';
          var normal_excludes = storages[storageName] !== undefined ?
                                storages[storageName] :
                                default_values[storageName];
          // get regular regex option.
          var storageName = 'regex_insensitive_checkbox';
          var regex_insensitive = storages[storageName] !== undefined ?
                                  storages[storageName] :
                                  default_values[storageName];
          var regex_options = (regex_insensitive == true) ? 'i' : '';
          CheckMatchUrlString(
              url,
              { list: normal_excludes, options: regex_options },
              function(normal_match) {
                if (normal_match) {
                  // Normal Exclude List
                  callback(USE_EXCLUDE);
                  return;
                }

                // 一時的な非解放リストと比較
                if (tempRelease.indexOf(url) != -1) {
                  callback(TEMP_EXCLUDE);
                  return;
                }

                callback(NORMAL_EXCLUDE);
              }
          );
        }
    );
  });
}


/**
* 定期的に実行される関数。アンロードするかどうかを判断。
* @param {Number} tabId 処理を行うタブのID.
*/
function tick(tabId)
{
  if (getType(tabId) != 'number') {
    throw new Error("Invalid argument. tabId isn't number.");
  }

  if (getType(unloaded[tabId]) != 'object') {
    chrome.tabs.get(tabId, function(tab) {
      // アクティブタブへの処理の場合、行わない
      if (tab.active) {
        // アクティブにしたタブのアンロード時間更新
        UnloadTimeProlong(tabId);
      } else {
        Purge(tabId);
      }
    });
  }
}


/**
* 定期的に解放処理の判断が行われるよう設定します。
* @param {Number} tabId 設定するタブのID.
*/
function setTick(tabId)
{
  if (getType(tabId) != 'number') {
    throw new Error("Invalid argument. tabId isn't number.");
  }

  chrome.storage.local.get(default_values, function(storages) {
    chrome.tabs.get(tabId, function(tab) {
      CheckExcludeList(tab.url, function(state) {
        // 全ての除外アドレス一覧と比較
        if (state == NORMAL_EXCLUDE) {
          // 除外アドレスに含まれていない場合
          var storageName = 'timer_number';
          var timer = storages[storageName] !== undefined ?
                      storages[storageName] :
                      default_values[storageName];
          timer = timer * 60 * 1000; // 分(設定) * 秒数 * ミリ秒

          ticked[tabId] = setInterval(function() { tick(tabId); } , timer);
        } else { // include exclude list
          deleteTick();
        }
      });
    });
  });
}


/**
* 定期的な処理を停止
* @param {Number} tabId 停止するタブのID.
*/
function deleteTick(tabId)
{
  if (ticked[tabId]) {
    clearInterval(ticked[tabId]);
    delete ticked[tabId];
  }
}


/**
* アンロード時間の延長
* @param {Number} tabId 延長するタブのID.
*/
function UnloadTimeProlong(tabId)
{
  deleteTick(tabId);
  setTick(tabId);
}


/**
* 解放されている全てのタブを解放解除
*/
function AllUnPurge()
{
  for (var key in unloaded) {
    UnPurge(parseInt(key));
  }
}


/**
* 指定した辞書型の再帰処理し、タブを復元する。
* 引数は第一引数のみを指定。
*
* @param {Object} object オブジェクト型。これのみを指定する.
*                        基本的にオブジェクト型unloaded変数のバックアップを渡す.
* @param {String} keys オブジェクト型のキー名の配列.省略可能.
* @param {Number} index keysの再帰処理開始位置.デフォルトは0、省略可能.
* @param {Number} end keysの最後の要素から一つ後の位置.
*                     デフォルトはkeys.length、省略可能.
*/
function Restore(object, keys, index, end)
{
  if (getType(object) != 'object') {
    throw new Error("Invalid argument. object isn't object.");
  }
  if (keys !== undefined && getType(keys) != 'array') {
    throw new Error("Invalid argument. keys isn't array or undefined.");
  }
  if (index !== undefined && getType(index) != 'number') {
    throw new Error("Invalid argument. index isn't number or undefined.");
  }
  if (end !== undefined && getType(end) != 'number') {
    throw new Error("Invalid argument. end isn't number or undefined.");
  }

  // 最後まで処理を行ったらunloadedに上書き
  if (index >= end) {
    unloaded = object;
    return;
  }

  // 初期値
  if (getType(keys) != 'array') {
    keys = new Array();
    for (var i in object) {
      keys.push(i);
    }
    index = 0;
    end = keys.length;
  }

  var tabId = parseInt(keys[index]);
  chrome.tabs.get(tabId, function(tab) {
    if (tab === undefined || tab === null) {
      // タブが存在しない場合、新規作成
      var purgeurl = object[tabId]['purgeurl'];
      chrome.tabs.create({ url: purgeurl, active: false }, function(tab) {
        var temp = object[tabId];
        delete object[tabId];
        object[tab.id] = temp;

        Restore(object, keys, ++index, end);
      });
    }
  });
}


/**
* 解放済みのタブを復元する。
* アップデートなどで解放済みのタブが閉じられてしまった時に復元する。
*/
function RestoreTabs()
{
  chrome.storage.local.get(backupKey, function(storages) {
    var backup = storages[backupKey];
    if (getType(backup) == 'string' && backup != '{}') {
      Restore(JSON.parse(backup));
    }
  });
}

function UpdateBackup()
{
  chrome.storage.local.get(default_values, function(storages) {
    var storageName = 'release_page_radio';
    var release_page = storages[storageName] !== undefined ?
                       storages[storageName] :
                       default_values[storageName];
    if (release_page == 'normal') {
      SetBackup();
    } else {
      chrome.storage.local.remove(backupKey);
    }
  });
}

function SetBackup()
{
  var save = new Object();
  save[backupKey] = JSON.stringify(unloaded);
  chrome.storage.local.set(save);
}


/**
 * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
 * 保存データには変更したアイコンファイルを表す文字列が入る。
 * この値はハッシュ変数(icons)のキー名でもある。
 * @param {Tab} tab 対象のタブ.
 */
function ReloadBrowserIcon(tab)
{
  if (getType(tab) != 'object') {
    throw new Error("Invalid argument. tab isn't object.");
  }

  CheckExcludeList(tab.url, function(change_icon) {
    chrome.browserAction.setIcon(
        { path: icons[change_icon], tabId: tab.id }, function() {
          var save = new Object();
          save['purgeIcon'] = change_icon;
          chrome.storage.local.set(save);
        }
    );
  });
}


/**
* 非解放・非解放解除を交互に行う
* @param {Tab} tab 対象のタブオブジェクト.
*/
function TempReleaseToggle(tab)
{
  if (getType(tab) != 'object') {
    throw new Error("Invalid argument. tab isn't object.");
  }

  var index = tempRelease.indexOf(tab.url);
  if (index == -1) {
    // push url in tempRelease.
    tempRelease.push(tab.url);
  } else {
    // remove url in tempRelease.
    tempRelease.splice(index, 1);
  }
  ReloadBrowserIcon(tab);
  UnloadTimeProlong(tab.id);
}


/**
* 指定されたタブに最も近い未解放のタブをアクティブにする。
* 右側から探索され、見つからなかったら左側を探索する。
* 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
* @param {Tab} tab 基準点となるタブ.
*/
function SearchUnloadedTabNearPosition(tab)
{
  if (getType(tab) != 'object') {
    throw new Error("Invalid argument. tab isn't object.");
  }

  // 現在のタブの左右の未解放のタブを選択する
  chrome.windows.get(tab.windowId, { populate: true }, function(win) {
    // Search current tab position.
    var i = 0;
    while (i < win.tabs.length && win.tabs[i].id != tab.id) {
      i++;
    }

    // Search right than current tab.
    var j = i + 1;
    while (j < win.tabs.length && unloaded[win.tabs[j].id] != undefined) {
      j++;
    }

    // Search the left if can't find.
    if (j >= win.tabs.length) {
      var j = i - 1;
      while (0 <= j && unloaded[win.tabs[j].id] != undefined) {
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
 * 初期化.
 */
function Initialize()
{
  chrome.windows.getAll({ populate: true }, function(wins) {
    for (var i = 0; i < wins.length; i++) {
      for (var j = 0; j < wins[i].tabs.length; j++) {
        var tab = wins[i].tabs[j];
        setTick(tab.id);
      }
    }
  });
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.storage.local.get(default_values, function(storages) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
      // アイコンの状態を変更
      ReloadBrowserIcon(tab);

      // 前にアクティブにされていたタブのアンロード時間を更新
      if (!oldActiveIds.isEmpty(tab.windowId)) {
        UnloadTimeProlong(oldActiveIds.lastPrevious(tab.windowId));
      }
      oldActiveIds.push({ windowId: tab.windowId, tabId: activeInfo.tabId });

      if (getType(unloaded[activeInfo.tabId]) == 'object') {
        var storageName = 'no_release_checkbox';
        var no_release = storages[storageName] !== undefined ?
                         storages[storageName] :
                         default_values[storageName];
        if (no_release == false) {
          // アクティブにしたタブがアンロード済みだった場合、再読込
          // 解放ページ側の処理と二重処理になるが、
          // どちらかが先に実行されるので問題なし。
          UnPurge(activeInfo.tabId);
        } else {
          delete unloaded[activeInfo.tabId];
        }
      }
    });
  });
});

chrome.tabs.onCreated.addListener(function(tab) {
  setTick(tab.id);
});

chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
  setTick(tabId);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete unloaded[tabId];
  deleteTick(tabId);

  UpdateBackup();
});

chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  delete unloaded[tabId];
  deleteTick(tabId);

  UpdateBackup();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete') {
    ReloadBrowserIcon(tab);

    // 解放解除時に動作。
    // 指定したタブの解放時のスクロール量があった場合、それを復元する
    var scrollPos = tempScrollPositions[tab.id];
    if (getType(scrollPos) == 'object') {
      chrome.tabs.executeScript(
          tabId, { code: 'scroll(' + scrollPos.x + ', ' + scrollPos.y + ');' },
          function() {
            delete tempScrollPositions[tab.id];
          }
      );
    }
  }
});

chrome.windows.onRemoved.addListener(function(windowId) {
  oldActiveIds.remove({ windowId: windowId });
  if (oldActiveIds.length <= 0) {
    chrome.storage.local.remove(backupKey);
  }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.event) {
    case 'initialize':
      Initialize();
      break;
    case 'release':
      chrome.tabs.getSelected(function(tab) {
        PurgeToggle(tab.id);
        SearchUnloadedTabNearPosition(tab);
      });
      break;
    case 'non_release':
      chrome.tabs.getSelected(function(tab) {
        TempReleaseToggle(tab);
      });
      break;
    case 'all_unpurge':
      AllUnPurge();
      break;
    case 'restore':
      RestoreTabs();
      break;
  }
});

Initialize();

// All show storage
/* chrome.storage.local.get(null, function(storages) {
  for (var key in storages) {
    console.log(key);
    console.log(storages[key]);
  }
}); */
