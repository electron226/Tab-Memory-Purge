/*jshint globalstrict: true*/
"use strict";

describe('Common Function', function () {
    it("typeofやinstanceofを統合", function() {
        expect( toType({}) ).toEqual('object');
        expect( toType(undefined) ).toEqual('undefined');
        expect( toType(null) ).toEqual('null');
        expect( toType(function(){}) ).toEqual('function');
        expect( toType([]) ).toEqual('array');
        expect( toType('string') ).toEqual('string');
        expect( toType(1) ).toEqual('number');
        expect( toType(true) ).toEqual('boolean');
    });

    it("重複要素削除", function() {
        expect( function() { unique([]); } ).not.toThrow();
        expect( function() { unique(1); } ).toThrow();
        expect( function() { unique({}); } ).toThrow();
        expect( unique(["array", "bebe", "array", "bebe"]) ).toEqual(["array",
                                                                      "bebe"]);
    });

    it("trim", function() {
        expect(function() { trim(""); }).not.toThrow();
        expect(function() { trim(1); }).toThrow();
        expect(function() { trim({}); }).toThrow();
        expect( trim(" hello  ") ).toEqual("hello");
    });

    it('arrayEqual', function() {
        var i = [ 1, 2, 3, 4, 5 ];
        var j = [ 1, 2, 3, 4, 5 ];
        var z = [ 1, 2, 3, 4 ];
        expect(arrayEqual(i, j)).toBeTruthy();
        expect(arrayEqual(i, z)).toBeFalsy();
    });
});
