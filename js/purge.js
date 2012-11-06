/** 拡張機能 動作部分本体 */

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
 * url: 解放前のURL
 * purgeurl: 休止ページのURL
 * scrollPosition: スクロール量(x, y)を表すオブジェクト
 */
var unloaded = new Array(); 

/** アクティブなタブを選択する前に選択していたタブのID */
var old_activeId = null;

/** タブの解放を解除したタブのスクロール量(x, y)を一時的に保存する連想配列 */
var tempScrollPositions = {};

/**
* タブの解放を行います。
* @param {Number} tabId タブのID
* @return なし
*/
function Purge(tabId)
{
    chrome.tabs.get(tabId, function(tab) {
        // objScroll = タブのスクロール量(x, y)
        chrome.tabs.executeScript(tabId, { file: 'js/getScrollPosition.js' },
                          function(objScroll) {
            var args = new String();

            // 共通要素
            var title = "";
            if (tab.title) {
                title = '&title=' + encodeURIComponent(tab.title);
            }

            var favicon = "";
            if (tab.favIconUrl) {
                favicon = '&favicon=' + encodeURIComponent(tab.favIconUrl);
            }

            // 解放に使うページを設定
            var page = blank_page;
            var release_page = GetStorage('release_page', default_release_page);
            switch (release_page) {
                case 'author': // 作者サイト
                    page = default_release_author_url;
                case 'normal': // 拡張機能内
                    args += title + favicon;
                    break;
                case 'assignment': // 指定URL
                    var release_url = GetStorage(
                        'release_url', default_release_url);
                    if (release_url != '') {
                        page = release_url;
                    }

                    if (GetStorage('assignment_title', 'true') == 'true') {
                        args += title;
                    }
                    if (GetStorage('assignment_favicon', 'true') == 'true') {
                        args += favicon;
                    }
                    break;
                default: // 該当なしの時は初期値を設定
                    console.log("'release page' setting error."
                                + " so to set default value.");
                    localStorage['release_page'] = default_release_page;
                    Purge(tabId); // この関数を実行し直す
                    break;
            }

            if (tab.url) {
                args += '&url=' + encodeURIComponent(tab.url);
            }
            var url = page + '?' + args;   

            chrome.tabs.update(tabId, { 'url': url }, function(updated) {
                /* console.log('Purge', tabId);   */
                unloaded.push({ id:       updated.id,
                                url:      tab.url,
                                purgeurl: url, 
                                scrollPosition: objScroll[0],
                                });
                deleteTick(tabId);
                SetBackup(JSON.stringify(unloaded));
            });
        });
    });
}

/**
* 解放したタブを復元します。
* 引数urlが指定されていた場合、unloadedに該当するタブが
* 解放されているかどうかに関わらず、解放処理が行われる。
* @param {Number} tabId 復元するタブのID
* @return なし
*/
function UnPurge(tabId)
{
    var url = FindUnloaded('id', tabId)['url']; 
    chrome.tabs.update(tabId, { url: url }, function(updated) { 
        /* console.log('UnPurge', tabId); */

        // スクロール位置を解放前の位置に戻す
        tempScrollPositions[tabId] = FindUnloaded('id', tabId)['scrollPosition'];

        DeleteUnloaded('id', tabId);
        setTick(tabId);
        SetBackup(JSON.stringify(unloaded));
    }); 
}

/**
* 解放状態・解放解除を交互に行う
* @param {Number} tabId 対象のタブのID
* @return なし
*/
function PurgeToggle(tabId)
{
    if (FindUnloaded('id', tabId) != null) {
        UnPurge(tabId);
    } else {
        Purge(tabId);
    }
}

/**
* 指定した除外リストの正規表現に指定したアドレスがマッチするか調べる
* @param {String} exclude 除外リストの値。複数のものは\nで区切る
* @param {String} url マッチするか調べるアドレス
* @return {Boolean} マッチしたらTRUE, しなかったらFALSE
*/
function CheckMatchUrlString(exclude, url)
{
    var exclude_array = exclude.split("\n");
    /* console.log(array); */
    for (var i = 0; i < exclude_array.length; i++) {
        if (exclude_array[i] != '') {
            var re = new RegExp(exclude_array[i]);
            if (url.match(re)) {
                /* console.log(url);    */
                return true;
            }
        }
    }
    return false;
}

