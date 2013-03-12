/** options.htmlで読み込み時に実行するスクリプト */

var locale_i18n = [
    'extName', 'option', 'setReleaseFileUrlTitle', 'setTimerTitle',
    'otherTitle', 'assignment', 'in_extension', 'author', 'explanation',
    'explanation_problem1', 'explanation_solution', 'explanation_problem2',
    'explanation_problem3', 'explanation_problem4', 'forcibly_close_restore',
    'sample', 'example', 'assignment_title', 'assignment_favicon', 'default',
    'save', 'clear', 'init', 'minute', 'exclude_url',
    'non_release_https', 'regex_tool',
    'regex_refURL', 'regex', 'regex_compare_string', 'regex_reference',
    'regex_option_reference', 'regix_result', 'regex_information',
];

/**
 * 指定した名前の要素を読み込み
 *
 * @param {String} name 読み込む要素の名前
 * @param [Any] default_value 要素が保存されていなかった場合のデフォルト値
 *
 * @returns なし
 */
function LoadElementName(name, default_value)
{
    var elements = document.querySelectorAll("[name='" + name + "']");
    var option = localStorage[name] ? localStorage[name] : default_value;
    for (var i = 0; i < elements.length; i++) {
        switch (elements[i].type) {
            case 'checkbox':
                if (option == 'true' || option == true) {
                    elements[i].checked = option;
                    localStorage[elements[i].name] = option;
                }
                break;
            case 'radio':
                if (elements[i].value == option) {
                    elements[i].checked = true;
                    localStorage[elements[i].name] = option;
                }
                break;
            default:
                // elementsのlengthが1の時に正常に動作
                elements[i].value  = option;
                localStorage[elements[i].name] = option;
                break;
        }
    }  
}

/**
* 指定した名前の要素を保存
* @param {String} name 保存する要素名
* @param {Function} callback nameを表す要素を受け取る関数。
*                            保存する要素が選択するタイプなら
*                            チェックされている要素を受け取る。
* @return {Boolean} 成功したらtrue, 失敗したらfalse
*/
function SaveElementName(name, callback)
{
    if (!isFunction(callback)) {
        return false;
    }

    var elements = document.querySelectorAll("[name='" + name + "']");
    for (var i = 0; i < elements.length; i++) {
        switch (elements[i].type) {
            case 'radio':
                if (elements[i].checked) {
                    callback(elements[i]);
                }
                break;
            default:
                callback(elements[i]);
                break;
        }
    }

    return true;
}

/**
* 設定をデフォルトに初期化
* @return なし
*/
function InitDefault()
{
    localStorage.removeItem('release_page');
    localStorage.removeItem('release_url');
    localStorage.removeItem('assignment_title');
    localStorage.removeItem('assignment_favicon');
    localStorage.removeItem('timer');
    localStorage.removeItem('exclude_url'); 
    localStorage.removeItem('regex_option'); 
    localStorage.removeItem('non_release_https'); 
    Load();
    
    chrome.extension.sendRequest({ event : 'init'}); 
}

/**
* 設定を保存
* @return なし
*/
function Save()
{
    function Callback_Checkbox(element) {
        localStorage[element.name] = element.checked;
    }

    function Callback_String(element) {
        localStorage[element.name] = element.value.trim();
    }

    function Callback_Value(element) {
        localStorage[element.name] = element.value;
    }

    SaveElementName('release_page', Callback_Value);

    SaveElementName('release_url', Callback_String);
    SaveElementName('assignment_title', Callback_Checkbox);
    SaveElementName('assignment_favicon', Callback_Checkbox);

    SaveElementName('timer', function (element) {
        if (element.value < 1) {
            element.value = 1;
        }
        Callback_Value(element);
    });

    SaveElementName('exclude_url', Callback_String);
    SaveElementName('regex_option', Callback_String);

    SaveElementName('non_release_https', Callback_Checkbox);
    SaveElementName('forcibly_close_restore', Callback_Checkbox);

    chrome.extension.sendRequest({ event : 'init'});
}

