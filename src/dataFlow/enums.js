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
            COMPARATOR: 7,
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
                7: "Comparison Operator",
                8: "List / Array"
            }
        },

        // Comparators are handled in Javascript land as string literals that are then subbed in directly to python statements
        // This is because it's not easily possible to set a comparator to a variable, then build a statement out of it.
        // Consider "a < b". In that statement, a and b are variables. But if i wanted to make "<" a variable in Python,
        // I need to use the built-in "operator" module. Here's an example of generated python for masking a Dataframe
        // using an operator that's first persisted to a variable:
        // import operator
        // opFunction = operator.gt
        // print( DF[ opFunction( DF[fieldname], val) ] ) # equivalent to DF [ DF[fieldname] > val ], except I can store ">" to a variable that can be passed around Orchestra
        COMPARATORS: { //https://docs.python.org/2/library/operator.html
            "==": "op.eq",
            "!=": "op.ne",
            "<": "op.lt",
            ">": "op.gt",
            ">=": "op.ge",
            "<=": "op.le",
            "is": "is_",
            "is not": "is_not"
        },
        // BOOLEANS: [
        //     "True",
        //     "False"
        // ]
    };
});
