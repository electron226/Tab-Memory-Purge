/* KeyList class */
var KeyList = function() {
  this.data = new Object();
};
KeyList.prototype.get = function(getOptions) {
  var key = getOptions.key;
  var index = getOptions.index;
  if (getType(getOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (key == undefined || key == null) {
    throw new Error('Invalid argument. ' +
                    'key is invalid type in argument object.');
  }
  if (getType(index) != 'number') {
    throw new Error('Invalid argument. ' +
                    'index key is not number type in argument object.');
  }
  if (this.data[key] == undefined) {
    throw new Error('KeyList cannot found key object.');
  }
  if (index < 0 || this.data[key].length <= index) {
    throw new Error('index out of range in argument object.');
  }

  return this.data[key][index];
};

KeyList.prototype.push = function(pushOptions) {
  var key = pushOptions.key;
  var value = pushOptions.value;
  if (getType(pushOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (key == undefined || key == null) {
    throw new Error('Invalid argument. ' +
                    'key is invalid type in argument object.');
  }
  if (value == undefined || value == null) {
    throw new Error('Invalid argument. ' +
                    'value is invalid type in argument object.');
  }

  if (this.data[key] == undefined) {
    this.data[key] = new Array();
  }
  this.data[key].push(value);
};

KeyList.prototype.insert = function(insertOptions) {
  var key = insertOptions.key;
  var index = insertOptions.index;
  var value = insertOptions.value;
  if (getType(insertOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (key == undefined || key == null) {
    throw new Error('Invalid argument. ' +
                    'key is invalid type in argument object.');
  }
  if (getType(index) != 'number') {
    throw new Error('Invalid argument. ' +
                    'index key is not number type in argument object.');
  }
  if (value == undefined || value == null) {
    throw new Error('Invalid argument. ' +
                    'value is invalid type in argument object.');
  }

  if (this.data[key] == undefined) {
    this.push({ key: key, value: value });
  } else {
    this.data[key].splice(index, 0, value);
  }
};

KeyList.prototype.move = function(moveOptions) {
  var key = moveOptions.key;
  var fromIndex = moveOptions.fromIndex;
  var toIndex = moveOptions.toIndex;
  if (getType(moveOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (key == undefined || key == null) {
    throw new Error('Invalid argument. ' +
                    'key is invalid type in argument object.');
  }
  if (getType(fromIndex) != 'number') {
    throw new Error('Invalid argument. ' +
                    'fromIndex key is not number type in argument object.');
  }
  if (getType(toIndex) != 'number') {
    throw new Error('Invalid argument. ' +
                    'toIndex key is not number type in argument object.');
  }

  var removed = this.data[key].splice(fromIndex, 1);
  this.data[key].splice(toIndex, 0, removed[0]);

  return removed[0];
};

KeyList.prototype.remove = function(removeOptions) {
  var key = removeOptions.key;
  var value = removeOptions.value;
  if (getType(removeOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }

  if (value == undefined) {
    if (key == null) {
      throw new Error('Invalid argument. ' +
                      'key is invalid type in argument object.');
    }

    // keyのタブ情報全体を削除
    delete this.data[key];
  } else {
    var searchObj = new Object();
    if (key == undefined) {
      searchObj = this.data;
    } else if (getType(value) == 'number') {
      searchObj[key] = this.data[key];
    } else {
      throw new Error('Invalid argument. ' +
                      'value key is not number type in argument object.');
    }

    // key内のIDを削除
    for (var key in searchObj) {
      for (var i = 0; i < this.data[key].length; i++) {
        if (this.data[key][i] == value) {
          return this.data[key].splice(i, 1);
        }
      }
    }
  }
};

KeyList.prototype.find = function(findOptions) {
  var key = findOptions.key;
  var value = findOptions.value;
  if (getType(findOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }

  var searchObj = new Object();
  if (key == undefined) {
    searchObj = this.data;
  } else if (getType(value) == 'number') {
    searchObj[key] = this.data[key];
  } else {
    throw new Error('Invalid argument. ' +
                    'value key is not number type in argument object.');
  }

  for (var key in searchObj) {
    for (var i = 0; i < this.data[key].length; i++) {
      if (this.data[key][i] == value) {
        return { key: parseInt(key), index: i };
      }
    }
  }

  throw new Error("Can't find value.");
};

KeyList.prototype.length = function(key) {
  if (key == undefined) {
    var i = 0;
    while (this.data[i] != undefined) {
      i++;
    }
    return i;
  } else if (getType(key) == 'number') {
    return this.data[key].length;
  } else {
    throw new Error('Invalid argument. not number or undefined.');
  }
};

KeyList.prototype.isEmpty = function(key) {
  if (key == undefined) {
    throw new Error('Invalid argument. not number.');
  }

  return this.data[key] == undefined;
};


/* TabIdHistory class */
var TabIdHistory = function(maxlength) {
  this.history = new Object();
  this.maxlength = maxlength ? maxlength : 10;
  this.length = 0;
};

TabIdHistory.prototype.get = function(getOptions) {
  var windowId = getOptions.windowId;
  var index = getOptions.index;
  if (getType(getOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (getType(windowId) != 'number') {
    throw new Error('Invalid argument. ' +
                    'windowId key is not number type in argument object.');
  }
  if (getType(index) != 'number') {
    throw new Error('Invalid argument. ' +
                    'index key is not number type in argument object.');
  }
  if (this.history[windowId] == undefined) {
    throw new Error('History is not found windowId object.');
  }
  if (index < 0 || this.history[windowId].length <= index) {
    throw new Error('index out of range in argument object.');
  }

  return this.history[windowId][index];
};

TabIdHistory.prototype.lastPrevious = function(windowId) {
  if (getType(windowId) != 'number') {
    throw new Error('Invalid argument. First argument is not number type');
  }
  if (this.history[windowId] == undefined) {
    throw new Error('History is not found windowId object.');
  }

  var index = this.history[windowId].length - 1;
  index = index > 0 ? index : 0;
  return this.history[windowId][index];
};

TabIdHistory.prototype.push = function(pushOptions) {
  var windowId = pushOptions.windowId;
  var tabId = pushOptions.tabId;
  if (getType(pushOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (getType(windowId) != 'number') {
    throw new Error('Invalid argument. ' +
                    'windowId key is not number type in argument object.');
  }
  if (getType(tabId) != 'number') {
    throw new Error('Invalid argument. ' +
                    'tabId key is not number type in argument object.');
  }

  if (this.isEmpty(windowId)) {
    this.history[windowId] = new Array();
    for (var i = 0; i < this.maxlength; i++) {
      this.history[windowId].push(undefined);
    }
    this.length++;
  }
  if (this.get({ windowId: windowId,
    index: this.maxlength > 0 ? this.maxlength - 1 : 0 }) != tabId) {
    this.history[windowId].push(tabId);
    return this.history[windowId].shift();
  } else {
    return null;
  }
};

TabIdHistory.prototype.remove = function(removeOptions) {
  var windowId = removeOptions.windowId;
  var tabId = removeOptions.tabId;
  if (getType(removeOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }

  if (tabId == undefined) {
    if (getType(windowId) != 'number') {
      throw new Error('Invalid argument. ' +
                      'windowId key is not number type in argument object.');
    }

    // windowIdの履歴全体を削除
    delete this.history[windowId];
    this.length--;
  } else {
    var searchObj = new Object();
    if (windowId == undefined) {
      searchObj = this.history;
    } else if (getType(tabId) == 'number') {
      searchObj[windowId] = this.history[windowId];
    } else {
      throw new Error('Invalid argument. ' +
                      'tabId key is not number type in argument object.');
    }

    // windowId内の履歴を削除
    for (var key in searchObj) {
      var count = 0;
      for (var i = 0; i < this.history[key].length; i++) {
        if (this.history[key][i] == tabId) {
          this.history[key].splice(i, 1);
          i--;
          count++;
        }
      }

      // 削除した数だけ先頭に追加
      try {
        var addItem = this.get({ windowId: parseInt(key), index: 0 });
      } catch (e) {
        if (e.message != 'index out of range in argument object.') {
          throw e;
        }
      }
      for (var i = 0; i < count; i++) {
        this.history[key].splice(0, 0, addItem);
      }
    }
  }
};

TabIdHistory.prototype.update = function(updateOptions) {
  var windowId = updateOptions.windowId;
  var index = updateOptions.index;
  var tabId = updateOptions.tabId;
  if (getType(updateOptions) != 'object') {
    throw new Error('Invalid argument. argument is not object.');
  }
  if (getType(windowId) != 'number') {
    throw new Error('Invalid argument. ' +
                    'windowId key is not number type in argument object.');
  }
  if (getType(index) != 'number') {
    throw new Error('Invalid argument. ' +
                    'tabId key is not number type in argument object.');
  }
  if (getType(tabId) != 'number') {
    throw new Error('Invalid argument. ' +
                    'tabId key is not number type in argument object.');
  }
  if (index < 0 || this.history[windowId].length <= index) {
    throw new Error('index out of range in argument object.');
  }

  return this.history[windowId].splice(index, 1, tabId)[0];
};

TabIdHistory.prototype.isEmpty = function(windowId) {
  if (windowId == undefined) {
    throw new Error('Invalid argument. not number.');
  }

  return this.history[windowId] == undefined;
};