/**
* 設定を読み込む
* @return 
*/
function Load()
{
    LoadElementName('release_page', default_release_page); 
    LoadElementName('release_url', default_release_url); 
    LoadElementName('assignment_title', true); 
    LoadElementName('assignment_favicon', true); 
    LoadElementName('timer', default_timer);
    LoadElementName('exclude_url', default_exclude_url);
    LoadElementName('regex_option', default_regex_option);
    LoadElementName('non_release_https', true);
    LoadElementName('forcibly_close_restore', true);

    InitOptionItemState();
}

/**
* ロケール文字列の読み込み
* @return なし
*/
function InitTranslation()
{
    // テキストの設定
    for (var i = 0; i < locale_i18n.length; i++) {
        var el      = document.getElementsByClassName(locale_i18n[i] + 'Text');
        var message = chrome.i18n.getMessage(locale_i18n[i]);
        for (var j = 0; j < el.length; j++) {
            var string      = el[j].innerHTML;
            var index       = string.lastIndexOf('</');
            el[j].innerHTML = string.substring(0, index) + message
                                    + string.substring(index);
        }
    }
}

/**
* 「解放に使うページを指定」の現在の設定項目に合わせ、
* それ以下の設定部分の有効・無効を設定。
* @return なし
*/
function InitOptionItemState()
{
    var rPage = document.querySelectorAll("input[name='release_page']");
    var rUrl = document.querySelector("input[name='release_url']"); 
    var rCheckboxs = document.querySelectorAll(
                        "#assignment_options input[type='checkbox']"); 
    for (var i = 0; i < rPage.length; i++) {
        if (rPage[i].checked == true) {
            if (rPage[i].value != 'assignment') {
                rUrl.disabled = true;
                for (var j = 0; j < rCheckboxs.length; j++) {
                    rCheckboxs[j].disabled = true; 
                } 
            } else {
                rUrl.disabled = false;
                for (var j = 0; j < rCheckboxs.length; j++) {
                    rCheckboxs[j].disabled = false; 
                } 
            }
        }
    }
}

/**
* 「解放に使うぺージを指定」のラジオボタンがクリックされたときの処理
* @return なし
*/
function onReleasePage()
{
    var element = document.querySelector("input[name='release_url']");
    var rCheckboxs = document.querySelectorAll(
                        "#assignment_options input[type='checkbox']"); 
    if (this.value != 'assignment') {
        element.disabled = true;
        for (var j = 0; j < rCheckboxs.length; j++) {
            rCheckboxs[j].disabled = true;
        } 
    } else {
        element.disabled = false;
        for (var j = 0; j < rCheckboxs.length; j++) {
            rCheckboxs[j].disabled = false;
        } 
    }
}

/**
* 正規表現検証ツールの一致文字列を置き換える際に使用する関数
* @param {string} str マッチした部分文字列
* @param {integer} offset マッチが現れた文字列内のオフセット
* @param {string} s マッチが現れた文字列自体
* @return なし
*/
function replacer(str, offset, s) {
    return "<span style=\"background: red;\">" + str + "</span>";
}

/**
* 正規表現検証ツールの入力をチェック
* @return なし
*/
function checkRegex()
{
    var elRegularExpression =
        document.querySelector('input[name="regular_expression"]');
    var elOptions = document.querySelector('input[name="options"]');
    var elCompareString = document.querySelector('#compare_string');
    var elResult = document.querySelector('#result');

    // 正規表現で比較・置き換え
    var re = new RegExp(elRegularExpression.value,
                        elOptions.value ? elOptions.value : "");
    var replacedString = "";
    var compareStringSplit = elCompareString.value.split('\n');
    for (var i = 0; i < compareStringSplit.length; i++) {
        replacedString += compareStringSplit[i].replace(re, replacer) + "<br>";
    }

    // 結果を表示する領域の高さ変更
    elResult.style.height = compareStringSplit.length * 1.5 + "em";

    // 表示
    elResult.innerHTML = replacedString;
}

