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

function OnRelease()
{
  chrome.runtime.sendMessage({ event: 'release'});
}

function OnSwitchNotRelease()
{
  chrome.runtime.sendMessage({ event: 'switch_not_release'}, function() {
    changeNotReleaseText();
  });
}

function OnAllUnPurge()
{
  chrome.runtime.sendMessage({ event: 'all_unpurge'});
}

function OnRestore()
{
  chrome.runtime.sendMessage({ event: 'restore'});
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
    document.querySelector('#release').addEventListener('click', OnRelease);
    document.querySelector('#not_release').addEventListener(
        'click', OnSwitchNotRelease);
    document.querySelector('#all_unpurge').addEventListener(
        'click', OnAllUnPurge);
    document.querySelector('#restore').addEventListener('click', OnRestore);
  });
});
