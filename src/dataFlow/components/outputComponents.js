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
            }).catch(function (e) {
                console.warn("Some inputs resolved as errors. This behavior should be defined... it can either 'show what we have' or error out, in which case prior data should be cleared.")
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


    components.LinePlot = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "X", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "X-Axis Values", interpretAs:DataFlow.INTERPRET_AS.LIST },
                {required: true, shortName: "Y", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Y-Axis Values", interpretAs:DataFlow.INTERPRET_AS.LIST }
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "P", type: DataFlow.OUTPUT_TYPES.WILD, invisible: true}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "LinePlot"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = plt.figure()\n"+
                                "<% _.each(IN_X , function(x,index) { %>"+
                                "plt.plot(<%= x %>, <%= IN_Y[index] %>)\n"+
                                "<% }) %>"
            });
            this.base_init(args);
        },
        recalculate: function () {
            var that=this;

            var outputPromise = Promise.all(arguments).then(function(vals){
                // "List" parameters will resolve as arrays of promises. Those promises still need to be resolved to values
                // before they can be used in calculations...
                var xp = Promise.all(vals[0]);
                var yp = Promise.all(vals[1]);

                return new Promise(function (resolve,reject) {
                    var X;
                    xp.then(function (xvals) {
                        X = xvals;
                        return yp;
                    }).then(function (yvals) {
                        // LENGTHEN X IF Y IS LONGER
                        // Pass in one x, but multiple y's? Probably, that's because you intended to use one x axis, and graph several series
                        // When in list mode, we need a little help to repeat X enough times to cover all the y-series
                        while (X.length < yvals.length) {
                            // Fill X to be the same length as Y using its last member repeatedly
                            X.push(X[X.length-1]);
                        }

                        resolve({x: X,y:yvals})
                    })
                });
            }).then(function(all){
                // function will be passed resolved values from arguments to recalculate
                // recalculate is called with input values (or promises for input values) in the order in which they
                // are defined in the component. So "Add(A,B)" will pass values for A and B to recalculate.
                var resolvedValues = [all.x,all.y];

                return new Promise(function(resolve,reject){
                    var plots = [];

                    var outputVariable = that.getOutputVariableName();
                    var templateVars = {RESULT: outputVariable};
                    _.each(that.inputs,function(input,index){
                        templateVars["IN_"+input.shortName] = resolvedValues[index];
                    });
                    var pythonCode = that.pythonTemplateFn(templateVars);

                    PythonEngine.execute(pythonCode, {
                        statusSet: function(status){/* */},
                        error: function (errorObject) { console.log("python status ERROR: ",errorObject); reject() },
                        success: function (response) {
                            that.getOutput("P").trigger("change");
                            resolve(plots); // populated by calls to 'output' below
                        },
                        setOutput: function (outputDisplay) {
                            if (outputDisplay.data && outputDisplay.data["image/png"]) {
                                // Done! But... don't resolve. We can't tell right here just now many charts there are.
                                // The only way to know when we're "fully done" is when "success" is called (above)
                                plots.push(outputDisplay.data["image/png"]);
                            } else {
                                // Doesn't mean anything? Just ... in progress?
                                // console.log("Looks like the plot isn't ready yet.")
                            }
                        }
                    })
                });
            })
            .catch(function (e) {
                console.warn("Some inputs resolved as errors. This behavior should be defined... it can either 'show what we have' or error out, in which case prior data should be cleared.")
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
        "label": "Line Plot",
        "desc": "Plot two variables against each other using connecting lines"
    });


    components.ExportPythonVariable = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.WILD, desc: "Data for export" },
                {required: true, shortName: "N", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Variable Names" }
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "P", type: DataFlow.OUTPUT_TYPES.WILD, invisible: true}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Export Vars"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<% print(IN_N.replace(/[\"]+/g, '')); %> = <%= IN_D %> #<%= RESULT %>\n"
            });
            this.base_init(args);
        }
    },{
        "label": "Export a variable for use in your Jupyter Document",
        "desc": "Makes a Python object available in the Jupyter Context"
    });


    components.ExportCSV = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.DATAFRAME, desc: "Dataframe for export" },
                {required: true, shortName: "P", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Output path (use absolute paths)" }
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "P", type: DataFlow.OUTPUT_TYPES.WILD, invisible: true}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Export CSV"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_D %>.to_csv(<%= IN_P %>)\n" // result is None, but hidden anyways
            });
            this.base_init(args);
        }
    },{
        "label": "Export a Dataframe as a CSV",
        "desc": "Serialize a Pandas Dataframe into CSV format, and save the file to a local path on your computer"
    });



    return components;
});

