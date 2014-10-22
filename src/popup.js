(function() {
  "use strict";

  function changeNotReleaseText()
  {
    var storageName = 'purgeIcon';
    chrome.storage.local.get(storageName, function(storages) {
      var el = document.getElementsByClassName('not_releaseText')[0];
      var message = '';
      switch (storages[storageName]) {
        case TEMP_EXCLUDE: // temp release
          // not_release
          message = chrome.i18n.getMessage('remove_not_release');
          break;
        default:
          // remove_not_release
          message = chrome.i18n.getMessage('not_release');
          break;
      }
      el.innerHTML = message;
    });
  }

  function sendEMes(event_mes, callback)
  {
    chrome.runtime.sendMessage({ event: event_mes }, callback);
  }

  document.addEventListener('DOMContentLoaded', function() {
    var storageName = 'release_page';
    chrome.storage.local.get(storageName, function(storages) {
      initTranslations(document, translation_path, 'Text');
      changeNotReleaseText();

      // 「解放に使うページを指定」設定で、「拡張機能内」を選択しているときに、
      // 専用メニューを表示。
      if (storages[storageName] === 'normal') {
        var el = document.getElementsByClassName('release_extension_menu')[0];
        el.style.display = 'block';
      }

      // イベント追加
      document.getElementById('release').addEventListener(
        'click', function() {
          sendEMes('release');
        }
      );
      document.getElementById('not_release').addEventListener(
        'click', function() {
          window.close();
          sendEMes('switch_not_release', function() {
            changeNotReleaseText();
          });
        }
      );
      document.getElementById('all_purge').addEventListener(
        'click', function() {
          sendEMes('all_purge');
        }
      );
      document.getElementById(
        'all_purge_without_exclude_list').addEventListener('click', function() {
          sendEMes('all_purge_without_exclude_list');
        }
      );
      document.getElementById('all_unpurge').addEventListener(
        'click', function() {
          sendEMes('all_unpurge');
        }
      );
      document.getElementById('restore').addEventListener(
        'click', function() {
          sendEMes('restore');
        }
      );
    });
  });
})(document);
