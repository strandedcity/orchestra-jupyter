define([],function(){
    var frozen = false;

    return {
        setFrozen: function (val) {
            frozen = val;
        },
        getFrozen: function () {
            return frozen;
        }
    }
});