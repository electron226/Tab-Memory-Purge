(function(window) {
  "use strict";

  function TabSession(key, currentKey, max_sessions) {
    debug('the constructor of TabSession class.');
    this.time = null;
    this.key = key || sessionKey || 'sessions';
    this.currentKey = currentKey || currentSessionKey || 'currentSession';
    this.sessions = [];
    this.max_sessions = max_sessions || 10;
  }
  TabSession.prototype.read = function(sessions) {
    var deferred = Promise.defer();
    setTimeout(function($this) {
      if (toType(sessions) !== 'array' && toType(sessions) !== 'string') {
        error('a invalid type of arugments.');
        deferred.reject();
        return;
      }
      $this.sessions = (toType(sessions) === 'string') ?
                      JSON.parse(sessions) : sessions;
      deferred.resolve();
    }, 0, this);
    return deferred.promise;
  };
  TabSession.prototype.update = function(session) {
    debug('update function of TabSession class.', session);

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      if (session === void 0 || session === null) {
        error('a invalid type of arguments.');
        deferred.reject('a invalid type of arguments.');
        return;
      }

      if (toType($this.time) === 'date') {
        var t = $this.sessions.filter(function(v) {
          return v.date !== $this.time.getTime();
        });
        $this.sessions = t;
      }

      if (dictSize(session) > 0) {
        $this.time = new Date();
        $this.sessions.push(
          { date: $this.time.getTime(), session: cloneObject(session) });
      } else {
        $this.time = null;
      }

      $this.sessions = $this.getDeletedOldSession($this.max_sessions);

      var write = {};
      write[$this.key] = JSON.stringify($this.sessions);
      write[$this.currentKey] = $this.time ? $this.time.getTime() : $this.time;
      chrome.storage.local.set(write, deferred.resolve);
    }, 0);
    return deferred.promise;
  };
  TabSession.prototype.get = function() {
    debug('get function of TabSession class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      // this.keyのまま使うとthis.keyの値が消滅する
      var key = $this.key;
      chrome.storage.local.get(key, function(items) {
        if (chrome.runtime.lastError) {
          error(chrome.runtime.lastError.messsage);
          deferred.reject(chrome.runtime.lastError.messsage);
          return;
        }

        var sessions = items[key];
        if (toType(sessions) === 'string' && sessions !== '{}') {
          deferred.resolve(JSON.parse(sessions));
        } else {
          deferred.reject("I got the session data that is not JSON string.");
        }
      });
    }, 0);
    return deferred.promise;
  };
  TabSession.prototype.remove = function(date) {
    debug('remove function of TabSession class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      if (toType(date) !== 'date') {
        error('A invalid type of arguments.');
        deferred.reject('A invalid type of arguments.');
        return;
      }

      var dateTime = date.getTime();
      var filterFunc = function(x) {
        return x.date !== dateTime;
      };
      var t = $this.sessions.filter(filterFunc);
      $this.sessions = t;

      var write = {};
      write[$this.key] = JSON.stringify($this.sessions);
      chrome.storage.local.set(write, deferred.resolve);
    }, 0);
    return deferred.promise;
  };
  TabSession.prototype.removeItem = function(date, key) {
    debug('removeItem function of TabSession class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      if (toType(date) !== 'date' && toType(key) !== 'string') {
        error('A invalid type of arguments.');
        deferred.reject('A invalid type of arguments.');
        return;
      }

      var dateTime = date.getTime();
      var filterFunc = function(x) {
        if (x.date !== dateTime) {
          return true;
        }

        delete x.session[key];
        for (var k in x.session) {
          if (x.session.hasOwnProperty(k)) {
            return true;
          }
        }
        return false;
      };
      var t = $this.sessions.filter(filterFunc);
      $this.sessions = t;

      var write = {};
      write[$this.key] = JSON.stringify($this.sessions);
      chrome.storage.local.set(write, deferred.resolve);
    }, 0);
    return deferred.promise;
  };
  TabSession.prototype.removeAll = function() {
    debug('removeAll function of TabSession class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      $this.sessions = [];
      chrome.storage.local.remove($this.key, deferred.resolve);
    }, 0);
    return deferred.promise;
  };
  TabSession.prototype.getDeletedOldSession = function(max_sessions) {
    var end = max_sessions || this.max_sessions;
    var first = this.sessions.length - (end);
    return first <= 0 ? this.sessions : this.sessions.slice(first, end);
  };
  TabSession.prototype.setMaxSession = function(max_sessions) {
    if (max_sessions > 0) {
      this.max_sessions = max_sessions;
    } else {
      error('invalid arguments.', max_sessions);
    }
  };
  window.TabSession = window.TabSession || TabSession;

  function TabHistory(key, max_history) {
    debug('the constructor of TabHistory class.');
    this.key = key;
    this.max_history = max_history || 7;
    this.history = {};
  }
  TabHistory.prototype.read = function(dataObj) {
    debug('read function of TabHistory class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      if (dataObj === void 0 || dataObj === null) {
        chrome.storage.local.get($this.key, function(items) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.messsage);
            deferred.reject(chrome.runtime.lastError.messsage);
            return;
          }

          $this.history = items[$this.key];
          deferred.resolve();
        });
      } else if (toType(dataObj) === 'object') {
        $this.history = dataObj;
        deferred.resolve();
      } else {
        deferred.reject('read function of TabHistory class is error.' +
                        'dataObj is invalid.');
      }
    }, 0);
    return deferred.promise;
  };
  TabHistory.prototype.write = function(tab) {
    debug('write function of TabHistory class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      var beWriting = function(tab, iconURI) {
        var deferred = Promise.defer();
        setTimeout(function() {
          var now = new Date();
          var date = new Date(
            now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          var write_date = date.getTime();
          if ($this.history[write_date] === void 0 ||
              $this.history[write_date] === null) {
            $this.history[write_date] = [];
          } else {
            // Check to if previously purge url.
            $this.history[write_date] = $this.history[write_date].filter(
              function(v) {
                return v.url !== tab.url;
              }
            );
          }
          $this.history[write_date].push({
            title: tab.title ? tab.title : 'Unknown',
            iconDataURI: iconURI || icons[NORMAL_EXCLUDE],
            url: tab.url,
            time: now.getTime(),
          });

          $this.oldDelete();

          var write = {};
          write[historyKey] = $this.history;
          chrome.storage.local.set(write, deferred.resolve);
        }, 0);
        return deferred.promise;
      };

      if (tab.favIconUrl) {
        getDataURI(tab.favIconUrl).then(function(iconURI) {
          beWriting.call($this, tab, iconURI).then(deferred.resolve);
        });
      } else {
        beWriting.call($this, tab, null).then(deferred.resolve);
      }
    }, 0);
    return deferred.promise;
  };
  TabHistory.prototype.remove = function(date) {
    debug('removeItem function of TabHistory class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      delete $this.history[date.getTime()];

      var write = {};
      write[historyKey] = $this.history;
      chrome.storage.local.set(write, deferred.resolve);
    }, 0);
    return deferred.promise;
  };
  TabHistory.prototype.removeItem = function(date, item) {
    debug('removeItem function of TabHistory class.');

    var deferred = Promise.defer();
    var $this = this;
    setTimeout(function() {
      var filterFunc = function(x) {
        return x.time !== item.time;
      };
      for (var key in $this.history) {
        if ($this.history.hasOwnProperty(key)) {
          if (parseInt(key, 10) === date.getTime()) {
            var t = $this.history[key].filter(filterFunc);
            if (t.length === 0) {
              delete $this.history[key];
            } else {
              $this.history[key] = t;
            }
            break;
          }
        }
      }

      var write = {};
      write[historyKey] = $this.history;
      chrome.storage.local.set(write, deferred.resolve);
    }, 0);
    return deferred.promise;
  };
  // Delete the history of pre-history
  TabHistory.prototype.oldDelete = function() {
    debug('oldDelete function of TabHistory class.');
    // milliseconds * seconds * minutes * hours * days
    var criterion = 1000 * 60 * 60 * 24 * this.max_history;
    var now = new Date();
    var removeTime = now.getTime() - criterion;
    var removeDates = [];
    for (var dateTime in this.history) {
      if (this.history.hasOwnProperty(dateTime)) {
        if (parseInt(dateTime, 10) < removeTime) {
          removeDates.push(dateTime);
        }
      }
    }
    for (var i = 0, len = removeDates.length; i < len; i++) {
      delete this.history[removeDates[i]];
    }
  };
  TabHistory.prototype.setKey = function(keyName) {
    debug('setKey function of TabHistory class.');
    if (toType(keyName) === 'string') {
      this.key = keyName;
    } else {
      error('setKey of TabHistory class is failed. Invalid arugments');
    }
  };
  TabHistory.prototype.setMaxHistory = function(max) {
    debug('setMaxHistory function of TabHistory class.');
    if (toType(max) === 'number') {
      this.max_history = max;
    } else {
      error('setMaxHistory of TabHistory class is failed. Invalid arugments');
    }
  };
  window.TabHistory = window.TabHistory || TabHistory;
})(window);
