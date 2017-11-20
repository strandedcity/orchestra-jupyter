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
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %> + <%= IN_B %>\n" // OUTPUT = A + B
            });
            this.base_init(args);
        },
        recalculate: function(){
            var that=this;

            var outputPromise = Promise.all(arguments).then(function(){
                // function will be passed resolved values from arguments to recalculate
                // recalculate is called with input values (or promises for input values) in the order in which they
                // are defined in the component. So "Add(A,B)" will pass values for A and B to recalculate.
                var resolvedValues = arguments[0];
                return new Promise(function(resolve,reject){
                    var outputVariable = that.getOutputVariableName();
                    var templateVars = {RESULT: outputVariable};
                    _.each(that.inputs,function(input,index){
                        templateVars["IN_"+input.shortName] = resolvedValues[index];
                    });
                    var pythonCode = that.pythonTemplateFn(templateVars);

                    console.log("PYTHON CODE: "+pythonCode);

                    PythonEngine.execute(pythonCode, {
                        statusSet: function(status){console.log("STATUS OF NUMBER COMPONENT: "+status)},
                        success: function () { console.log("status success"); resolve(outputVariable) },
                        error: function (errorObject) { console.log("status error: ",errorObject); reject() },
                        setOutput: function (outputDisplay) { console.log("OUTPUT OF ADDITION: ",outputDisplay) }
                    })
                });
            });

            // Build return object. For simple outputs, this is just {N: outputPromise}
            // For complex outputs that need to be pulled out of a tuple, there's a second promise tacked on so that the
            // variable name used in calculation (eg, "number_addition_29") can have an index attached to it
            // (eg, "number_addition_29[1]" to reference the second value in the returned tuple in python-land
            var retObj = {};
            if (this.outputs.length === 1) {
                // When one output, the output here is just the variable assigned (in python) to hold the output
                retObj[this.outputs[0].shortName] = outputPromise
            } else {
                // Otherwise, we can assume python is returning a tuple, which gets assigned to the variable above.
                // In which case, the tuple's values can each be referenced by downstream functions via their indexes
                // This means that the outputs of a component are assumed to match (in their order) the positions of
                // outputs from the corresponding python function
                _.each(this.outputs,function (o,idx) {
                    retObj[o.shortName] = outputPromise.then(function (varName) {
                        return new Promise(function (resolve) {
                            return resolve(varName + "[" + idx + "]")
                        })
                    });
                });
            }
            return retObj;
        }
    },{
        "label": "Add",
        "desc": "Add two numbers together"
    });

    return components;
});