/**
* 与えられたURLが全ての除外リストに一致するか検索する。
* @param url
* @return {Integer} どのリストと一致したかを数値で返す。
*                   CHROME_EXCLUDE = 拡張機能側で固定されている除外アドレス
*                   USE_EXCLUDE    = 通常のユーザが変更できる除外アドレス
*                   TEMP_EXCLUDE   = 一時的な非解放リスト
*                   null           = 一致しなかった。
*/
function CheckExcludeList(url)
{
    // 拡張側で最初から除外されている固定除外アドレスと比較
    if (CheckMatchUrlString(chrome_exclude_url, url)) {
        /* console.log('CHROME_EXCLUDE') */
        return CHROME_EXCLUDE;
    }
    
    // 除外アドレスでその他の「HTTPSのページでは解放しない」の設定を反映させる
    var normal_excludes = GetStorage('exclude_url', default_exclude_url);
    if (GetStorage('non_release_https', default_non_release_https) == 'true') {
        /* console.log('Add to exclude url string to exclude HTTPS.'); */
        normal_excludes += '\n' + '^https:';
        /* console.log('**normal_excludes**');
        console.log(normal_excludes); */
    }

    // 除外アドレスと比較
    if (CheckMatchUrlString(normal_excludes, url)) {
        /* console.log('USE_EXCLUDE') */
        return USE_EXCLUDE;
    }

    // 一時的な非解放リストと比較
    var search_obj = SearchNonRelease(url);
    if (search_obj['begin'] !== null) {
        /* console.log('TEMP_EXCLUDE') */
        return TEMP_EXCLUDE;
    }

    /* console.log("null"); */
    return null;
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
        // 全ての除外アドレス一覧と比較
        if (!CheckExcludeList(tab.url)) {
            // 除外アドレスに含まれていない場合
            var timer = GetStorage('timer', default_timer);
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
* 初期化。
* @return なし 
*/
function Initialize()
{
    // 一時解放用のストレージをクリア
    RemoveNonRelease();

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
* 解放されている全てのタブを解放解除
* @return なし
*/
function AllUnPurge()
{
    // 一度IDをコピー
    var purgeIds = new Array();
    for (var i = 0; i < unloaded.length; i++) {
        purgeIds.push(unloaded[i]['id']);
    }

    // コピーしたIDを元に解放処理
    for (var i = 0; i < purgeIds.length; i++) {
        UnPurge(purgeIds[i]);
    }
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
* @return なし
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
            chrome.tabs.create({ url: purgeurl, active: false },
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
    var backup = GetBackup();
    if (backup) {
        Restore(JSON.parse(backup));
    }
}

/**
* バックアップデータ取得
* @return {Array | undefined} 連想配列の配列、存在しなければundefined
*/
function GetBackup()
{
    return localStorage['backup'];
}

/**
* バックアップデータ保存
* @param {Array} value 連想配列の配列
*/
function SetBackup(value)
{
    localStorage['backup'] = value;
}

/**
* バックアップデータ削除
*/
function RemoveBackup()
{
    localStorage.removeItem('backup');
}

/**
* メモリ解放を行ったタブを保存しているunloaded変数を検索する
* @param  {String} key 検索する要素が持っているキー名
* @param  {Any} value 検索するunloaded[key]の値
* @return {Object|Number} 成功なら指定したキーの位置の辞書型を返す。
*                         見つからなかったらnull。
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
*                  見つからなかったらnull。
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

/**
 * 指定したタブの状態に合わせ、ブラウザアクションのアイコンを変更する。
 * localStorage['purgeIcon']には変更したアイコンファイルを表す文字列が入る。
 * この値はハッシュ変数(icons)のキー名でもある。
 * @param {Tab} 対象のタブ
 * @return なし
 */
function ReloadBrowserIcon(tab)
{
    switch (CheckExcludeList(tab.url)) {
        case CHROME_EXCLUDE:
            var change_icon = 'chrome_exclude';
            break;
        case USE_EXCLUDE:
            var change_icon = 'use_exclude';
            break;
        case TEMP_EXCLUDE:
            var change_icon = 'temp_exclude';
            break;
        default:
            var change_icon = 'normal';
            break;
    }

    chrome.browserAction.setIcon({ path: icons[change_icon], tabId: tab.id });
        localStorage['purgeIcon'] = change_icon;
}

/**
* 非解放・非解放解除を交互に行う
* @param {Tab} tab 対象のタブオブジェクト
*/
function NonReleaseToggle(tab)
{
    var search_obj = SearchNonRelease(tab.url);
    if (search_obj['begin'] === null) {
        AddNonRelease(tab.url);
    } else {
        RemoveNonRelease(tab.url);
    }
    ReloadBrowserIcon(tab);

    UnloadTimeProlong(tab.id);
}

/**
* 非解放リストの取得。
* 解放リストのURLは'\n'で区切られている。
* @return {String} 非解放リスト
*/
function GetNonRelease()
{
    return GetStorage('non_purge', '');
}

/**
* URLを非解放リストに追加する。
* @param {String} url 追加するアドレス
* @return なし
*/
function AddNonRelease(url) {
    var list = GetNonRelease();
    if (list != '') {
        // 同じURLがあるか確認してなければ追加
        var obj = SearchNonRelease(url);
        if (obj['begin'] == null) {
            list += "\n" + url;
        } else {
            return;
        }
    } else {
        list = url;
    }
    localStorage['non_purge'] = list;
}

/**
* 非解放リストの検索
* @param {String} url 検索する文字列
* @return {Object} 成功したなら{ begin, end, isLast }が返る。
*                  失敗したら全ての項目がnull。
*
*                  戻り値のbeginとendの関係は
*                  (begin, end]
*/
function SearchNonRelease(url)
{
    var list = GetNonRelease();
    var begin = list.lastIndexOf(url);
    if (begin != -1) {
        var end = list.indexOf("\n", begin);
        var flag = (end == -1) ? true : false;

        return { begin: begin, end: begin + url.length + 1, isLast: flag };
    } else {
        return { begin: null, end: null, isLast: null };
    }
}

/**
* 非解放リストからアドレスを削除
* 引数urlが指定されていないなら、非解放リスト自体を削除する。
* @param {String} url 削除するアドレス
* @return {boolean} 成功したらtrue, 失敗したらfalse
*/
function RemoveNonRelease(url)
{
    if (url !== undefined && url !== null) {
        var list = GetNonRelease();
        var obj = SearchNonRelease(url);
        if (obj['begin'] != null) {
            if (obj['isLast'] == true) {
                // 最後の項目の場合
                list = list.substring(0, obj['begin']);
            } else {
                // 最後の項目ではない場合
                // 1 = "\n"
                list = list.substring(
                    0, obj['begin']) + list.substring(obj['end']);
            }
            localStorage['non_purge'] = list;

            return true;
        } else {
            return false;
        }
    } else {
        /* console.log('Clear non_purge cache.') */
        localStorage.removeItem('non_purge');
        return true;
    }
}

/**
* 指定されたタブに最も近い未解放のタブをアクティブにする。
* 右側から探索され、見つからなかったら左側を探索する。
* 何も見つからなければ新規タブを作成してそのタブをアクティブにする。
* @param {Tab} tab 基準点となるタブ
* @return なし
*/
function SearchSelectUnloadedTab(tab)
{
    // 現在のタブの左右の未解放のタブを選択する
    chrome.windows.get(
        tab.windowId, { populate: true }, function(win) {
        // 現在のタブの位置を探し出す
        var i = 0;
        for(;
            i < win.tabs.length && win.tabs[i].id != tab.id;
            i++);

        // 現在のタブより右側を探索
        var j = i + 1;
        for(; j < win.tabs.length; j++) {
            if (!FindUnloaded('id', win.tabs[j].id)) {
                break;
            }
        }

        // 見つからなかったら左側を探索
        if (j >= win.tabs.length) {
            var j = i - 1;
            for(; 0 <= j; j--) {
                if (!FindUnloaded('id', win.tabs[j].id)) {
                    break;
                }
            }
        }

        if (0 <= j && j < win.tabs.length) {
            // 見つかったら、そのタブをアクティブ
            chrome.tabs.update(
                win.tabs[j].id, { active : true });
        } else {
            // 見つからなかったら新規タブを作成し、アクティブ
            chrome.tabs.create({ active : true });
        }
    });
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        // アイコンの状態を変更
        ReloadBrowserIcon(tab);

        // 前にアクティブにされていたタブのアンロード時間を更新
        if (old_activeId) {
            UnloadTimeProlong(old_activeId);
        }
        old_activeId = activeInfo.tabId;

        if (FindUnloaded('id', activeInfo.tabId) != null) {
            // アクティブにしたタブがアンロード済みだった場合、再読込
            // 解放ページ側の処理と二重処理になるが、
            // どちらかが先に実行されるので問題なし。
            UnPurge(activeInfo.tabId);  
        }
    });
});

chrome.tabs.onCreated.addListener(function(tab) {
    setTick(tab.id);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    DeleteUnloaded('id', tabId);
    deleteTick(tabId);
    SetBackup(JSON.stringify(unloaded));
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (changeInfo.status == 'loading') {
	} else {
		ReloadBrowserIcon(tab);

        // 解放解除時に動作。
        // 指定したタブの解放時のスクロール量があった場合、それを復元する
        var scrollPos = tempScrollPositions[tabId];
        if (scrollPos) {
            chrome.tabs.executeScript(tabId,
                { code: 'scroll(' + scrollPos.x + ', ' + scrollPos.y + ');' },
                    function() {
                        delete tempScrollPositions[tabId];
                    });
        }
	}
});

chrome.windows.onRemoved.addListener(function(windowId) {
    RemoveBackup();
});

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        switch (request.event) {
            case 'init':
                Initialize();
                break;
            case 'release':
                chrome.tabs.getSelected(function (tab) {
                    PurgeToggle(tab.id);
                    SearchSelectUnloadedTab(tab);
                });
                break;
            case 'non_release':
                chrome.tabs.getSelected(function (tab) {
                    NonReleaseToggle(tab);
                });
                break;
            case 'all_unpurge':
                AllUnPurge();
                break;
            case 'restore':
                RestoreTabs();
                break;
        }
});
