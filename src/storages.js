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

var History = function(key, max_history) {
  this.key = key;
  this.max_history = max_history || 7;
  this.history = {};
};
History.prototype.read = function(dataObj, callback) {
  if (dataObj === void 0 || dataObj === null) {
    chrome.storage.local.get(this.key, function(items) {
      this.history = items[this.key];
      if (toType(callback) === 'function') {
        callback();
      }
    });
  } else if (toType(dataObj) === 'object') {
    this.history = dataObj;
  } else {
    throw new Error('read function of History class is error.' +
                    'dataObj is invalid.');
  }
};
History.prototype.write = function(tab, callback) {
  var now = new Date();
  var date = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  var write_date = date.getTime();
  if (this.history[write_date] === void 0 ||
      this.history[write_date] === null) {
    this.history[write_date] = [];
  }
  this.history[write_date].push({
    'title': tab.title ? tab.title : 'Unknown',
    'url': tab.url,
    'time': now.getTime(),
  });

  this.oldDelete();

  var write = {};
  write[historyKey] = this.history;
  chrome.storage.local.set(write, callback);
};
// Delete the history of pre-history
History.prototype.oldDelete = function() {
  // milliseconds * seconds * minutes * hours * days
  var criterion = 1000 * 60 * 60 * 24 * this.max_history;
  var now = new Date();
  var removeTime = now.getTime() - criterion;
  var removeDates = [];
  for (var dateTime in this.history) {
    if (parseInt(dateTime, 10) < removeTime) {
      removeDates.push(dateTime);
    }
  }
  for (var i in removeDates) {
    delete this.history[removeDates[i]];
  }
};
History.prototype.setKey = function(keyName) {
  if (toType(keyName) === 'string') {
    this.key = keyName;
  } else {
    throw new Error('setKey of History class is failed.' +
                    'Invalid arugments');
  }
};
History.prototype.setMaxHistory = function(max) {
  if (toType(max) === 'number') {
    this.max_history = max;
  } else {
    throw new Error('setMaxHistory of History class is failed.' +
                    'Invalid arugments');
  }
};
