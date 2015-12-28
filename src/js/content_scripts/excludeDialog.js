(function(window, document) {
  "use strict";

  function getNumber(pStrTarget) {//{{{
    var lArrayResult = pStrTarget.match(/(\d+)/);
    if (lArrayResult === null) {
      throw new Error("Doesn't get width and height.");
    } else {
      return parseInt(lArrayResult[1], 10);
    }
  }//}}}

  function getPathNames()//{{{
  {
    var lStrReplacedPathName =
      window.location.pathname.replace(/(^\/|\/$)/g, '');
    var lArrayPathName = lStrReplacedPathName.split('/');
    if (lArrayPathName && lStrReplacedPathName.length > 0) {
      return lArrayPathName;
    } else {
      return null;
    }
  }//}}}

  function getHosts()//{{{
  {
    var lRegexHost = /^(\w+)[.]+(.*):*(\d*)/i;
    var lArrayHostMatch = window.location.hostname.match(lRegexHost);
    if (lArrayHostMatch) {
      return lArrayHostMatch.filter((v, i) => (i !== 0 && v !== ""));
    } else {
      return [ window.location.hostname ];
    }
  }//}}}

  function initTextStyle(pElement)//{{{
  {
    pElement.style.fontFamily = 'sans-serif';
    pElement.style.fontSize   = sStrStyleBaseFontSize;
    textStyleLikeAdobe(pElement);
  }//}}}

  function textStyleLikeAdobe(pElement)//{{{
  {
    pElement.style.color      = sStrStyleFontColor;
    pElement.style.textshadow = `0 0 1px rgba(${sStrStyleFontColor}, .1)`;
    pElement.style.fontSmoothing = 'antialiased';
  }//}}}

  function createParentElement()//{{{
  {
    var lElParentDiv = sElDiv.cloneNode();
    lElParentDiv.style.position   = 'fixed';
    lElParentDiv.style.background = sStrStyleLightPrimaryColor;
    lElParentDiv.style.boxShadow  = `0px 1px 3px 0 ${sStrBorderColor}`;
    lElParentDiv.style.width      = "42em";
    lElParentDiv.style.height     = "32em";
    lElParentDiv.style.display    = 'none';
    lElParentDiv.style.zIndex     = '100';

    lElParentDiv.style.left =
      (window.innerWidth - getNumber(lElParentDiv.style.width) *
      getNumber(sStrStyleBaseFontSize)) / 2.0 + 'px';
    lElParentDiv.style.top =
      (window.innerHeight - getNumber(lElParentDiv.style.height) *
      getNumber(sStrStyleBaseFontSize)) / 2.0 + 'px';

    return lElParentDiv;
  }//}}}

  // title
  function createTitleBar()//{{{
  {
    var lElTitleBar       = sElDiv.cloneNode();
    var lElTitle          = sElSpan.cloneNode();
    var lElTitleBarButton = sElButton.cloneNode();

    lElTitleBar.style.padding    = '1em';
    lElTitleBar.style.fontWeight = 'bold';
    lElTitleBar.style.background = sStrStylePrimaryColor;

    lElTitle.style.fontSize = '1.5em';
    lElTitle.textContent    = "Tab Memory Purge";

    lElTitleBarButton.style.position = 'absolute';
    lElTitleBarButton.style.right    = '1em';
    lElTitleBarButton.textContent    = "x";
    lElTitleBarButton.onclick        = parentClose;

    lElTitleBar.appendChild(lElTitle);
    lElTitleBar.appendChild(lElTitleBarButton);

    return lElTitleBar;
  }//}}}

  // inside exclude dialog.
  function createExcludeDialog()//{{{
  {
    var lStrDialog     = sElDiv.cloneNode();
    var lElUrl         = sElDiv.cloneNode();
    var lElMessage1    = sElDiv.cloneNode();
    var lElMessage2    = sElDiv.cloneNode();
    var lElMessage2In1 = sElDiv.cloneNode();
    var lElMessage2In2 = sElDiv.cloneNode();
    var lElRangess     = sElDiv.cloneNode();
    var lElSpanHost    = sElSpan.cloneNode();
    var lElInputHost   = document.createDocumentFragment();
    var lElPageSpan    = document.createDocumentFragment();
    var lElPage        = document.createDocumentFragment();
    var lStrHostName   = sStrHostName;
    var lStrPathName   = sStrPathName;

    lStrDialog.style.padding   = "1em";
    lStrDialog.style.textAlign = "center";

    lElUrl.setAttribute('id', sStrIdNameOfTargetUrl);
    lElUrl.style.fontSize = '1.5em';
    lElUrl.style.padding  = '2em 0';
    lElUrl.textContent    = sStrHostName + sStrPathName;

    lElMessage1.textContent    = chrome.i18n.getMessage('exclude_dialog_mes1');

    lElMessage2In1.textContent = chrome.i18n.getMessage('exclude_dialog_mes2');
    lElMessage2In2.textContent = chrome.i18n.getMessage('exclude_dialog_mes3');

    lElSpanHost.style.padding = "0 1.5em;";
    lElSpanHost.textContent   = "Host:";

    lElInputHost   = sElInput.cloneNode();
    lElInputHost.min   = 0;
    lElInputHost.max   = sArrayHosts.length-1;
    lElInputHost.value = 0;
    lElInputHost.addEventListener('change', pEvent => {
      lStrHostName = sStrHostName;

      for (var i = 0; i < pEvent.target.value; i = (i + 1) | 0) {
        lStrHostName =
          lStrHostName.replace(new RegExp(`${sArrayHosts[i]}[.]+`), '*');
      }
      lElUrl.textContent = lStrHostName + lStrPathName;
    });

    lElMessage2.appendChild(lElMessage2In1);
    lElMessage2.appendChild(lElMessage2In2);

    lStrDialog.appendChild(lElMessage1);
    lStrDialog.appendChild(lElUrl);
    lStrDialog.appendChild(lElMessage2);

    lElSpanHost.appendChild(lElInputHost);
    lElRangess.appendChild(lElSpanHost);

    if (sArrayPaths) {
      lElPageSpan = lElSpanHost.cloneNode();
      lElPageSpan.textContent = "Page:";
      
      lElPage       = sElInput.cloneNode();
      lElPage.min   = 0;
      lElPage.max   = sArrayPaths.length;
      lElPage.value = 0;
      lElPage.addEventListener('change', pEvent => {
        var lNumValueLength = pEvent.target.value;
        var i = 0;
        lStrPathName = '';

        for (i = 0; i < lNumValueLength; i = (i + 1) | 0) {
          lStrPathName += '/' + sArrayPaths[i];
        }
        lStrPathName +=
          (i !== 0 && lElPage.max > lNumValueLength) ?
          '/*' :
          (location.pathname[location.pathname.length - 1] === '/' ? '/' : '');
        lElUrl.textContent = lStrHostName + lStrPathName;
      });

      lElPageSpan.appendChild(lElPage);
      lElRangess.appendChild(lElPageSpan);
    }

    lStrDialog.appendChild(lElRangess);

    return lStrDialog;
  }//}}}

  function getAddUrl()//{{{
  {
    var lElAddUrl  = document.createDocumentFragment();
    var lStrAddUri = "";

    lElAddUrl  = sElParent.querySelector(`#${sStrIdNameOfTargetUrl}`);
    lStrAddUri = lElAddUrl.textContent.replace(/\*/g, '');

    return lStrAddUri;
  }//}}}

  function setAddUrlToExcludeList(pStrStorageName)//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(pStrStorageName, pArrayItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        var lArrayCheckItems = [];
        var lObjWrite        = {};
        var lStrAddUri       = "";
        var lStrItem         = "";
        var lBoolExclude     = false;

        lStrAddUri = getAddUrl();
        lStrItem   = pArrayItems[pStrStorageName] ||
                     gMapDefaultValues.get(pStrStorageName);
        lStrItem   = lStrItem.replace(/\n$/, '').trim();

        lArrayCheckItems = lStrItem.split('\n');
        lBoolExclude = lArrayCheckItems.some(pValue => {
          return pValue.trim() === lStrAddUri;
        });
        if (lBoolExclude) {
          resolve();
          return;
        }

        lStrItem += '\n' + lStrAddUri;

        lObjWrite = {};
        lObjWrite[pStrStorageName] = lStrItem;
        chrome.storage.local.set(lObjWrite, resolve);
      });
    });
  }//}}}

  function addExclusionListClicked(pStrOptionName)//{{{
  {
    setAddUrlToExcludeList(pStrOptionName)
    .then(() => {
      chrome.runtime.sendMessage(
        { event: 'load_options_and_reload_current_tab' });
      parentClose();
    })
    .catch(pErr => console.error(pErr));
  }//}}}

  function parentClose() {//{{{
    sElParent.style.display = 'none';
  }//}}}

  chrome.runtime.onMessage.addListener(
    (pObjMessage, pObjSender, pFuncSendResponse) => {//{{{
    switch (pObjMessage.event) {
      case 'hideExcludeDialog':
        sElParent.style.display = 'none';
        break;
      case 'showExcludeDialog':
        sElParent.style.display = 'block';
        break;
      case 'getExcludeDialogState':
        if (typeof pFuncSendResponse === 'function') {
          pFuncSendResponse(sElParent.style.display !== 'none');
        } else {
          throw new Error("Doesn't find callback function.");
        }
        break;
    }
  });//}}}

  //{{{ variable in script.
  var sStrStyleBaseFontSize      = '12px';
  var sStrStyleFontColor         = '#212121';
  var sStrStylePrimaryColor      = '#03A9F4';
  var sStrStyleLightPrimaryColor = '#BBDEFB';
  var sStrBorderColor            = '#727272';

  var sStrHostName = window.location.hostname;
  var sStrPathName = '';

  var sArrayHosts = getHosts();
  var sArrayPaths = getPathNames();

  // idNames
  var sStrIdNameOfTargetUrl   = "_TMP_ADDURL";

  // main elements.
  var lElBody   = document.getElementsByTagName('body')[0];
  var sElParent = document.createDocumentFragment();
  var sElBr     = document.createElement('br');
  var sElDiv    = document.createElement('div');
  var sElSpan   = document.createElement('span');
  var sElButton = document.createElement('button');
  var sElInput  = document.createElement('input');
  initTextStyle(sElDiv);
  initTextStyle(sElSpan);
  initTextStyle(sElButton);
  initTextStyle(sElInput);
  sElInput.type           = 'range';
  sElInput.style.position = "relative";
  sElInput.style.top      = "0.4em";

  // clone elements.
  var sElExcludeDialogButtons        = document.createDocumentFragment();
  var sElExcludeButtonTemplate       = document.createDocumentFragment();
  var sElAddExcludeListButton        = document.createDocumentFragment();
  var sElAddKeybindExcludeListButton = document.createDocumentFragment();
  var sElAddTempExcludeListButton    = document.createDocumentFragment();
  var sElCancelButton                = document.createDocumentFragment();

  var sArrayButtons = [];
  //}}}

  // buttons
  sElExcludeDialogButtons                 = sElDiv.cloneNode();
  sElExcludeDialogButtons.style.position  = "absolute";
  sElExcludeDialogButtons.style.right     = "1em";
  sElExcludeDialogButtons.style.bottom    = "1em";
  sElExcludeDialogButtons.style.textAlign = "right";

  sElExcludeButtonTemplate              = sElButton.cloneNode();
  sElExcludeButtonTemplate.style.width  = '50%';
  sElExcludeButtonTemplate.style.margin = '0.16em';

  sElAddExcludeListButton        = sElExcludeButtonTemplate.cloneNode();
  sElAddKeybindExcludeListButton = sElExcludeButtonTemplate.cloneNode();
  sElAddTempExcludeListButton    = sElExcludeButtonTemplate.cloneNode();

  sElCancelButton                = sElExcludeButtonTemplate.cloneNode();
  sElCancelButton.textContent    = chrome.i18n.getMessage('cancel');
  sElCancelButton.onclick        = parentClose;

  sElAddExcludeListButton.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_exclude_list');
  sElAddExcludeListButton.addEventListener('click', () => {
    addExclusionListClicked('exclude_url');
  });

  sElAddKeybindExcludeListButton.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_keybind_exclude_list');
  sElAddKeybindExcludeListButton.addEventListener('click', () => {
    addExclusionListClicked('keybind_exclude_url');
  });

  sElAddTempExcludeListButton.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_temp_exclude_list');
  sElAddTempExcludeListButton.addEventListener('click', () => {
    var lStrUri = getAddUrl();
    chrome.runtime.sendMessage(
      { event: 'add_to_temp_exclude_list', url: lStrUri });
    parentClose();
  });

  // be adding the elements to parent elements.
  sElParent = createParentElement();
  sElParent.appendChild(createTitleBar());
  sElParent.appendChild(createExcludeDialog());

  sArrayButtons = [
    sElAddExcludeListButton,
    sElAddKeybindExcludeListButton,
    sElAddTempExcludeListButton
  ];
  sArrayButtons.forEach(v => {
    sElExcludeDialogButtons.appendChild(v);
    sElExcludeDialogButtons.appendChild(sElBr);
  });
  sElExcludeDialogButtons.appendChild(sElCancelButton);

  sElParent.appendChild(sElExcludeDialogButtons); // add to parent.

  // show.
  lElBody.appendChild(sElParent);

  console.debug("exclude Dialog of Tab Memory Purge is loaded.");
})(this, this.document);
