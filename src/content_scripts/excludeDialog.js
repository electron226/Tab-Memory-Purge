(function(window, document) {
  "use strict";

  function getPathNames()
  {
    var pathNameMatch =
      window.location.pathname.replace(/(^\/|\/$)/g, '').split('/');
    if (pathNameMatch) {
      return pathNameMatch;
    } else {
      return null;
    }
  }

  function getHosts()
  {
    var hostRegex = /^(\w+)[.]+(.*):*(\d*)/i;
    var hostMatch = window.location.hostname.match(hostRegex);
    if (hostMatch) {
      return hostMatch.filter(function(v, i) {
        return i !== 0 && v !== "";
      });
    } else {
      return [ window.location.hostname ];
    }
  }

  var hostname = window.location.hostname;
  var pathname = '/*';

  var hosts = getHosts();
  var paths = getPathNames();

  // デザイン
  // http://www.cssdesk.com/PLetB
  var div = document.createElement('div');
  var span = document.createElement('span');
  var button = document.createElement('button');
  var input = document.createElement('input');
  input.type = 'range';
  input.style.position = "relative";
  input.style.top = "0.4rem";

  // parent
  var parent = div.cloneNode();
  parent.style.fontFamily = '"Meiryo", "メイリオ", "ＭＳ Ｐゴシック", ' +
                            '"Osaka-Mono", "Monospace", "Helvetica", ' +
                            '"Arial", sans-serif';
  parent.style.fontSize = '12px';
  parent.style.position = 'fixed';
  parent.style.background = "rgba(245, 245, 245, 1.0)";
  parent.style.boxShadow = "5px 5px 20px -2px gray";
  parent.style.width = "500px";
  parent.style.height = "380px";
  parent.style.display = 'none';
  parent.style.zIndex = '100';

  (function(window, parent) {
    function get(target)
    {
      return parseInt(target.replace('px', ''), 10);
    }

    parent.style.left = (window.innerWidth / 2.0) -
                        (get(parent.style.width) / 2.0) + 'px';
    parent.style.top = (window.innerHeight / 2.0) -
                       (get(parent.style.height) / 2.0) + 'px';
  })(window, parent);

  function close()
  {
    parent.style.display = 'none';
  }

  // title
  var titleBar = div.cloneNode();
  titleBar.style.padding = '6px 12px';
  titleBar.style.background = 'rgba(200, 240, 240, 1.0)';

  var title = span.cloneNode();
  title.textContent = "Tab Memory Purge";
  titleBar.appendChild(title);

  var titleBarButton = button.cloneNode();
  titleBarButton.style.position = 'absolute';
  titleBarButton.style.right = '12px';
  titleBarButton.textContent = "x";
  titleBarButton.onclick = close;
  titleBar.appendChild(titleBarButton);

  parent.appendChild(titleBar);

  // inside exclude dialog.
  var insideExcludeDialog = div.cloneNode();
  insideExcludeDialog.style.padding = "12px 12px";
  insideExcludeDialog.style.textAlign = "center";

  var mes1 = div.cloneNode();
  mes1.textContent = chrome.i18n.getMessage('exclude_dialog_mes1');

  var mes2 = div.cloneNode();
  var mes2_inner1 = div.cloneNode();
  var mes2_inner2 = div.cloneNode();
  mes2_inner1.textContent = chrome.i18n.getMessage('exclude_dialog_mes2');
  mes2_inner2.textContent = chrome.i18n.getMessage('exclude_dialog_mes3');
  mes2.appendChild(mes2_inner1);
  mes2.appendChild(mes2_inner2);

  var url = div.cloneNode();
  url.style.fontSize = '1rem';
  url.style.padding = '26px 0';
  url.textContent = hostname + pathname;

  var ranges = div.cloneNode();
  var hostSpan = span.cloneNode();
  hostSpan.style.padding = "0 16px;";
  hostSpan.textContent = "Host:";
  var host = input.cloneNode();
  host.min = 0;
  host.max = hosts.length-1;
  host.value = 0;
  host.onchange = function(e) {
    hostname = window.location.hostname;
    var hosts = getHosts();
    for (var i = 0, len = e.target.value; i < len; i++) {
      hostname = hostname.replace(hosts[i], '*');
    }
    url.textContent = hostname + pathname;
  };
  hostSpan.appendChild(host);
  ranges.appendChild(hostSpan);

  if (paths) {
    var pageSpan = hostSpan.cloneNode();
    pageSpan.textContent = "Page:";
    var page = input.cloneNode();
    page.value = 0;
    page.min = 0;
    page.max = paths.length;
    page.onchange = function(e) {
      pathname = '';
      for (var i = 0, len = e.target.value; i < len; i++) {
        pathname += '/' + paths[i];
      }
      pathname += (page.max > e.target.value) ? '/*' : '/';
      url.textContent = hostname + pathname;
    };
    pageSpan.appendChild(page);
    ranges.appendChild(pageSpan);
  }

  insideExcludeDialog.appendChild(mes1);
  insideExcludeDialog.appendChild(url);
  insideExcludeDialog.appendChild(mes2);
  insideExcludeDialog.appendChild(ranges);

  parent.appendChild(insideExcludeDialog);

  // buttons
  var br = document.createElement('br');
  var excludeDialogButtons = div.cloneNode();
  excludeDialogButtons.style.position = "absolute";
  excludeDialogButtons.style.right = "12px";
  excludeDialogButtons.style.bottom = "12px";
  excludeDialogButtons.style.textAlign = "right";

  var excludeButtonTemplate = button.cloneNode();
  excludeButtonTemplate.style.width = '16rem';
  excludeButtonTemplate.style.margin = '2px';

  function setAddUrlToExcludeList(storageName)
  {
    var deferred = Promise.defer();
    chrome.storage.local.get(storageName, function(items) {
      if (chrome.runtime.lastError) {
        deferred.reject(chrome.runtime.lastError);
        return;
      }
      var uri = hostname + pathname;
      var addUri = uri.replace(/\*/g, '').replace(/\/$/g, '');

      var item = items[storageName];
      item = item.replace(/\n$/, '').trim();

      var checkItems = item.split('\n');
      for (var i = 0, len = checkItems.length; i < len; i++) {
        if (checkItems[i].trim() === addUri) {
          deferred.resolve();
          return;
        }
      }

      item += '\n' + addUri;

      var write = {};
      write[storageName] = item;
      chrome.storage.local.set(write, deferred.resolve);
    });
    return deferred.promise;
  }

  var toExcludeListBtn = excludeButtonTemplate.cloneNode();
  toExcludeListBtn.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_exclude_list');
  toExcludeListBtn.onclick = function() {
    setAddUrlToExcludeList('exclude_url').then(function() {
      chrome.runtime.sendMessage(
        { event: 'load_options_and_reload_current_tab' });
      close();
    });
  };

  var toKeybindExcludeListBtn = excludeButtonTemplate.cloneNode();
  toKeybindExcludeListBtn.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_keybind_exclude_list');
  toKeybindExcludeListBtn.onclick = function() {
    setAddUrlToExcludeList('keybind_exclude_url').then(function() {
      chrome.runtime.sendMessage(
        { event: 'load_options_and_reload_current_tab' });
      close();
    });
  };

  var toTempExcludeListBtn = excludeButtonTemplate.cloneNode();
  toTempExcludeListBtn.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_temp_exclude_list');
  toTempExcludeListBtn.onclick = function() {
    var uri = hostname + pathname;
    chrome.runtime.sendMessage({ event: 'add_to_temp_exclude_list', url: uri });
    close();
  };

  var cancelBtn = excludeButtonTemplate.cloneNode();
  cancelBtn.textContent = chrome.i18n.getMessage('cancel');
  cancelBtn.onclick = close;

  var buttons = [
    toExcludeListBtn, toKeybindExcludeListBtn, toTempExcludeListBtn ];
  buttons.forEach(function(v) {
    excludeDialogButtons.appendChild(v);
    excludeDialogButtons.appendChild(br);
  });
  excludeDialogButtons.appendChild(cancelBtn);

  // add to parent.
  parent.appendChild(excludeDialogButtons);

  // show.
  var body = document.getElementsByTagName('body')[0];
  body.appendChild(parent);

  chrome.runtime.onMessage.addListener(function(message) {
    switch (message.event) {
      case 'showExcludeDialog':
        parent.style.display = 'block';
        break;
    }
  });

  console.debug("exclude Dialog of Tab Memory Purge is loaded.");
})(window, document);
