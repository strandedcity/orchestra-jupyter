define(["dataFlow/core"],function(DataFlow){

    // {
    //     functionName: "",
    //     componentPrettyName: "",
    //     module: "numpy",
    //     label: "",
    //     desc: "",
    //     inputs: [],
    //     outputs: [],
    //     pythonTemplate: ""
    // }

    return [
        {
            functionName: "NumpyZeros",
            componentPrettyName: "Zeroes",
            module: "numpy",
            label: "np.zeros",
            desc: "Create a NumPy Zeros Array, specifying dimensions of each axis in an input list of numbers",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs: DataFlow.INTERPRET_AS.LIST, desc: "Dimensions of the Numpy Array"},
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.zeros((<%= IN_D %>))\n"
        },
        {
            functionName: "NumpyFullNDimensions",
            componentPrettyName: "Full N-D Array",
            module: "numpy",
            label: "np.full",
            desc: "Create a NumPy Array where every value is filled with a specified value",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs: DataFlow.INTERPRET_AS.LIST, desc: "Dimensions of the Numpy Array"},
                {required: false, default: 0, shortName: "V", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Value to fill the array with"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.full((<%= IN_D %>), <%= IN_V %>)\n"
        },
        {
            functionName: "NumpyFullRandom",
            componentPrettyName: "Random Array",
            module: "numpy",
            label: "np.random.rand",
            desc: "Create a new Numpy Array (of shape specified) full of random values",
            inputs: [
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs: DataFlow.INTERPRET_AS.LIST, desc: "Shape of Numpy Array"},
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.random.rand(<%= IN_D %>)\n"
        },
        {
            functionName: "NumpyRange",
            componentPrettyName: "Range",
            module: "numpy",
            label: "np.range",
            desc: "Create a 1D NumPy Range Array",
            inputs: [
                {required: false, default: 0, shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start"},
                {required: false, default: 10, shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End"},
                {required: false, default: 1, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Step"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.arange(<%= IN_S %>, <%= IN_E %>, <%= IN_C %> )\n"
        },
        {
            functionName: "NumpyLinspace",
            componentPrettyName: "Linspace",
            module: "numpy",
            label: "np.linspace",
            desc: "Create a 1D NumPy Linear Space as a function of Start, End, and Count of Values",
            inputs: [
                {required: false, default: 0, shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start, the array's first value"},
                {required: false, default: 10, shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End, the array's last value"},
                {required: false, default: 1, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Count, number of items in the array"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.linspace(<%= IN_S %>, <%= IN_E %>, <%= IN_C %>)\n"
        },
        {
            functionName: "NumpySlice",
            componentPrettyName: "1D Sub Array",
            module: "numpy",
            label: "np.slice",
            desc: "Create a slice (sub-array) of a numpy array based on a start index, end index, and number of steps between each index.",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array to Slice"},
                {required: false, default: 'null', shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start Index of Slice"}, // default to null so that numpy defaults can be used instead
                {required: false, default: 'null', shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End Index of Slice"},
                {required: false, default: 'null', shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Step"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_A %>[ <% if (IN_S != 'null'){ %><%= IN_S %><% } %> : <% if (IN_E != 'null'){ %><%= IN_E %><% } %> : <% if (IN_N != 'null'){ %><%= IN_N %><% } %>]\n"
        },
        {
            functionName: "NumpyExtractItem",
            componentPrettyName: "Extract Item",
            module: "numpy",
            label: "np.extract_item",
            desc: "Extract an Item from Numpy array using Indexing. Position in a multi-dimensional array can be specified by subsequent items in the 'Index' input, which will be interpreted as a list.",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"},
                {required: false, default: 0, shortName: "I", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs:DataFlow.INTERPRET_AS.LIST ,desc: "Index of Item to Extract, <= Array Dimension"}
            ],
            outputs: [
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.WILD}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_A %>[<%= IN_I %>]\n" // "just works" if I = [2,3,4], but outputs an array in that case
        },
        {
            functionName: "NumpyExtractColumn",
            componentPrettyName: "Extract Column",
            module: "numpy",
            label: "np.extract_column",
            desc: "Extract the first column of a Numpy array using a combination of index and slice methods eg, array[:,(column number)]",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array, 2+ Dimensions"},
                {required: false, default: 0, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Index of Column to Extract"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_A %>[:,<%= IN_C %>]\n"
        },
        {
            functionName: "NumpyExtractRow",
            componentPrettyName: "Extract Row",
            module: "numpy",
            label: "np.extract_row",
            desc: "Extract the first row of a Numpy array using a combination of index and slice methods eg, array[(row number),:]",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array, 2+ Dimensions"},
                {required: false, default: 0, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Index of Row to Extract"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_A %>[<%= IN_C %>,:]\n"
        },
        {
            functionName: "NumpyShape",
            componentPrettyName: "Shape",
            module: "numpy",
            label: "np.shape",
            desc: "Retrieve the dimensions and data type of a Numpy Array",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ],
            outputs: [
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.ARRAY, desc: "Shape"},
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Number of Dimensions"},
                {shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Size"},
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Data Type"}
            ],
            pythonTemplate: "<%= RESULT %> = (<%= IN_A %>.shape, <%= IN_A %>.ndim, <%= IN_A %>.size, <%= IN_A %>.dtype)\n"
        },
        {
            functionName: "NumpySin",
            componentPrettyName: "sin(A)",
            module: "numpy",
            label: "np.sin",
            desc: "Numpy Vectorized Sin(x). Return a numpy array whose members are the sine of the values of the members of the input array",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.sin(<%= IN_A %>)\n"
        },
        {
            functionName: "NumpyCos",
            componentPrettyName: "cos(A)",
            module: "numpy",
            label: "np.cos",
            desc: "Numpy Vectorized Cos(x). Return a numpy array whose members are the cosine of the values of the members of the input array",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ],
            outputs: [
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ],
            pythonTemplate: "<%= RESULT %> = np.cos(<%= IN_A %>)\n"
        }
    ]
});
