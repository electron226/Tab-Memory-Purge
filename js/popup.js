var locale_i18n = [
    'restore', 'release', 'not_release', 'remove_not_release', 
];

function ChangeNonReleaseText()
{
    var purgeIcon = localStorage['purgeIcon'];
    var el = document.querySelector('.not_releaseText'); 
    if (purgeIcon == 'true') {
        var message = chrome.i18n.getMessage(locale_i18n[3]);
    } else {
        var message = chrome.i18n.getMessage(locale_i18n[2]);
    }
    el.innerHTML = message;
}

function OnRelease()
{
    chrome.extension.sendRequest({ event : 'release'});
}

function OnNonRelease()
{
    chrome.extension.sendRequest({ event : 'not_release'}, function(reponse) {
        ChangeNonReleaseText();
    });
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

    ChangeNonReleaseText();
}

document.addEventListener('DOMContentLoaded', function() {
    Run();

    document.querySelector('#release').addEventListener('click', OnRelease);
    document.querySelector('#not_release').addEventListener('click', OnNonRelease);
    document.querySelector('#restore').addEventListener('click', OnRestore);
});
