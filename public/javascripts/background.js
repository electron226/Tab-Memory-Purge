/* background.htmlで読み込み時に実行するスクリプト */


/**
* この拡張機能外のスクリプトを使って行う初期化処理
*/
function Init()
{
  // オプション(強制終了された場合、起動時に以前の解放されたタブを復元)
  var storageName = 'forcibly_close_restore_checkbox';
  chrome.storage.local.get(storageName, function(storages) {
    // 前回、正常にウインドウが閉じられていなかった場合、
    // 以前の解放済タブの情報が残っていたら復元
    if (storages[storageName] || localStorage[storageName] == 'true') {
      RestoreTabs();
    }
  });
}


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

  // 1.6.10以下のバージョンから1.7.0以上のバージョンに更新した際に、
  // 保存名が変更になったオプションの項目を移行させる
  function SwitchOptions(oldkey, newkey)
  {
    if (localStorage[oldkey] != undefined || localStorage[oldkey] != null) {
      var save = new Object();
      save[newkey] = localStorage[oldkey];
      chrome.storage.local.set(save);

      localStorage.removeItem(oldkey);
      console.log('Option name changed.', oldkey + ' to ' + newkey);
      return true;
    }
    return false;
  }
  SwitchOptions('release_page', 'release_page_radio');
  SwitchOptions('release_url', 'release_url_text');
  SwitchOptions('assignment_title', 'assignment_title_checkbox');
  SwitchOptions('assignment_favicon', 'assignment_favicon_checkbox');
  SwitchOptions('timer', 'timer_number');

  UpdateExcludeUrl(UpdateRegexOption(UpdateEnableHttps(UpdateCloseRestore())));
  function UpdateExcludeUrl(callback)
  {
    var eUrlName = 'exclude_url_textarea';
    if (SwitchOptions('exclude_url', eUrlName)) {
      // exclude_urlのリストと新しいデフォルトのリストを比較して、
      // 足りない分は自動的に追加する
      chrome.storage.local.get(eUrlName, function(storages) {
        var current = storages[eUrlName] ?
                      storages[eUrlName] : '';
        var cSplit = current.split('\n');
        var dSplit = default_values[eUrlName].split('\n');
        var data = [];
        for (var i = 0; i < cSplit.length; i++) {
          if (dSplit.indexOf(cSplit[i]) == -1) {
            data.push(cSplit[i]);
          }
        }
        var result = dSplit.concat(data);

        var save = new Object();
        save[eUrlName] = result.join('\n');
        chrome.storage.local.set(save);
        if (getType(callback) == 'function') {
          callback();
        }
      });
    } else {
      if (getType(callback) == 'function') {
        callback();
      }
    }
  }
  function UpdateRegexOption(callback)
  {
    var regOptName = 'regex_option_text';
    if (SwitchOptions('regex_option', regOptName)) {
      chrome.storage.local.get(regOptName, function(storages) {
        var value = storages[regOptName];
        var saveStorageName = 'regex_insensitive_checkbox';
        var save = new Object();
        var i = value.indexOf('i');
        if (i != -1) {
          save[saveStorageName] = true;
        } else {
          save[saveStorageName] = false;
        }
        chrome.storage.local.set(save);
        localStorage.removeItem(regOptName);
        if (getType(callback) == 'function') {
          callback();
        }
      });
    } else {
      if (getType(callback) == 'function') {
        callback();
      }
    }
  }
  function UpdateEnableHttps(callback)
  {
    var eUrlName = 'exclude_url_textarea';
    var httpsStorageName = 'non_release_https_checkbox';
    if (SwitchOptions('non_release_https', httpsStorageName)) {
      chrome.storage.local.get([httpsStorageName, eUrlName],
          function(storages) {
            var non_release = storages[httpsStorageName] ?
                              storages[httpsStorageName] :
                              default_values[httpsStorageName];
            var exclude = storages[eUrlName] ?
                          storages[eUrlName] : '';
            if (non_release == 'true' && exclude.indexOf('^https:') == -1) {
              var save = new Object();
              save[eUrlName] = '^https://\n'.concat(exclude);
              chrome.storage.local.set(save);
            }
            localStorage.removeItem(httpsStorageName);
            if (getType(callback) == 'function') {
              callback();
            }
          }
      );
    } else {
      if (getType(callback) == 'function') {
        callback();
      }
    }
  }
  function UpdateCloseRestore(callback)
  {
    var closeRestoreName = 'forcibly_close_restore_checkbox';
    if (SwitchOptions('forcibly_close_restore', closeRestoreName)) {
      chrome.storage.local.get(closeRestoreName, function(storages) {
        // オプション(強制終了された場合、起動時に以前の解放されたタブを復元)
        // が無効の時、アップデートした際に閉じられてしまったタブの復元。
        // Init()ではtrueの場合でのみ作動させているため、
        // 起動しなかった場合に再度起動させる。
        if (storages[closeRestoreName] == false ||
            localStorage[closeRestoreName] == 'false') {
          RestoreTabs();
        }
        if (getType(callback) == 'function') {
          callback();
        }
      });
    } else {
      if (getType(callback) == 'function') {
        callback();
      }
    }
  }
}


/**
 * 拡張機能のバージョンを返す
 * @return {String} 拡張機能のバージョン.
 */
function getVersion() {
  var details = chrome.app.getDetails();
  return details.version;
}

document.addEventListener('DOMContentLoaded', function() {
  // この拡張機能外のスクリプトを使って行う初期化処理
  Init();

  // この拡張機能のバージョンチェック
  var currVersion = getVersion();
  chrome.storage.local.get('version', function(storages) {
    // ver chrome.storage.
    if (storages['version'] != undefined) {
      var prevVersion = storages['version'];
      if (currVersion != prevVersion) {
        // この拡張機能でインストールしたかどうか
        if (typeof prevVersion == 'undefined') {
          onInstall();
        } else {
          onUpdate();
        }
        chrome.storage.local.set({ 'version': currVersion });
      }
    } else { // ver localStorage.
      var prevVersion = localStorage['version'];
      if (currVersion != prevVersion) {
        // この拡張機能でインストールしたかどうか
        if (typeof prevVersion == 'undefined') {
          onInstall();
        } else {
          onUpdate();
        }
        localStorage['version'] = currVersion;
      }
    }
  });
});
