describe('TabIdList class', function() {
    var instance = null;
    var windowId = undefined;

    beforeEach(function() {
        instance = new TabIdList();
        windowId = 0;
    });

    it('call add', function() {
        expect(instance.data[windowId]).toBeUndefined();
        instance.add({ windowId: windowId, id: 5 });
        expect(instance.data[windowId][0]).toEqual(5);
        expect(instance.data[windowId].length).toEqual(1);
    });

    it('call insert', function() {
        instance.add({ windowId: windowId, id: 1 });
        instance.add({ windowId: windowId, id: 2 });
        instance.add({ windowId: windowId, id: 3 });
        instance.add({ windowId: windowId, id: 4 });

        var id = 5;
        var index = 1;
        instance.insert({ windowId: windowId, index: index, id: id});
        expect(instance.data[windowId][index]).toEqual(id);

        id = 6;
        index = 7;
        instance.insert({ windowId: windowId, index: index, id: id});
        expect(instance.data[windowId][index]).toBeUndefined();
        expect(instance.data[windowId].length).toEqual(6);
    });

    it('call move', function() {
        instance.add({ windowId: windowId, id: 1 });
        instance.add({ windowId: windowId, id: 2 });
        instance.add({ windowId: windowId, id: 3 });
        instance.add({ windowId: windowId, id: 4 });
        instance.add({ windowId: windowId, id: 5 });

        var fromIndex = 4;
        var toIndex = 2;
        instance.move({ windowId: windowId,
                        fromIndex: fromIndex,
                        toIndex: toIndex });
        var found = instance.find({ windowId: windowId, id: 5 });
        expect(found.index).toEqual(toIndex);

        expect(instance.data[windowId]).toEqual([1, 2, 5, 3, 4]);
    });

    it('call find', function() {
        instance.add({ windowId: windowId, id: 2 });
        instance.add({ windowId: windowId, id: 3 });
        instance.add({ windowId: windowId, id: 5 });

        var found = instance.find({ windowId: windowId, id: 3 });
        expect(found.index).toEqual(1);
        var found = instance.find({ id: 3 });
        expect(found.windowId).toEqual(windowId);

        expect(function() {
            instance.find({ windowId: windowId, id: 6 }) }).toThrow();
    });

    it('call remove', function() {
        instance.add({ windowId: windowId, id: 2 });
        instance.add({ windowId: windowId, id: 3 });
        instance.add({ windowId: windowId, id: 5 });

        // remove
        var id = 2;
        expect(instance.data[windowId].length).toEqual(3);
        expect(function() {
            instance.find({ windowId: windowId, id: id });
        }).not.toThrow();
        instance.remove({ windowId: windowId, id: id });
        expect(function() {
            instance.find({ windowId: windowId, id: id });
        }).toThrow();
        expect(instance.data[windowId].length).toEqual(2);

        var id = 3;
        expect(function() {
            instance.find({ windowId: windowId, id: id });
        }).not.toThrow();
        instance.remove({ windowId: windowId });
        expect(instance.data[windowId]).toBeUndefined();
    });

    it('call get', function() {
        instance.add({ windowId: windowId, id: 2 });
        instance.add({ windowId: windowId, id: 3 });
        instance.add({ windowId: windowId, id: 5 });

        expect(instance.get({ windowId: windowId, index: 2 })).toEqual(5);
        expect(function() {
            instance.get({ windowId: windowId, index: 5 });
        }).toThrow();
    });

    it('call Length', function() {
        instance.add({ windowId: windowId, id: 2 });
        instance.add({ windowId: windowId, id: 3 });
        instance.add({ windowId: windowId, id: 5 });

        expect(instance.Length(windowId)).toEqual(3);
    });
});

