define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    components.NumpyZeros = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Axis 0 Length"},
                {required: false, default: 0, shortName: "R", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Axis 1 Length"},
                {required: false, default: 0, shortName: "W", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Axis 2 Length"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Zeros"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = np.zeros((<%= IN_C %><% if (IN_R) { %>, <%= IN_R %><% } %><% if (IN_W) { %>, <%= IN_W %><% } %> ))\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Zeros Array",
        "desc": "Create a NumPy Zeros Array, up to 3 dimensions"
    });


    components.NumpyFull = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Axis 0 Length"},
                {required: false, default: 0, shortName: "R", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Axis 1 Length"},
                {required: false, default: 0, shortName: "W", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Axis 2 Length"},
                {required: false, default: 0, shortName: "V", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Value"},
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Full"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = np.full((<%= IN_C %><% if (IN_R) { %>, <%= IN_R %><% } %><% if (IN_W) { %>, <%= IN_W %><% } %>), <%= IN_V %>)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Full Array",
        "desc": "Create a NumPy Array with every value set to a particular value"
    });


    components.NumpyRange = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: false, default: 0, shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start"},
                {required: false, default: 10, shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End"},
                {required: false, default: 1, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Step"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Range"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = np.arange(<%= IN_S %>, <%= IN_E %>, <%= IN_C %> )\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Range",
        "desc": "Create a 1D NumPy Range Array"
    });

    components.NumpyLinspace = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: false, default: 0, shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start, the array's first value"},
                {required: false, default: 10, shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End, the array's last value"},
                {required: false, default: 1, shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Count, number of items in the array"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Linspace"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = np.linspace(<%= IN_S %>, <%= IN_E %>, <%= IN_C %>)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Linspace",
        "desc": "Create a 1D NumPy Linear Space as a function of Start, End, and Count of Values"
    });


    return components;
});

