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
        expect( function() { Unique([]) } ).not.toThrow();
        expect( function() { Unique(1) } ).toThrow();
        expect( function() { Unique({}) } ).toThrow();
        expect( Unique(["array", "bebe", "array", "bebe"]) ).toEqual(["array",
                                                                      "bebe"]);
    });

    it("trim", function() {
        expect(function() { Trim("") }).not.toThrow();
        expect(function() { Trim(1) }).toThrow();
        expect(function() { Trim(new Object()) }).toThrow();
        expect( Trim(" hello  ") ).toEqual("hello");
    });

    it('ArrayEqual', function() {
        var i = [ 1, 2, 3, 4, 5 ];
        var j = [ 1, 2, 3, 4, 5 ];
        var z = [ 1, 2, 3, 4 ];
        expect(ArrayEqual(i, j)).toBeTruthy();
        expect(ArrayEqual(i, z)).toBeFalsy();
    });

    it('Sleep', function() {
        /* var d1 = new Date().getTime();
        Sleep(1);
        var d2 = new Date().getTime();
        expect(d2 - d1).toBeLessThan(1.1); */
    });
});