describe('TabIdHistory class', function() {
    var instance = null;
    var windowId = undefined;

    beforeEach(function() {
        instance = new TabIdHistory();
        windowId = 0;
    });

    it('initialized history', function() {
        instance = new TabIdHistory();
    });

    it('call update and length', function() {
      expect(instance.Length(windowId)).toEqual(0);
      instance.update({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(1);
      instance.update({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(2);
      instance.update({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(3);

      expect(function() {
        instance.update({ windowId: windowId, id: 2 });
      }).not.toThrow();
      expect(function() {
        instance.update({ windowId: windowId, index: 5 });
      }).toThrow();
    });

    it('call remove', function() {
      expect(instance.Length(windowId)).toEqual(0);
      instance.update({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(1);
      instance.update({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(2);
      instance.update({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(3);

      // remove
      instance.remove({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(2);
      expect(instance.history[windowId][0]).toEqual(1);

      instance.remove({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(1);
      expect(instance.history[windowId][0]).toEqual(1);
      
      instance.remove({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(0);
    });

    it('call remove windowId', function() {
      // remove windowId
      expect(instance.Length()).toEqual(0);

      expect(instance.Length(windowId)).toEqual(0);
      instance.update({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(1);
      instance.update({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(2);

      expect(instance.Length()).toEqual(1);

      var differId = 555;
      expect(instance.Length(differId)).toEqual(0);
      instance.update({ windowId: differId, id: 3 });
      expect(instance.Length(differId)).toEqual(1);
      instance.update({ windowId: differId, id: 4 });
      expect(instance.Length(differId)).toEqual(2);

      expect(instance.Length()).toEqual(2);

      instance.remove({ windowId: windowId });
      expect(instance.Length()).toEqual(1);
      expect(function() {
        instance.get({ windowId: windowId, index: 0 });
      }).toThrow();

      expect(instance.get({ windowId: differId, index: 0 })).toEqual(3);
    });

    it('call isEmpty', function() {
      expect(instance.isEmpty(windowId)).toEqual(true);

      expect(instance.Length(windowId)).toEqual(0);
      instance.update({ windowId: windowId, id: 0 });

      expect(instance.isEmpty(windowId)).toEqual(false);

      expect(instance.Length(windowId)).toEqual(1);
      instance.update({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(2);
      instance.update({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(3);

      // remove
      instance.remove({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(2);
      expect(instance.history[windowId][0]).toEqual(1);

      instance.remove({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(1);
      expect(instance.history[windowId][0]).toEqual(1);
      
      instance.remove({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(0);

      expect(instance.isEmpty(windowId)).toEqual(true);
    });

    it('call get', function() {
      expect(instance.Length(windowId)).toEqual(0);
      instance.update({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(1);
      instance.update({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(2);
      instance.update({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(3);

      expect(instance.get({ windowId: windowId, index: 1 })).toEqual(1);

      expect(function() {
        instance.get({ windowId: windowId, index: -1 });
      }).toThrow();
      expect(function() {
        instance.get({ windowId: windowId, index: 4 });
      }).toThrow();

      expect(function() {
        instance.get({ windowId: '', index: 1 });
      }).toThrow();
      expect(function() {
        instance.get({ windowId: windowId, index: '' });
      }).toThrow();
      expect(function() {
        instance.get({ windowId: windowId });
      }).toThrow();
      expect(function() {
        instance.get({ index: 1 });
      }).toThrow();
      expect(function() {
        instance.get();
      }).toThrow();
    });

    it('call lastPrevious', function() {
      expect(instance.Length(windowId)).toEqual(0);
      instance.update({ windowId: windowId, id: 0 });
      expect(instance.Length(windowId)).toEqual(1);
      instance.update({ windowId: windowId, id: 1 });
      expect(instance.Length(windowId)).toEqual(2);
      instance.update({ windowId: windowId, id: 2 });
      expect(instance.Length(windowId)).toEqual(3);

      // lastPrevious
      expect(instance.lastPrevious(windowId)).toEqual(2);
      expect(instance.lastPrevious(windowId, 2)).toEqual(1);
      expect(instance.lastPrevious(windowId, 3)).toEqual(0);
    });
});
