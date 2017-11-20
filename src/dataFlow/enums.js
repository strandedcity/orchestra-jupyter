define([],function(){
    ////////// IMPORTANT NOTE!
    // THESE ENUMS CAN BE APPENDED TO, BUT SHOULD NOT BE MODIFIED
    // When components are stored, Their data types are stored as integers,
    // the VALUES in this list (not the keys). Probably not the best design
    // decision, but I should be prepared to change it the hard way if at all
    // JSON for an input object looks like this:
    //{
    //    "shortName": "X",
    //    "id": "c219",
    //    "connections": [
    //        "c179"
    //    ],
    //    "type": 0
    //},

    return {
        INTERPRET_AS: {
            ITEM: 0,
            LIST: 1,
            TREE: 2
        },
        OUTPUT_TYPES: {
            NUMBER: 0,
            BOOLEAN: 1,
            NUMPY_ARR: 2,
            WILD: 5,
            NULL: 6,
            ARRAY: 8,
        },
        KEYS: {
            SHIFT: 16
        }
    };
});
