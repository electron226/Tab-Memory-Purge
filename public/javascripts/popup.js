/*jshint globalstrict: true*/
"use strict";

var locale_i18n = [
  'restore', 'release', 'not_release', 'remove_not_release', 'all_unpurge'
];

function changeNotReleaseText()
{
  var storageName = 'purgeIcon';
  chrome.storage.local.get(storageName, function(storages) {
    var el = document.querySelector('.not_releaseText');
    var message = '';
    switch (storages[storageName]) {
      case TEMP_EXCLUDE: // temp release
        // not_release
        message = chrome.i18n.getMessage(locale_i18n[3]);
        break;
      default:
        // remove_not_release
        message = chrome.i18n.getMessage(locale_i18n[2]);
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

function initialize()
{
  // テキストの設定
  for (var i = 0; i < locale_i18n.length; i++) {
    var el = document.getElementsByClassName(locale_i18n[i] + 'Text');
    var message = chrome.i18n.getMessage(locale_i18n[i]);
    for (var j = 0; j < el.length; j++) {
      var string = el[j].innerHTML;
      var index = string.lastIndexOf('</');
      el[j].innerHTML = string.substring(0, index) +
                            message + string.substring(index);
    }
  }

  changeNotReleaseText();
}

document.addEventListener('DOMContentLoaded', function() {
  var storageName = 'release_page_radio';
  chrome.storage.local.get(storageName, function(storages) {
    // 文字列初期化
    initialize();

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
