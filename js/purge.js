/** 空ページへのアドレス */
var blank_page = chrome.extension.getURL('blank.html');

/**
 * tabIdごとのsetIntervalのid
 * key = tabId
 * value = setIntervalのid
 */
ticked = new Object();

/**
 * メモリ解放を行ったタブ
 * key = tabId
 * value = 解放前のURL
 */
unloaded = new Object();

/**
* タブの解放を行います。
* @param {Number} tabId タブのID
* @return なし
*/
function Purge(tabId)
{
    chrome.tabs.get(tabId, function(tab) {
        var args = new String();
        if (tab.title) {
            args += '&title=' + encodeURIComponent(tab.title);
        }
        if (tab.favIconUrl) {
            args += '&favicon=' + encodeURIComponent(tab.favIconUrl);
        }
        if (tab.url) {
            args += '&url=' + encodeURIComponent(tab.url);
        }

        var url = blank_page + '?' + args;

        chrome.tabs.update(tabId, { url: url }, function(updated) {
            unloaded[ updated.id ] = tab.url;
            deleteTick(tabId);
        });
    });
}

/**
* 解放したタブを復元します
* @param {Number} tabId 復元するタブのID
* @return なし
*/
function UnPurge(tabId)
{
    chrome.tabs.update(tabId, { url: unloaded[tabId] }, function(updated) {
        delete unloaded[tabId];
        setTick(tabId);
    });
}

/**
* 定期的に実行される関数。アンロードするかどうかを判断。
* @param {Number} tabId 処理を行うタブのID
* @return なし
*/
function tick(tabId)
{
    if (FindHash(tabId, unloaded) == null) {
        chrome.tabs.get(tabId, function(tab) {
            // アクティブタブへの処理の場合、行わない
            if (tab.active == false) {
                Purge(tabId);
            }
        });
    }
}

/**
* 定期的に解放処理の判断が行われるよう設定します。
* @param {Number} tabId 設定するタブのID
* @return なし
*/
function setTick(tabId)
{
    chrome.tabs.get(tabId, function(tab) {
        // 除外ドメインと比較
        var flag = true;
        var exclude = localStorage['exclude_url'] ?
                      localStorage['exclude_url'] : default_exclude_url;
        exclude = chrome_exclude_url + exclude; // chromeのページを除外に追加
        var exclude_array = exclude.split('\n');
        for (var i = 0; i < exclude_array.length; i++) {
            var re = new RegExp(exclude_array[i]);
            if (tab.url.match(re)) {
                flag = false; // 実行しない
                break;
            }
        }

        if (flag) {
            var timer = localStorage['timer'] ?
                        localStorage['timer'] : default_timer;
            timer = timer * 60 * 1000; // 分(設定) * 秒数 * ミリ秒

            ticked[tabId] = setInterval(function() { tick(tabId); } , timer);
        }
    });
}

/**
* 定期的な処理を停止
* @param {Number} tabId 停止するタブのID
* @return なし
*/
function deleteTick(tabId)
{
    clearInterval(ticked[tabId]);
    delete ticked[tabId];
}

/**
* 初期化。全てのタブに対し、定期処理の設定を行う。
* @return なし 
*/
function Initialized()
{
    for (var key in ticked) {
        clearInterval(ticked[key]);
    }
    ticked = new Object();

    chrome.windows.getAll({ populate: true }, function(wins) {
        for (var i = 0; i < wins.length; i++) {
            for (var j = 0; j < wins[i].tabs.length; j++) {
                setTick(wins[i].tabs[j].id);
            }
        }
    });
}

/**
* 指定した連想配列のキーのindexを返す
* @param search_key キー名
* @param hash 検索する連想配列
* @return 成功なら連想配列でのindexを、失敗ならnullを返す
*/
function FindHash(search_key, hash)
{
    var i = 0;
    for (var key in hash) {
        if (search_key == key) {
            return i;
        }
        i++;
    }

    return null;
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
    if (FindHash(activeInfo.tabId, unloaded) != null) {
        // アクティブにしたタブがアンロード済みだった場合、再読込
        UnPurge(activeInfo.tabId);
    } else {
        // アクティブにしたタブのアンロード時間更新
        deleteTick(activeInfo.tabId);
        setTick(activeInfo.tabId);
    }
});

chrome.tabs.onCreated.addListener(function(tab) {
    setTick(tab.id);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    delete unloaded[tabId];
    deleteTick(tabId);
});

chrome.browserAction.onClicked.addListener(function(tab) {
    if (FindHash(tab.id, unloaded) != null) {
        UnPurge(tab.id);
    } else {
        Purge(tab.id);
    }
});

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
    if (request.event == 'init') {
        Initialized();
    }
});
