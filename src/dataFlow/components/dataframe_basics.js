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


    // TODO: INDEXING
    // TODO: SLICING HIGHER-DIM ARRAYS?

    return components;
});

