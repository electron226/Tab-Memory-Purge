/** ページのスクロール量を取得するのに使用する */
function getScrollPosition()
{
  'use strict';

  var obj = {};
  obj.x = document.scrollingElement.scrollLeft ||
           document.documentElement.scrollLeft ||
           document.body.scrollLeft;
  obj.y = document.scrollingElement.scrollLeft ||
           document.documentElement.scrollTop ||
           document.body.scrollTop;
  return obj; // executeScriptのコールバック関数に返る値
}

getScrollPosition();
