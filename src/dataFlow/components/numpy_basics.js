define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    components.NumpySlice = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array to Slice"},
                {required: false, default: 'null', shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start Index of Slice"}, // default to null so that numpy defaults can be used instead
                {required: false, default: 'null', shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End Index of Slice"},
                {required: false, default: 'null', shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Step"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "1D Sub Array"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %>[ <% if (IN_S != 'null'){ %><%= IN_S %><% } %> : <% if (IN_E != 'null'){ %><%= IN_E %><% } %> : <% if (IN_N != 'null'){ %><%= IN_N %><% } %>]\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Slice a Numpy Array",
        "desc": "Create a slice (sub-array) of a numpy array based on a start index, end index, and number of steps between each index."
    });


    components.NumpyExtractItem = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"},
                {required: false, default: 0, shortName: "I", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs:DataFlow.INTERPRET_AS.LIST ,desc: "Index of Item to Extract, <= Array Dimension"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR},
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.WILD}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Extract Item"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = (<%= IN_A %>[<%= IN_I %>], <%= IN_A %>[<%= IN_I %>])\n" // "just works" if I = [2,3,4], but outputs an array in that case
            });

            this.base_init(args);
        }
    },{
        "label": "Extract an Item from a Numpy Array",
        "desc": "Extract an Item from Numpy array using Indexing. Position in a multi-dimensional array can be specified by subsequent items in the 'Index' input, which will be interpreted as a list."
    });

    components.NumpyExtractColumn = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array, 2+ Dimensions"},
                {required: false, default: 0, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Index of Column to Extract"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Extract Column"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %>[:,<%= IN_C %>]\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Extract the first column of a Numpy Array With 2 or more dimensions",
        "desc": "Extract the first column of a Numpy array using a combination of index and slice methods eg, array[:,(column number)]"
    });

    components.NumpyExtractRow = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array, 2+ Dimensions"},
                {required: false, default: 0, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Index of Row to Extract"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Extract Row"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %>[<%= IN_C %>,:]\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Extract the first row of a Numpy Array With 2 or more dimensions",
        "desc": "Extract the first row of a Numpy array using a combination of index and slice methods eg, array[(row number),:]"
    });



    components.NumpyShape = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.ARRAY, desc: "Shape"},
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Number of Dimensions"},
                {shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Size"},
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Data Type"}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Shape"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = (<%= IN_A %>.shape, <%= IN_A %>.ndim, <%= IN_A %>.size, <%= IN_A %>.dtype)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Shape of a Numpy Array",
        "desc": "Retrieve the dimensions and data type of a Numpy Array"
    });


    // TODO: INDEXING
    // TODO: SLICING HIGHER-DIM ARRAYS?

    return components;
});

