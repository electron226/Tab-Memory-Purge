var locale_i18n = [
    'restore', 'release', 'not_release', 
];

function OnRelease()
{
    chrome.extension.sendRequest({ event : 'release'});
}

function OnNotRelease()
{
    chrome.extension.sendRequest({ event : 'not_release'});
}

function OnRestore()
{
    chrome.extension.sendRequest({ event : 'restore'});
}

function Run()
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

document.addEventListener('DOMContentLoaded', function() {
    Run();

    document.querySelector('#release').addEventListener('click', OnRelease);
    document.querySelector('#not_release').addEventListener('click', OnNotRelease);
    document.querySelector('#restore').addEventListener('click', OnRestore);
});
