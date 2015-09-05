(function(window, document) {
  "use strict";

  function getPathNames()//{{{
  {
    var replacedPathName = window.location.pathname.replace(/(^\/|\/$)/g, '');
    var pathNameMatch = replacedPathName.split('/');
    if (pathNameMatch && replacedPathName.length > 0) {
      return pathNameMatch;
    } else {
      return null;
    }
  }//}}}

  function getHosts()//{{{
  {
    var hostRegex = /^(\w+)[.]+(.*):*(\d*)/i;
    var hostMatch = window.location.hostname.match(hostRegex);
    if (hostMatch) {
      return hostMatch.filter((v, i) => (i !== 0 && v !== ""));
    } else {
      return [ window.location.hostname ];
    }
  }//}}}

  function close() {//{{{
    parent.style.display = 'none';
  }//}}}

  var hostname = window.location.hostname;
  var pathname = '/*';

  var hosts = getHosts();
  var paths = getPathNames();

  // デザイン
  // http://www.cssdesk.com/PLetB
  var br = document.createElement('br');
  var div    = document.createElement('div');
  var span   = document.createElement('span');
  var button = document.createElement('button');
  var input  = document.createElement('input');
  input.type           = 'range';
  input.style.position = "relative";
  input.style.top      = "0.4rem";

  // parent
  function createParentElement()//{{{
  {
    var p = div.cloneNode();
    p.style.fontFamily = '"Meiryo", "メイリオ", "ＭＳ Ｐゴシック", ' +
                              '"Osaka-Mono", "Monospace", "Helvetica", ' +
                              '"Arial", sans-serif';
    p.style.fontSize   = '12px';
    p.style.position   = 'fixed';
    p.style.background = "rgba(245, 245, 245, 1.0)";
    p.style.boxShadow  = "5px 5px 20px -2px gray";
    p.style.width      = "500px";
    p.style.height     = "380px";
    p.style.display    = 'none';
    p.style.zIndex     = '100';

    function get(target) {
      var result = target.match(/(\d+)/);
      if (result === null) {
        throw new Error("Doesn't get width and height.");
      } else {
        return parseInt(result[1], 10);
      }
    }

    p.style.left = (window.innerWidth / 2.0) -
                        (get(p.style.width) / 2.0) + 'px';
    p.style.top  = (window.innerHeight / 2.0) -
                       (get(p.style.height) / 2.0) + 'px';

    return p;
  }//}}}

  var parent = createParentElement();

  // title
  function createTitleBar()//{{{
  {
    var titleBar = div.cloneNode();
    titleBar.style.padding    = '6px 12px';
    titleBar.style.background = 'rgba(200, 240, 240, 1.0)';

    var title = span.cloneNode();
    title.textContent = "Tab Memory Purge";
    titleBar.appendChild(title);

    var titleBarButton = button.cloneNode();
    titleBarButton.style.position = 'absolute';
    titleBarButton.style.right    = '12px';
    titleBarButton.textContent    = "x";
    titleBarButton.onclick        = close;
    titleBar.appendChild(titleBarButton);

    return titleBar;
  }//}}}

  parent.appendChild(createTitleBar());

  // inside exclude dialog.
  function createExcludeDialog()//{{{
  {
    var insideExcludeDialog = div.cloneNode();
    insideExcludeDialog.style.padding   = "12px 12px";
    insideExcludeDialog.style.textAlign = "center";

    var url            = div.cloneNode();
    url.style.fontSize = '1rem';
    url.style.padding  = '26px 0';
    url.textContent    = hostname + pathname;

    var mes1 = div.cloneNode();
    mes1.textContent = chrome.i18n.getMessage('exclude_dialog_mes1');

    var mes2        = div.cloneNode();
    var mes2_inner1 = div.cloneNode();
    var mes2_inner2 = div.cloneNode();
    mes2_inner1.textContent = chrome.i18n.getMessage('exclude_dialog_mes2');
    mes2_inner2.textContent = chrome.i18n.getMessage('exclude_dialog_mes3');
    mes2.appendChild(mes2_inner1);
    mes2.appendChild(mes2_inner2);

    insideExcludeDialog.appendChild(mes1);
    insideExcludeDialog.appendChild(url);
    insideExcludeDialog.appendChild(mes2);

    var ranges = div.cloneNode();
    var hostSpan           = span.cloneNode();
    hostSpan.style.padding = "0 16px;";
    hostSpan.textContent   = "Host:";
    var host   = input.cloneNode();
    host.min   = 0;
    host.max   = hosts.length-1;
    host.value = 0;
    host.addEventListener('change', e => {
      hostname = window.location.hostname;
      var hosts = getHosts();
      for (var i = 0, len = e.target.value; i < len; i++) {
        hostname = hostname.replace(hosts[i], '*');
      }
      url.textContent = hostname + pathname;
    });
    hostSpan.appendChild(host);
    ranges.appendChild(hostSpan);

    if (paths) {
      var pageSpan = hostSpan.cloneNode();
      pageSpan.textContent = "Page:";

      var page = input.cloneNode();
      page.value = 0;
      page.min   = 0;
      page.max   = paths.length;
      page.addEventListener('change', e => {
        pathname = '';
        for (var i = 0, len = e.target.value; i < len; i++) {
          pathname += '/' + paths[i];
        }
        pathname += (page.max > e.target.value) ? '/*' : '/';
        url.textContent = hostname + pathname;
      });

      pageSpan.appendChild(page);
      ranges.appendChild(pageSpan);
    }

    insideExcludeDialog.appendChild(ranges);

    return insideExcludeDialog;
  }//}}}

  parent.appendChild(createExcludeDialog());

  // buttons
  var excludeDialogButtons = div.cloneNode();
  excludeDialogButtons.style.position  = "absolute";
  excludeDialogButtons.style.right     = "12px";
  excludeDialogButtons.style.bottom    = "12px";
  excludeDialogButtons.style.textAlign = "right";

  var excludeButtonTemplate = button.cloneNode();
  excludeButtonTemplate.style.width  = '16rem';
  excludeButtonTemplate.style.margin = '2px';

  function setAddUrlToExcludeList(storageName)//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(storageName, items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError));
          return;
        }
        var uri    = hostname + pathname;
        var addUri = uri.replace(/\*/g, '').replace(/\/$/g, '');

        var item = items[storageName];
        item = item.replace(/\n$/, '').trim();

        var checkItems = item.split('\n');
        var i = 0;
        while (i < checkItems.length) {
          if (checkItems[i].trim() === addUri) {
            resolve();
            return;
          }
          ++i;
        }

        item += '\n' + addUri;

        var write = {};
        write[storageName] = item;
        chrome.storage.local.set(write, resolve);
      });
    });
  }//}}}

  function addExclusionListClicked(optionName)//{{{
  {
    setAddUrlToExcludeList(optionName)
    .then(() => {
      chrome.runtime.sendMessage(
        { event: 'load_options_and_reload_current_tab' });
      close();
    },
    error => console.error(error));
  }//}}}

  var toExcludeListBtn = excludeButtonTemplate.cloneNode();
  toExcludeListBtn.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_exclude_list');
  toExcludeListBtn.addEventListener('click', () => {
    addExclusionListClicked('exclude_url');
  });

  var toKeybindExcludeListBtn = excludeButtonTemplate.cloneNode();
  toKeybindExcludeListBtn.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_keybind_exclude_list');
  toKeybindExcludeListBtn.addEventListener('click', () => {
    addExclusionListClicked('keybind_exclude_url');
  });

  var toTempExcludeListBtn = excludeButtonTemplate.cloneNode();
  toTempExcludeListBtn.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_temp_exclude_list');
  toTempExcludeListBtn.addEventListener('click', () => {
    var uri = hostname + pathname;
    chrome.runtime.sendMessage({ event: 'add_to_temp_exclude_list', url: uri });
    close();
  });

  var cancelBtn = excludeButtonTemplate.cloneNode();
  cancelBtn.textContent = chrome.i18n.getMessage('cancel');
  cancelBtn.onclick     = close;

  var buttons = [
    toExcludeListBtn, toKeybindExcludeListBtn, toTempExcludeListBtn ];
  var i = 0;
  while (i < buttons.length) {
    excludeDialogButtons.appendChild(buttons[i]);
    excludeDialogButtons.appendChild(br);
    ++i;
  }
  excludeDialogButtons.appendChild(cancelBtn);

  // add to parent.
  parent.appendChild(excludeDialogButtons);

  // show.
  var body = document.getElementsByTagName('body')[0];
  body.appendChild(parent);

  chrome.runtime.onMessage.addListener(message => {//{{{
    switch (message.event) {
      case 'showExcludeDialog':
        parent.style.display = 'block';
        break;
    }
  });//}}}

  console.debug("exclude Dialog of Tab Memory Purge is loaded.");
})(this, this.document);
