define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    components.NumpySin = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "sin(A)"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = np.sin(<%= IN_A %>)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Numpy Vectorized Sin(x)",
        "desc": "Return a numpy array whose members are the sine of the values of the members of the input array"
    });

    components.NumpyCos = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "cos(A)"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = np.cos(<%= IN_A %>)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Numpy Vectorized Cos(x)",
        "desc": "Return a numpy array whose members are the cosine of the values of the members of the input array"
    });

    return components;
});

