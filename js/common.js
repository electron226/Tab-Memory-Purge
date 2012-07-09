/**
* 値が存在するか判定
*
* @param {Object} object 判定するオブジェクト
* @return 存在していればtrue, していなければfalse
*/
function isExist(value)
{
    return value !== null && value !== undefined;
}

/**
* Objectか判定
*
* @param {Any} obj 値
* @return Objectならtrue, 違うならfalse
*/
function isObject(obj)
{
    return typeof(obj) == "object";
}

/**
* 関数か判定
*
* @param {Any} obj 値
* @return 関数ならtrue, 違うならfalse
*/
function isFunction(obj)
{
    return typeof(obj) == "function";
}

/**
* 指定ミリ秒停止させる
*
* @param {Number} time 停止させる時間(ミリ秒)
* @return なし
*/
function Sleep(time)
{
    var d1 = new Date().getTime();
    var d2 = new Date().getTime();
    while (d2 < d1 + time) {
        d2 = new Date().getTime();
    }
}
