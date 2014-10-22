/*jshint globalstrict: true*/
"use strict";

var Backup = function(key) {
  this.key = key;
};
Backup.prototype.set = function(data, callback) {
  console.log('update function of Backup class.');
  if (data === void 0 || data === null) {
    console.error('a invalid type of arguments.');
    return;
  }
  var write = {};
  write[this.key] = JSON.stringify(data);
  chrome.storage.local.set(write, callback);
};
Backup.prototype.get = function(callback) {
  console.log('get function of Backup class.');
  if (toType(callback) !== 'function') {
    console.error('A invalid type of arugments.');
    return;
  }
  // this.keyのまま使うとthis.keyの値が消滅する
  var key = this.key;
  chrome.storage.local.get(key, function(storages) {
    var backup = storages[key];
    if (toType(backup) === 'string' && backup !== '{}') {
      callback(JSON.parse(backup));
    } else {
      callback(null);
    }
  });
};
Backup.prototype.remove = function(callback) {
  console.log('remove function of Backup class.');

  chrome.storage.local.remove(this.key, callback);
};
