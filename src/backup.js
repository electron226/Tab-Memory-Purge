/*jshint globalstrict: true*/
"use strict";

var Backup = function(key) {
  this.key = key;
};
Backup.prototype.update = function(data, callback) {
  console.log('update function of Backup class.');
  if (data === void 0 || data === null) {
    console.error('a invalid type of arguments.');
    return;
  }
  var write = {};
  write[this.key] = JSON.stringify(data);
  chrome.storage.local.set(write, function() {
    if (toType(callback) === 'function') {
      callback();
    }
  });
};
Backup.prototype.get = function(callback) {
  console.log('get function of Backup class.');
  if (toType(callback) !== 'function') {
    console.error('A invalid type of arugments.');
    return;
  }

  chrome.storage.local.get(this.key, function(storages) {
    var backup = storages[this.key];
    if (toType(backup) === 'string' && backup !== '{}') {
      callback(JSON.parse(backup));
    }
  });
};
Backup.prototype.remove = function(callback) {
  console.log('remove function of Backup class.');
  if (toType(callback) !== 'function') {
    console.error('A invalid type of arugments.');
    return;
  }

  chrome.storage.local.remove(this.key, function() {
      callback();
  });
};
