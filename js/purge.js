/** 空ページへのアドレス */
var blank_page = chrome.extension.getURL('blank.html');

/**
 * tabIdごとのsetIntervalのid
 * key = tabId
 * value = setIntervalのid
 */
var ticked = new Object();

/**
 * メモリ解放を行ったタブの情報が入ってる辞書型の配列
 *
 * id: tabId
 * index: タブが挿入されている位置
 * url: 解放前のURL
 * purgeurl: 休止ページのURL
 */
var unloaded = new Array(); 

/**
* アクティブなタブを選択する前に選択していたタブのID
*/
var old_activeId = null;

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
            /* console.log('Purge', tabId);   */
            unloaded.push({ id:       updated.id,
                            index:    updated.index,
                            url:      tab.url,
                            purgeurl: url });
            deleteTick(tabId);
            localStorage['backup'] = JSON.stringify(unloaded);
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
    var url = FindUnloaded('id', tabId)['url'];
    chrome.tabs.update(tabId, { url: url }, function(updated) {
        /* console.log('UnPurge', tabId); */
        DeleteUnloaded('id', tabId);
        setTick(tabId);
        localStorage['backup'] = JSON.stringify(unloaded);
    });
}

/**
* 定期的に実行される関数。アンロードするかどうかを判断。
* @param {Number} tabId 処理を行うタブのID
* @return なし
*/
function tick(tabId)
{
    if (FindUnloaded('id', tabId) == null) {
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
        exclude = exclude == '' ? chrome_exclude_url
                                : chrome_exclude_url + '\n'
                                + exclude;
        var exclude_array = exclude.split('\n');
        //console.log(exclude_array);
        for (var i = 0; i < exclude_array.length; i++) {
            var re = new RegExp(exclude_array[i]);
            if (tab.url.match(re)) {
                //console.log(exclude_array[i]);
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
* 指定した辞書型の配列を再帰処理し、タブを復元する。
*
* なお、配列の中の辞書型には下記の要素が必要。
* id: tabId
* index: タブが挿入されている位置
* url: 解放前のURL
* purgeurl: 休止ページのURL
*
* @param {Array} array 辞書型の配列。基本的にunloaded変数を渡す。
* @param {Number} [index = 0] 配列の再帰処理開始位置
* @param {Number} [end = array.length] 配列の最後の要素から一つ後の位置
* @return 
*/
function Restore(array, index, end)
{
    // 最後まで処理を行ったらunloadedに上書き
    if (index >= end) {
        unloaded = array;
        return;
    }

    // 初期値
    if (index === undefined || index === null) {
        index = 0;
    }
    if (end === undefined || end === null) {
        end = array.length;
    }

    chrome.tabs.get(array[index]['id'], function(tab) {
        if (tab === undefined) {
            // タブが存在しない場合、新規作成
            var purgeurl = array[index]['purgeurl'];
            var rIndex = array[index]['index'];
            chrome.tabs.create({ url: purgeurl, index: rIndex, active: false },
                               function(tab) {
                array[index]['id'] = tab.id;

                Restore(array, ++index, end);
            });
        }
    });
}

/**
* 解放済みのタブを復元する。
* アップデートなどで解放済みのタブが閉じられてしまった時に復元する。
* @return なし
*/
function RestoreTabs()
{
    var backup = localStorage['backup'];
    if (backup) {
        backup = JSON.parse(backup);
        Restore(backup);
    }
}

/**
* メモリ解放を行ったタブを保存しているunloaded変数を検索する
* @param  {String} key 検索する要素が持っているキー名
* @param  {Any} value 検索するunloaded[key]kの値
* @return {Object|Number} 成功なら指定したキーの位置の辞書型を返す。
*                         見つからなかったらNULL。
*/
function FindUnloaded(key, value)
{
    for (var i = 0; i < unloaded.length; i++) {
        if (unloaded[i][key] == value) {
            return unloaded[i];
        }
    }

    return null;
}

/**
* メモリ解放を行ったタブを保存しているunloaded変数を検索する
* @param  {String} key 検索する要素が持っているキー名
* @param  {Any} value 検索するunloaded[key]の値
* @return {Number} 成功ならunloaded変数のindex位置を返す。
*                  見つからなかったらNULL。
*/
function FindUnloadedIndex(key, value)
{
    for (var i = 0; i < unloaded.length; i++) {
        if (unloaded[i][key] == value) {
            return i;
        }
    }

    return null;
}

/**
* メモリ解放を行ったタブを保存しているunloaded変数の要素を削除
* @param  {String} key 削除する要素が持っているキー名
* @param  {Any} value 削除する要素のunloaded[key]の値
* @return なし
*/
function DeleteUnloaded(key, value)
{
    var index = FindUnloadedIndex(key, value);
    if (index != null) {
        unloaded.splice(index, 1);
    }
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

/**
* アンロード時間の延長
* @param {Number} tabId 延長するタブのID
* @return なし
*/
function UnloadTimeProlong(tabId)
{
    deleteTick(tabId);
    setTick(tabId);
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
    // 前にアクティブにされていたタブのアンロード時間を更新
    if (old_activeId) {
        UnloadTimeProlong(old_activeId);
    }
    old_activeId = activeInfo.tabId;

    if (FindUnloaded('id', activeInfo.tabId) != null) {
        // アクティブにしたタブがアンロード済みだった場合、再読込
        UnPurge(activeInfo.tabId);
    } else {
        // アクティブにしたタブのアンロード時間更新
        UnloadTimeProlong(activeInfo.tabId);
    }
});

chrome.tabs.onCreated.addListener(function(tab) {
    setTick(tab.id);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    DeleteUnloaded('id', tabId);
    deleteTick(tabId);
});

chrome.windows.onRemoved.addListener(function(windowId) {
    localStorage.removeItem('backup');
});

chrome.browserAction.onClicked.addListener(function(tab) {
    if (FindUnloaded('id', tab.id) != null) {
        UnPurge(tab.id);
    } else {
        Purge(tab.id);
    }
});

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        switch (request.event) {
            case 'init':
                Initialized();
                break;
        }
});
