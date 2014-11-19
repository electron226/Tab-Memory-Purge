// This file don't use angular.js and jQuery.
(function(window) {
  "use strict";

  function TabSession(key, currentKey, max_sessions) {
    console.debug('the constructor of TabSession class.');
    this.time = null;
    this.key = key || sessionKey || 'sessions';
    this.currentKey = currentKey || currentSessionKey || 'currentSession';
    this.sessions = [];
    this.max_sessions = max_sessions || 10;
  }
  TabSession.prototype.read = function(sessions) {
    if (toType(sessions) !== 'array' && toType(sessions) !== 'string') {
      console.error('a invalid type of arugments.');
      return;
    }
    this.sessions = (toType(sessions) === 'string') ?
                    JSON.parse(sessions) : sessions;
  };
  TabSession.prototype.update = function(session, callback) {
    console.debug('update function of TabSession class.');
    if (session === void 0 || session === null) {
      console.error('a invalid type of arguments.');
      return;
    }

    if (this.time !== null) {
      this.sessions.pop();
    } else {
      this.time = new Date();
    }

    if (dictSize(session) > 0) {
      this.sessions.push({ date: this.time.getTime(), session: session });
    } else {
      this.time = null;
    }

    this.sessions = this.getDeletedOldSession(this.max_sessions);

    var write = {};
    write[this.key] = JSON.stringify(this.sessions);
    write[this.currentKey] = this.time ? this.time.getTime() : this.time;
    chrome.storage.local.set(write, callback);
  };
  TabSession.prototype.get = function(callback) {
    console.debug('get function of TabSession class.');
    if (toType(callback) !== 'function') {
      console.error('A invalid type of arugments.');
      return;
    }
    // this.keyのまま使うとthis.keyの値が消滅する
    var key = this.key;
    chrome.storage.local.get(key, function(items) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.messsage);
        return;
      }

      var sessions = items[key];
      if (toType(sessions) === 'string' && sessions !== '{}') {
        callback(JSON.parse(sessions));
      } else {
        callback(null);
      }
    });
  };
  TabSession.prototype.remove = function(date, callback) {
    console.debug('remove function of TabSession class.');

    if (toType(date) !== 'date') {
      console.error('A invalid type of arguments.');
      return;
    }

    var i, len;
    var removedIndex = [];
    var dateTime = date.getTime();
    for (i = 0, len = this.sessions.length; i < len; i++) {
      if (this.sessions[i].date === dateTime) {
        removedIndex.push(i);
      }
    }

    var regulation = 0;
    for (i = 0, len = removedIndex.length; i < len; i++) {
      this.sessions.splice(removedIndex[i] - regulation, 1);
      regulation++;
    }

    var write = {};
    write[this.key] = JSON.stringify(this.sessions);
    chrome.storage.local.set(write, callback);
  };
  TabSession.prototype.removeAll = function(callback) {
    console.debug('removeAll function of TabSession class.');

    chrome.storage.local.remove(this.key, callback);
  };
  TabSession.prototype.getDeletedOldSession = function(max_sessions) {
    var length = this.sessions.length - (max_sessions || this.max_sessions);
    return length <= 0 ? this.sessions : this.sessions.slice(0, length);
  };
  TabSession.prototype.setMaxSession = function(max_sessions) {
    if (max_sessions > 0) {
      this.max_sessions = max_sessions;
    } else {
      console.error('invalid arguments.', max_sessions);
    }
  };
  window.TabSession = window.TabSession || TabSession;

  function TabHistory(key, max_history) {
    console.debug('the constructor of TabHistory class.');
    this.key = key;
    this.max_history = max_history || 7;
    this.history = {};
  }
  TabHistory.prototype.read = function(dataObj, callback) {
    console.debug('read function of TabHistory class.');
    if (dataObj === void 0 || dataObj === null) {
      chrome.storage.local.get(this.key, function(items) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.messsage);
          return;
        }

        this.history = items[this.key];
        if (toType(callback) === 'function') {
          callback();
        }
      });
    } else if (toType(dataObj) === 'object') {
      this.history = dataObj;
    } else {
      throw new Error('read function of TabHistory class is error.' +
                      'dataObj is invalid.');
    }
  };
  TabHistory.prototype.write = function(tab, callback) {
    console.debug('write function of TabHistory class.');
    var now = new Date();
    var date = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    var write_date = date.getTime();
    if (this.history[write_date] === void 0 ||
        this.history[write_date] === null) {
      this.history[write_date] = [];
    } else {
      // Check to if previously purge url.
      this.history[write_date] = this.history[write_date].filter(function(v) {
        return v.url !== tab.url;
      });
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
  TabHistory.prototype.oldDelete = function() {
    console.debug('oldDelete function of TabHistory class.');
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
  TabHistory.prototype.setKey = function(keyName) {
    console.debug('setKey function of TabHistory class.');
    if (toType(keyName) === 'string') {
      this.key = keyName;
    } else {
      throw new Error('setKey of TabHistory class is failed.' +
                      'Invalid arugments');
    }
  };
  TabHistory.prototype.setMaxHistory = function(max) {
    console.debug('setMaxHistory function of TabHistory class.');
    if (toType(max) === 'number') {
      this.max_history = max;
    } else {
      throw new Error('setMaxHistory of TabHistory class is failed.' +
                      'Invalid arugments');
    }
  };
  window.TabHistory = window.TabHistory || TabHistory;
})(window);
