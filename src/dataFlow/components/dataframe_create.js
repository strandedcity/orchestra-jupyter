define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    // Handy for testing... iris CSV as a url:
    // https://gist.githubusercontent.com/curran/a08a1080b88344b0c8a7/raw/d546eaee765268bf2f487608c537c05e22e4b221/iris.csv

    components.DataFrameFromCSV = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Location of the source CSV"},
                // {required: false, default: ",", shortName: "S", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Separator Character"},
                // {required: false, default: "None", shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Field Delimiter Character"},
                // {required: false, default: "None", shortName: "I", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Index Column"},
                // {required: false, default: "infer", shortName: "H", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Header Row Index"},
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Read CSV"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = pd.read_csv('<%= IN_L %>')\n" // , separator='<%= IN_S %>', delimiter='<%= IN_D %>'
            });

            this.base_init(args);
        }
    },{
        "label": "Pandas DataFrame From CSV",
        "desc": "Read a CSV from a local file path or URL. Accepts http, s3, file, and ftp URLs. For file, a host is expected."
    });


    return components;
});

