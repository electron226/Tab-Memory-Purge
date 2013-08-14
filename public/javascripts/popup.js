var locale_i18n = [
  'restore', 'release', 'non_release', 'remove_non_release', 'all_unpurge'
];

function ChangeNonReleaseText()
{
  var storageName = 'purgeIcon';
  chrome.storage.local.get(storageName, function(storages) {
    var el = document.querySelector('.non_releaseText');
    console.log(storages[storageName], toType(storages[storageName]));
    var message = '';
    switch (storages[storageName]) {
      case TEMP_EXCLUDE: // temp release
        // non_release
        message = chrome.i18n.getMessage(locale_i18n[3]);
        break;
      default:
        // remove_non_release
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

function OnNonRelease()
{
  chrome.runtime.sendMessage({ event: 'non_release'}, function(reponse) {
    ChangeNonReleaseText();
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

function TextInitialize()
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

  ChangeNonReleaseText();
}

document.addEventListener('DOMContentLoaded', function() {
  var storageName = 'release_page_radio';
  chrome.storage.local.get(storageName, function(storages) {
    // 文字列初期化
    TextInitialize();

    // 「解放に使うページを指定」設定で、「拡張機能内」を選択しているときに、
    // 専用メニューを表示。
    if (storages[storageName] === 'normal') {
      var el = document.querySelector('.release_extension_menu');
      el.style.display = 'block';
    }

    // イベント追加
    document.querySelector('#release').addEventListener('click', OnRelease);
    document.querySelector('#non_release').addEventListener(
        'click', OnNonRelease);
    document.querySelector('#all_unpurge').addEventListener(
        'click', OnAllUnPurge);
    document.querySelector('#restore').addEventListener('click', OnRestore);
  });
});
