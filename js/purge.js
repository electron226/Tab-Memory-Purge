unloaded = [];

function Purge(tabId)
{
    console.log('purge');
    chrome.tabs.executeScript(tabId,
                              { code: 'window.location.reload();'
                                  + 'window.stop();'
                                  + 'document.write("Tab Memory Purge");' },
                              function() {
        unloaded.push(tabId);
    });
}

function UnPurge(tabId)
{
    console.log('unpurge');
    chrome.tabs.reload(tabId);
    unloaded.splice(Find(tabId, unloaded), 1);
}

function Find(tabId, array)
{
    for (var i = 0; i < array.length; i++) {
        if (tabId == array[i]) {
            console.log(i);
            return i;
        }
    }

    return null;
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
    if (Find(activeInfo.tabId, unloaded) != null) {
        UnPurge(activeInfo.tabId);
    }
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    unloaded.splice(Find(tabId, purge), 1);
});

chrome.browserAction.onClicked.addListener(function(tab) {
    console.log(unloaded);
    if (Find(tab.id, unloaded) != null) {
        UnPurge(tab.id);
    } else {
        Purge(tab.id);
    }
});
