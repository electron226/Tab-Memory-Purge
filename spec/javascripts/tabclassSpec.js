describe('KeyList class', function() {
    var instance = null;
    var key = undefined;

    beforeEach(function() {
        instance = new KeyList();
        key = 0;
    });

    it('call push', function() {
        expect(instance.data[key]).toBeUndefined();
        instance.push({ key: key, value: 5 });
        expect(instance.data[key][0]).toEqual(5);
        expect(instance.data[key].length).toEqual(1);
    });

    it('call insert', function() {
        instance.push({ key: key, value: 1 });
        instance.push({ key: key, value: 2 });
        instance.push({ key: key, value: 3 });
        instance.push({ key: key, value: 4 });

        var id = 5;
        var index = 1;
        instance.insert({ key: key, index: index, value: id});
        expect(instance.data[key][index]).toEqual(id);

        id = 6;
        index = 7;
        instance.insert({ key: key, index: index, value: id});
        expect(instance.data[key][index]).toBeUndefined();
        expect(instance.data[key].length).toEqual(6);
    });

    it('call move', function() {
        instance.push({ key: key, value: 1 });
        instance.push({ key: key, value: 2 });
        instance.push({ key: key, value: 3 });
        instance.push({ key: key, value: 4 });
        instance.push({ key: key, value: 5 });

        var fromIndex = 4;
        var toIndex = 2;
        instance.move({ key: key,
                        fromIndex: fromIndex,
                        toIndex: toIndex });
        var found = instance.find({ key: key, value: 5 });
        expect(found.index).toEqual(toIndex);

        expect(instance.data[key]).toEqual([1, 2, 5, 3, 4]);
    });

    it('call find', function() {
        instance.push({ key: key, value: 2 });
        instance.push({ key: key, value: 3 });
        instance.push({ key: key, value: 5 });

        var found = instance.find({ key: key, value: 3 });
        expect(found.index).toEqual(1);
        var found = instance.find({ value: 3 });
        expect(found.key).toEqual(key);

        expect(function() {
            instance.find({ key: key, value: 6 }) }).toThrow();
    });

    it('call remove', function() {
        instance.push({ key: key, value: 2 });
        instance.push({ key: key, value: 3 });
        instance.push({ key: key, value: 5 });

        // remove
        var value = 2;
        expect(instance.data[key].length).toEqual(3);
        expect(function() {
            instance.find({ key: key, value: value });
        }).not.toThrow();
        instance.remove({ key: key, value: value });
        expect(function() {
            instance.find({ key: key, value: value });
        }).toThrow();
        expect(instance.data[key].length).toEqual(2);

        var value = 3;
        expect(function() {
            instance.find({ key: key, value: value });
        }).not.toThrow();
        instance.remove({ key: key });
        expect(instance.data[key]).toBeUndefined();
    });

    it('call get', function() {
        instance.push({ key: key, value: 2 });
        instance.push({ key: key, value: 3 });
        instance.push({ key: key, value: 5 });

        expect(instance.get({ key: key, index: 2 })).toEqual(5);
        expect(function() {
            instance.get({ key: key, index: 5 });
        }).toThrow();
    });

    it('call length', function() {
        instance.push({ key: key, value: 2 });
        instance.push({ key: key, value: 3 });
        instance.push({ key: key, value: 5 });

        expect(instance.length(key)).toEqual(3);
        expect(instance.length()).toEqual(1);
    });

    it('call isEmpty', function() {
        expect(function() { instance.isEmpty() }).toThrow();
        expect(instance.isEmpty(key)).toBeTruthy();
        instance.push({ key: key, value: 2 });
        expect(instance.isEmpty(key)).toBeFalsy();
    });
});

describe('TabIdHistory class', function() {
    var instance = null;
    var windowId = undefined;

    beforeEach(function() {
        instance = new TabIdHistory(2);
        windowId = 0;
    });

    it('initialized history length', function() {
        instance = new TabIdHistory(6);
        expect(instance.push({ windowId: windowId, tabId: 0 })).toBeUndefined();
        expect(instance.history[windowId].length).toEqual(6);
    });

    it('call push', function() {
        expect(instance.push({ windowId: windowId, tabId: 0 })).toBeUndefined();
        expect(instance.push({ windowId: windowId, tabId: 1 })).toBeUndefined();
        expect(instance.push({ windowId: windowId, tabId: 2 })).toEqual(0);
        expect(instance.history[windowId].length).toEqual(2);
        expect(instance.push({ windowId: windowId, tabId: 3 })).toEqual(1);
        expect(instance.push({ windowId: windowId, tabId: 3 })).toBeNull();
    });

    it('call remove', function() {
        expect(instance.push({ windowId: windowId, tabId: 1 })).toBeUndefined();
        expect(instance.push({ windowId: windowId, tabId: 2 })).toBeUndefined();

        // remove
        instance.remove({ windowId: windowId, tabId: 0 });
        expect(instance.history[windowId][0]).toEqual(1);
        expect(instance.history[windowId][1]).toEqual(2);

        instance.remove({ windowId: windowId, tabId: 1 });
        expect(instance.history[windowId][0]).toEqual(2);
        expect(instance.history[windowId][1]).toEqual(2);

        instance.remove({ windowId: windowId, tabId: 2 });
        expect(instance.history[windowId][0]).toBeUndefined();
        expect(instance.history[windowId][1]).toBeUndefined();

        instance.remove({ windowId: windowId });
        expect(instance.history[windowId]).toBeUndefined();
    });

    it('call get', function() {
        expect(instance.push({ windowId: windowId, tabId: 0 })).toBeUndefined();
        expect(instance.push({ windowId: windowId, tabId: 1 })).toBeUndefined();
        expect(instance.get({ windowId: windowId, index: 1 })).toEqual(1);
        expect(function() {
            instance.get({ windowId: windowId, index: 5 });
        }).toThrow();
    });

    it('call getlastPrevious', function() {
        expect(instance.push({ windowId: windowId, tabId: 1 })).toBeUndefined();
        expect(instance.push({ windowId: windowId, tabId: 2 })).toBeUndefined();

        // lastPrevious
        expect(instance.lastPrevious(windowId)).toEqual(2);
    });

    it('call update', function() {
        expect(instance.push({ windowId: windowId, tabId: 0 })).toBeUndefined();
        expect(instance.push({ windowId: windowId, tabId: 1 })).toBeUndefined();
        expect(function() {
            instance.update({ windowId: windowId, index: 5, tabId: 5 });
        }).toThrow();

        var index = 0;
        expect(instance.update(
            { windowId: windowId, index: index, tabId: 5 })).toEqual(0);
        expect(instance.history[windowId][index]).toEqual(5);
    });
});
