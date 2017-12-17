define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};


    components.DataframeExtractColumn = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe from which columns should be selected"},
                {required: true, shortName: "I", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Indexes of Column to Extract", interpretAs: DataFlow.INTERPRET_AS.LIST}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Extract Columns"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_D %>[[<%= IN_I %>]]\n" // double [[ ]] is the 'getitem' syntax: https://stackoverflow.com/questions/11285613/selecting-columns-in-a-pandas-dataframe
            });

            this.base_init(args);
        }
    },{
        "label": "Extract Named Columns from a Pandas Dataframe",
        "desc": "Supply a list of column names (strings) to extract from a dataframe for more convenient manipulation."
    });


    components.DataframeInsertColumn = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe into which a new column will be inserted"},
                {required: false, shortName: "I", default: 0, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Index of location of new Column. Must be 0 <= Index <= len(columns)"},
                {required: false, shortName: "L", default: "0", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Label / name of the new column"},
                {required: true, shortName: "V", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Values to insert"},
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Insert Columns"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= IN_D %>.insert(<%= IN_I %>, <%= IN_L %>, <%= IN_V %>, allow_duplicates=True)\n<%= RESULT %> = <%= IN_D %>\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Insert a new column into a pandas dataframe",
        "desc": "Supply the position, label, and values for a new column that will be inserted into an existing Pandas Dataframe"
    });


    components.DataframeShape = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe to learn the shape of"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Shape, a touple representing the dimensionality of the data frame"},
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Number of Dimensions in each axis"},
                {shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Size, the number of elements in the dataframe"},
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Data Types"}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Shape"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = (<%= IN_D %>.shape, <%= IN_D %>.ndim, <%= IN_D %>.size, <%= IN_D %>.dtypes)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Shape of a Pandas Dataframe",
        "desc": "Retrieve the dimensions and data types of a Dataframe"
    });


    // TODO: INDEXING
    // TODO: SLICING HIGHER-DIM ARRAYS?

    return components;
});

