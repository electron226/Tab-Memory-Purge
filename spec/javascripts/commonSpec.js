describe('Common Function', function () {
    it("typeofやinstanceofを統合", function() {
        expect( getType({}) ).toEqual('object');
        expect( getType(undefined) ).toEqual('undefined');
        expect( getType(null) ).toEqual('null');
        expect( getType(function(){}) ).toEqual('function');
        expect( getType([]) ).toEqual('array');
        expect( getType('string') ).toEqual('string');
        expect( getType(1) ).toEqual('number');
        expect( getType(true) ).toEqual('boolean');
    });

    it("重複要素削除", function() {
        expect( function() { unique([]) } ).not.toThrow();
        expect( function() { unique(1) } ).toThrow();
        expect( function() { unique({}) } ).toThrow();
        expect( unique(["array", "bebe", "array", "bebe"]) ).toEqual(["array",
                                                                      "bebe"]);
    });

    it("trim", function() {
        expect(function() { trim("") }).not.toThrow();
        expect(function() { trim(1) }).toThrow();
        expect(function() { trim(new Object()) }).toThrow();
        expect( trim(" hello  ") ).toEqual("hello");
    });

    it('arrayEqual', function() {
        var i = [ 1, 2, 3, 4, 5 ];
        var j = [ 1, 2, 3, 4, 5 ];
        var z = [ 1, 2, 3, 4 ];
        expect(arrayEqual(i, j)).toBeTruthy();
        expect(arrayEqual(i, z)).toBeFalsy();
    });

    it('sleep', function() {
        /* var d1 = new Date().getTime();
        sleep(1);
        var d2 = new Date().getTime();
        expect(d2 - d1).toBeLessThan(1.1); */
    });
});