/**
* 正規表現クイックリファレンスの生成と表示
* @return なし
*/
function createRegexReference()
{
    var regex_items = [
        { "[abc]" : "regex_single" }, 
        { "." : "regex_any_single" }, 
        { "(...)" : "regex_capture" }, 
        { "[^abc]" : "regex_any_except" }, 
        { "\\s" : "regex_whitespace" }, 
        { "(a|b)" : "regex_or" }, 
        { "[a-z]" : "regex_range" }, 
        { "\\S" : "regex_non_whitespace" }, 
        { "a?" : "regex_zero_one" }, 
        { "[a-zA-Z]" : "regex_range_or" }, 
        { "\\d" : "regex_digit" }, 
        { "a*" : "regex_zero_more" }, 
        { "^" : "regex_start" }, 
        { "\\D" : "regex_non_digit" }, 
        { "a+" : "regex_one_more" }, 
        { "$" : "regex_end" }, 
        { "\\w" : "regex_word" }, 
        { "a{3}" : "regex_exactly" }, 
        { "\\W" : "regex_non_word" }, 
        { "a{3,}" : "regex_three_or_more" }, 
        { "\\b" : "regex_word_boundary" }, 
        { "a{3,6}" : "regex_between" }, 
    ];
    var regex_options = [
        { "i" : "regex_confuse" }, 
    ];

    // リファレンス作成
    var outputRegex = "<table>";
    var count = 0;
    for (var i in regex_items) {
        if (count == 0) {
            outputRegex += "<tr>";
        }

        for (var j in regex_items[i]) {
            outputRegex += "<th>" + j + "</th>"; 
            outputRegex += "<td>" +
                chrome.i18n.getMessage(regex_items[i][j]) + "</td>";
        }

        if (count >= 2) {
            outputRegex += "</tr>";
            count = 0;
            continue;
        }
        count++;
    }
    if (count != 0) {
        outputRegex += "</tr>";
    }
    outputRegex += "</table>";

    // オプション部分作成
    var outputOption = "<table>";
    for (var i in regex_options) {
        if (count == 0) {
            outputOption += "<tr>";
        }

        for (var j in regex_options[i]) {
            outputOption += "<th>" + j + "</th>"; 
            outputOption += "<td>" +
                chrome.i18n.getMessage(regex_options[i][j]) + "</td>";
        }

        if (count >= 3) {
            outputOption += "</tr>";
            count = 0;
            continue;
        }
        count++;
    }
    if (count != 0) {
        outputOption += "</tr>";
    }
    outputOption += "</table>";

    // 出力
    document.querySelector('#regex_reference').innerHTML = outputRegex;
    document.querySelector('#regex_option_reference').innerHTML = outputOption;
}

document.addEventListener('DOMContentLoaded', function() {
    InitTranslation();
    Load(); // データ読み込み

    // 設定項目など
    var elements = document.querySelectorAll("input[name='release_page']");
    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('click', onReleasePage);
    }

    document.querySelector('#init').addEventListener('click', InitDefault);
    document.querySelector('#save').addEventListener('click', Save);
    document.querySelector('#load').addEventListener('click', Load);

    // 正規表現確認ツールの表示・非表示アニメーション
    var move_pixelY = 460; // 表示サイズ
    var elTool = document.querySelector("#tool_box");
    elTool.style.webkitTransitionProperty = "-webkit-transform";
    elTool.style.webkitTransitionDelay= "0.0s";
    elTool.style.webkitTransitionDuration = "1.0s";
    elTool.style.webkitTransitionTimingFunction = "ease"; 
    elTool.style.height = move_pixelY + "px";

    // toggle
    var clicked = false;
    var elOpenTool = document.querySelectorAll('.open_tool');
    for (var i = 0; i < elOpenTool.length; i++) {
        elOpenTool[i].addEventListener('click', function(event) {
            if (clicked) {
                elTool.style.webkitTransform =
                    "translate(0px, " + move_pixelY + "px)";
                clicked = false;
            } else {
                elTool.style.webkitTransform =
                    "translate(0px, " + -move_pixelY + "px)";
                clicked = true;
            }
        });
    }

    document.querySelector('input[name="regular_expression"]').addEventListener(
        'keyup', checkRegex);
    document.querySelector('input[name="options"]').addEventListener(
        'keyup', checkRegex);
    document.querySelector('#compare_string').addEventListener(
        'keyup', checkRegex);

    // 正規表現クイックリファレンス
    createRegexReference();
});
