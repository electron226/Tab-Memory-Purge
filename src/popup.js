/*jshint globalstrict: true*/
"use strict";

function changeNotReleaseText()
{
  var storageName = 'purgeIcon';
  chrome.storage.local.get(storageName, function(storages) {
    var el = document.querySelector('.not_releaseText');
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
      var el = document.querySelector('.release_extension_menu');
      el.style.display = 'block';
    }

    // イベント追加
    document.querySelector('#release').addEventListener(
      'click', function() {
        sendEMes('release');
      }
    );
    document.querySelector('#not_release').addEventListener(
      'click', function() {
        sendEMes('switch_not_release', function() {
          changeNotReleaseText();
        });
      }
    );
    document.querySelector('#all_purge').addEventListener(
      'click', function() {
        sendEMes('all_purge');
      }
    );
    document.querySelector('#all_purge_without_exclude_list').addEventListener(
      'click', function() {
        sendEMes('all_purge_without_exclude_list');
      }
    );
    document.querySelector('#all_unpurge').addEventListener(
      'click', function() {
        sendEMes('all_unpurge');
      }
    );
    document.querySelector('#restore').addEventListener(
      'click', function() {
        sendEMes('restore');
      }
    );
  });
});
