/*jshint globalstrict: true*/
/*jshint forin: true*/
/*global keyCheck: true, compareObject: true */
"use strict";

document.addEventListener('keyup', function(e) {
  var currentFocus = document.activeElement;
  var activeElementName = currentFocus.tagName.toLowerCase();
  if (activeElementName === 'input' || activeElementName === 'textarea') {
    return;
  }

  chrome.storage.local.get(null, function(items) {
    var storageName = 'release_keybind_text';
    var releaseKey = JSON.parse(
      items[storageName] || default_values[storageName]);

    storageName = 'switch_not_release_keybind_text';
    var switchKey = JSON.parse(
      items[storageName] || default_values[storageName]);

    storageName = 'all_unpurge_keybind_text';
    var all_unpurgeKey = JSON.parse(
      items[storageName] || default_values[storageName]);

    storageName = 'restore_keybind_text';
    var restoreKey = JSON.parse(
      items[storageName] || default_values[storageName]);

    var pushKey = keyCheck(e);
    if (compareObject(releaseKey, pushKey)) {
      chrome.runtime.sendMessage({ event: 'release'});
    } else if (compareObject(switchKey, pushKey)) {
      chrome.runtime.sendMessage({ event: 'switch_not_release'});
    } else if (compareObject(all_unpurgeKey, pushKey)) {
      chrome.runtime.sendMessage({ event: 'all_unpurge'});
    } else if (compareObject(restoreKey, pushKey)) {
      chrome.runtime.sendMessage({ event: 'restore'});
    }
  });
});

console.log('loading keybind of Tab Memory Purge.');
