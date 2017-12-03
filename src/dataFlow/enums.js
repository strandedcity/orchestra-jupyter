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
            STRING: 3,
            DATAFRAME: 4,
            WILD: 5,
            NULL: 6,
        UNUSED1: 7,     // missing indexes causes problems eg: with the "flatten" component
            ARRAY: 8,
        },
        KEYS: {
            SHIFT: 16
        },
        DISPLAY_NAMES: {
            INTERPRET_AS: {
                0: "Item",
                1: "List",
                2: "Tree"
            },
            OUTPUT_TYPES: {
                0: "Number",
                1: "Boolean",
                2: "Numpy Array",
                3: "String",
                4: "Pandas Dataframe",
                5: "(Any Data Type)",
                6: "Null",
                7: "Unused",
                8: "List / Array"
            }
        }
    };
});
