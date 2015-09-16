(function(window, document) {
  "use strict";

  function getNumber(target) {//{{{
    var result = target.match(/(\d+)/);
    if (result === null) {
      throw new Error("Doesn't get width and height.");
    } else {
      return parseInt(result[1], 10);
    }
  }//}}}

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

  function initTextStyle(element)//{{{
  {
    element.style.fontFamily = 'sans-serif';
    element.style.fontSize   = styleBaseFontSize;
    textStyleLikeAdobe(element);
  }//}}}

  function textStyleLikeAdobe(element)//{{{
  {
    element.style.color      = styleFontColor;
    element.style.textshadow = '0 0 1px rgba(' + styleFontColor + ', .1)';
    element.style.fontSmoothing = 'antialiased';
  }//}}}

  // variable. //{{{
  var styleBaseFontSize      = '12px';
  var styleFontColor         = '#212121';
  var stylePrimaryColor      = '#2196F3';
  var styleLightPrimaryColor = '#BBDEFB';
  var styleBorderColor       = '#727272';

  var hostname = window.location.hostname;
  var pathname = '/*';

  var hosts = getHosts();
  var paths = getPathNames();

  // デザイン
  // http://www.cssdesk.com/PLetB
  var br = document.createElement('br');
  var div    = document.createElement('div');
  initTextStyle(div);
  var span   = document.createElement('span');
  initTextStyle(span);
  var button = document.createElement('button');
  initTextStyle(button);
  var input  = document.createElement('input');
  initTextStyle(input);
  input.type           = 'range';
  input.style.position = "relative";
  input.style.top      = "0.4em";
  //}}}

  // parent
  function createParentElement()//{{{
  {
    var p = div.cloneNode();
    p.style.position   = 'fixed';
    p.style.background = styleLightPrimaryColor;
    p.style.boxShadow  = "0px 1px 3px 0" + styleBorderColor;
    p.style.width      = "42em";
    p.style.height     = "32em";
    p.style.display    = 'none';
    p.style.zIndex     = '100';

    p.style.left = (window.innerWidth -
      getNumber(p.style.width) * getNumber(styleBaseFontSize)) / 2.0 + 'px';
    p.style.top = (window.innerHeight -
      getNumber(p.style.height) * getNumber(styleBaseFontSize)) / 2.0 + 'px';

    return p;
  }//}}}

  var parent = createParentElement();

  function close() {//{{{
    parent.style.display = 'none';
  }//}}}

  // title
  function createTitleBar()//{{{
  {
    var titleBar = div.cloneNode();
    titleBar.style.padding    = '1em';
    titleBar.style.fontWeight = 'bold';
    titleBar.style.background = stylePrimaryColor;

    var title = span.cloneNode();
    title.style.fontSize = '1.5em';
    title.textContent = "Tab Memory Purge";
    titleBar.appendChild(title);

    var titleBarButton = button.cloneNode();
    titleBarButton.style.position = 'absolute';
    titleBarButton.style.right    = '1em';
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
    insideExcludeDialog.style.padding   = "1em";
    insideExcludeDialog.style.textAlign = "center";

    var url            = div.cloneNode();
    url.style.fontSize = '1.5em';
    url.style.padding  = '2em 0';
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
    hostSpan.style.padding = "0 1.5em;";
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
  excludeDialogButtons.style.right     = "1em";
  excludeDialogButtons.style.bottom    = "1em";
  excludeDialogButtons.style.textAlign = "right";

  var excludeButtonTemplate = button.cloneNode();
  excludeButtonTemplate.style.width  = '16em';
  excludeButtonTemplate.style.margin = '0.16em';

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
