/** ページのスクロール量を取得するのに使用する */
var rObj = {};
rObj.x = document.documentElement.scrollLeft || document.body.scrollLeft;
rObj.y = document.documentElement.scrollTop || document.body.scrollTop;
// jshint ignore:start
rObj; // executeScriptのコールバック関数に返る値
// jshint ignore:end
