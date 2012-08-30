/** options.htmlで読み込み時に実行するスクリプト */

var locale_i18n = [
    'extName', 'option', 'setReleaseFileUrlTitle', 'setTimerTitle', 'refURL',
    'assignment', 'in_extension', 'author', 'explanation',
    'explanation_problem1', 'explanation_problem2', 'explanation_problem3',
    'explanation_problem4', 
    'sample', 'example', 'assignment_title', 'assignment_favicon', 'default',
    'save', 'clear', 'init', 'minute', 'exclude_url',
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

function InitDefault()
{
    localStorage.removeItem('release_page');
    localStorage.removeItem('release_url');
    localStorage.removeItem('assignment_title');
    localStorage.removeItem('assignment_favicon');
    localStorage.removeItem('timer');
    localStorage.removeItem('exclude_url'); 
    Load();
    
    chrome.extension.sendRequest({ event : 'init'}); 
}

function Save()
{
    SaveElementName('release_page', function (element) {
        localStorage[element.name] = element.value;
    }); 

    SaveElementName('release_url', function (element) {
        localStorage[element.name] = element.value.trim();
    }); 
    SaveElementName('assignment_title', function (element) {
        localStorage[element.name] = element.checked;
    });
    SaveElementName('assignment_favicon', function (element) {
        localStorage[element.name] = element.checked;
    });

    SaveElementName('timer', function (element) {
        if (element.value < 1) {
            element.value = 1;
        }
        localStorage[element.name] = element.value;
    });

    SaveElementName('exclude_url', function (element) {
        element.value = element.value.trim();
        localStorage[element.name] = element.value.trim();
    }); 

    chrome.extension.sendRequest({ event : 'init'});
}

function Load()
{
    LoadElementName('release_page', default_release_page); 
    LoadElementName('release_url', default_release_url); 
    LoadElementName('assignment_title', true); 
    LoadElementName('assignment_favicon', true); 
    LoadElementName('timer', default_timer);
    LoadElementName('exclude_url', default_exclude_url);

    InitOptionItemState();
}

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

document.addEventListener('DOMContentLoaded', function() {
    InitTranslation();
    Load(); // データ読み込み

    var elements = document.querySelectorAll("input[name='release_page']");
    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('click', onReleasePage);
    }

    document.querySelector('#init').addEventListener('click', InitDefault);
    document.querySelector('#save').addEventListener('click', Save);
    document.querySelector('#load').addEventListener('click', Load);
});
