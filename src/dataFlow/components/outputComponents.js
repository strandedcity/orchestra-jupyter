define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher",
    "dataFlow/components/engine"
],function(_,DataFlow,DataTree,DataMatcher,PythonEngine){
    var components = {};

    components.PrintComponent = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.WILD, desc: "Data to be viewed"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.WILD, invisible: true}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Print"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = print(<%= IN_D %>)\n" // "result" required, but print returns "None"
            });
            this.base_init(args);
        },
        recalculate: function () {
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
                        statusSet: function(status){/* */},
                        success: function () { /* */ },
                        error: function (errorObject) { console.log("python status ERROR: ",errorObject); reject() },
                        setOutput: function (outputDisplay) {
                            that.getOutput("D").trigger("change");
                            resolve(outputDisplay)
                        }
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
        "label": "Print",
        "desc": "View the value of a variable"
    });

    return components;
});

