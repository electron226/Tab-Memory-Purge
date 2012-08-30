var default_release_page = 'default';
var default_release_url = '';
var default_release_author_url = 'https://tabmemorypurge.appspot.com/blank.html';

// 時間設定がない場合に入力するデフォルト値
var default_timer = 20;

// 除外アドレス設定がない場合に入力するデフォルト値
var default_exclude_url = 'nicovideo.jp\n'
                        + 'youtube.com';

// Chromeの設定ページなどは変更不可にし、除外させる
var chrome_exclude_url = '^chrome[:|-]\n'
                         + '^view-source:\n'
                         + '^https:';

// どの除外リストかと表す値
var CHROME_EXCLUDE = 50001;
var USE_EXCLUDE = 50002;
var TEMP_EXCLUDE = 50003;

// 空ページのアドレス
var blank_page = chrome.extension.getURL('blank.html');

// アイコンのアドレス
var icons = {
    normal         : chrome.extension.getURL('icon/icon_019.png'),
    chrome_exclude : chrome.extension.getURL('icon/icon_019_chrome_exclude.png'),
    use_exclude    : chrome.extension.getURL('icon/icon_019_use_exclude.png'),
    temp_exclude   : chrome.extension.getURL('icon/icon_019_temp_exclude.png'),
};
