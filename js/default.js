// 時間設定がない場合に入力するデフォルト値
var default_timer = 20;

// 除外アドレス設定がない場合に入力するデフォルト値
var default_exclude_url = 'nicovideo.jp\n'
                        + 'youtube.com';

// Chromeの設定ページなどは変更不可にし、除外させる
var chrome_exclude_url = '^chrome(:|-)\n'
                       + '^view-source:\n'
                       + '^https:';
