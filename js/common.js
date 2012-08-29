function isFunction(obj)
{
    var getType = {};
    return obj && getType.toString.call(obj) == '[object Function]';
}

function isObject(obj)
{
  return obj instanceof Object &&
      Object.getPrototypeOf(obj) === Object.prototype;
}

function GetStorage(key, default_value)
{
    return localStorage[key] ? localStorage[key] : default_value;
}
