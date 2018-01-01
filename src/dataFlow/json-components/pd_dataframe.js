define(["dataFlow/core"],function(DataFlow){

    // Handy for testing... iris CSV as a url:
    // https://gist.githubusercontent.com/curran/a08a1080b88344b0c8a7/raw/d546eaee765268bf2f487608c537c05e22e4b221/iris.csv

    // {
    //     functionName: "",           // at top of help tooltip
    //     componentPrettyName: "",    // appears on the component itself
    //     module: "pandas",
    //     label: "",                  // first thing to appear in the component search bar
    //     desc: "",                   // longform description in help tooltip and component searcher
    //     inputs: [],                 // ordered list of inputs and their types, defaults, and behaviors
    //     outputs: [],                // ordered list of outputs and their types, defaults, and behaviors
    //     pythonTemplate: ""          // Underscore template for the python code to be run by this component
    // }

    // {
    //     functionName: "",
    //     componentPrettyName: "",
    //     module: "pandas",
    //     label: "",
    //     desc: "",
    //     inputs: [],
    //     outputs: [],
    //     pythonTemplate: ""
    // }

    return [
        {
            functionName: "DataframeFromCSV",
            componentPrettyName: "Read CSV",
            module: "pandas",
            label: "pd.read_csv",
            desc: "Read a CSV from a local file path or URL, parsing it into a Pandas DataFrame. Accepts http, s3, file, and ftp URLs. For file, a host is expected.",
            inputs: [
                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Location of the source CSV"},
                // {required: false, default: ",", shortName: "S", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Separator Character"},
                // {required: false, default: "None", shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Field Delimiter Character"},
                // {required: false, default: "None", shortName: "I", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Index Column"},
                // {required: false, default: "infer", shortName: "H", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Header Row Index"},
            ],
            outputs: [
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME}
            ],
            pythonTemplate: "<%= RESULT %> = pd.read_csv(<%= IN_L %>)\n" // , separator='<%= IN_S %>', delimiter='<%= IN_D %>'
        },
        {
            functionName: "DataframeExtractColumn",
            componentPrettyName: "Extract Columns",
            module: "pandas",
            label: "pd.dataframe.extract_columns",
            desc: "Extract Named Columns from a Pandas Dataframe. Supply a list of column names (strings) to extract from a dataframe for more convenient manipulation.",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe from which columns should be selected"},
                {required: true, shortName: "I", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Indexes of Column to Extract", interpretAs: DataFlow.INTERPRET_AS.LIST}
            ],
            outputs: [
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_D %>[[<%= IN_I %>]]\n" // double [[ ]] is the 'getitem' syntax: https://stackoverflow.com/questions/11285613/selecting-columns-in-a-pandas-dataframe
        },
        {
            functionName: "DataframeInsertColumn",
            componentPrettyName: "Insert Columns",
            module: "pandas",
            label: "pd.dataframe.insert_columns",
            desc: "Insert a new column into a pandas dataframe. Supply the position, label, and values for a new column that will be inserted into an existing Pandas Dataframe",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe into which a new column will be inserted"},
                {required: false, shortName: "I", default: 0, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Index of location of new Column. Must be 0 <= Index <= len(columns)"},
                {required: false, shortName: "L", default: "0", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Label / name of the new column"},
                {required: true, shortName: "V", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Values to insert"}
            ],
            outputs: [
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_D %>.copy()\n<%= RESULT %>.insert(<%= IN_I %>, <%= IN_L %>, <%= IN_V %>, allow_duplicates=False)\n"
        },
        {
            functionName: "DataframeShape",
            componentPrettyName: "Shape",
            module: "pandas",
            label: "pd.dataframe.shape",
            desc: "Shape of a Pandas Dataframe. Retrieve the dimensions and data types of a Dataframe",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe to learn the shape of"}
            ],
            outputs: [
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Shape, a touple representing the dimensionality of the data frame"},
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Number of Dimensions in each axis"},
                {shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Size, the number of elements in the dataframe"},
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Data Types"}
            ],
            pythonTemplate: "<%= RESULT %> = (<%= IN_D %>.shape, <%= IN_D %>.ndim, <%= IN_D %>.size, <%= IN_D %>.dtypes)\n"
        },
        {
            functionName: "DataframeCopy",
            componentPrettyName: "DF Copy",
            module: "pandas",
            label: "pd.dataframe.copy",
            desc: "Copy a Pandas Dataframe",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe to copy"},
                // {required: false, shortName: "D", default: true, type: DataFlow.OUTPUT_TYPES.BOOLEAN, desc: "Deep Copy the Data as well?"}
            ],
            outputs: [
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "A copy of the data frame"}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_D %>.copy()\n"
        }
    ]
});

// // TODO: INDEXING
// // TODO: SLICING HIGHER-DIM ARRAYS?