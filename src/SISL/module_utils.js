define(["./compiled"],function(){
    console.warn('Hard-coded bytesize of 8 ??')
    var byteSize = 8;
    var Module = window.Module || {};
    Module.Utils = {};

    Module.Utils.copyJSArrayToC = function(array,type){
        var buffer = Module._malloc(4*4*array.length);

        for (var i=0; i<array.length; i++){
            Module.setValue(buffer + i*byteSize, array[i], type || 'double');
        }

        return buffer;
    };

    Module.Utils.copyCArrayToJS = function(pointer, length){
        var array = [];
        for (var i=0; i<length; i++){
            array[i] = Module.getValue(pointer + byteSize*i, 'double');
        }
        return array;
    };

    Module.Utils.freeCArrayAtPointer = function(pointer){
        Module._free(pointer);
    };

    Module.Utils.generateUniformKnotVector = function(numControlPoints,curveOrder){
        // http://www.cs.mtu.edu/~shene/COURSES/cs3621/NOTES/INT-APP/PARA-knot-generation.html
        // #knots = #control pts + curve order
        // curve order = degree + 1
        // the first p+1 and last p+1 knots are 0's and 1's, respectively, where p=degree=order-1
        var knotVector = [],
            degree = curveOrder-1;
        
        for (var a=0; a < curveOrder; a++){
            knotVector.push(0);
        }
        var internalKnotCount = (numControlPoints + curveOrder) - degree - curveOrder;
        var i = 0;
        for (i; i<internalKnotCount;i++) {
            knotVector.push((i+1)/internalKnotCount);
        }
        for (var b=0; b < degree; b++){
            knotVector.push(1);
        }

        return knotVector;
    };

    return Module;
});

