define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher",
    "dataFlow/components/engine"
],function(_,DataFlow,DataTree,DataMatcher,PythonEngine){
    var components = {};

    components.NumberAdditionComponent = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMBER},
                {required: true, shortName: "B", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Number Addition"
            }, opts || {},{
                inputs: inputs,
                outputs: output
            });
            this.base_init(args);
        },
        pythonTemplate: _.template("<%= OUT_N %> = <%= IN_A %> + <%= IN_B %>\n"),
        recalculate: function(number_a,number_b){
            var that=this;
            var ap = number_a instanceof Promise ? number_a : new Promise(function(resolve){resolve(number_a)});
            var bp = number_b instanceof Promise ? number_b : new Promise(function(resolve){resolve(number_b)});

            var outputNPromise = new Promise(function(resolve,reject){
                Promise.all([ap,bp]).then(function(results){

                    var outputVariable = _.uniqueId("number_addition_");
                    var pythonCode = that.pythonTemplate({
                        OUT_N: outputVariable,
                        IN_A: results[0],
                        IN_B: results[1]
                    });

                    console.log("PYTHON CODE: "+pythonCode);

                    PythonEngine.execute({
                        pythonCode: pythonCode,
                        statusSet: function(status){console.log("STATUS OF NUMBER COMPONENT: "+status)},
                        success: function () { console.log("status success"); resolve(outputVariable) },
                        error: function (errorObject) { console.log("status error: ",errorObject); reject() },
                        setOutput: function (outputDisplay) { console.log("OUTPUT OF ADDITION: ",outputDisplay) }
                    })
                });
            });

            return {N: outputNPromise};
        }
    },{
        "label": "Add",
        "desc": "Add two numbers together"
    });

    return components;
});

