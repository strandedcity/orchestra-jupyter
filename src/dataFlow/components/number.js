define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher",
    "dataFlow/components/engine"
],function(_,DataFlow,DataTree,DataMatcher,PythonEngine){
    var components = {};

    components.NumberComponent = DataFlow.Component.extend({
        initialize: function(opts){
            var output = this.createIObjectsFromJSON([
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "output");

            var inputs = this.createIObjectsFromJSON([
                {required: false, shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "inputs");

            var args = _.extend({
                componentPrettyName: "Number"
            }, opts || {},{
                inputs: inputs,
                outputs: output
            });
            this.base_init(args);
        },
        // recalculateTrees: function(){
        //     this.getOutput("N").replaceData(this.getInput("N").getTree().copy());
        // },
        recalculate: function(numberInput){
            var np = numberInput instanceof Promise ? numberInput : new Promise(function(resolve,reject){resolve(numberInput)});

            var outputNPromise = new Promise(function(resolve,reject){
                Promise.all([np]).then(function(n){

                    var outputVariable = _.uniqueId("number_");
                    var pythonCode = outputVariable + " = " + n + "\n";

                    PythonEngine.execute({
                        pythonCode: pythonCode,
                        statusSet: function(status){console.log("STATUS OF NUMBER COMPONENT: "+status)},
                        success: function () { console.log("status success"); resolve(outputVariable) },
                        error: function (errorObject) { console.log("status error: ",errorObject); reject() },
                        setOutput: function (outputDisplay) { console.log(outputDisplay) }
                    })
                });
            });

            return {N: outputNPromise};
        }
    },{
        "label": "Number",
        "desc": "Holds a list of numbers. For short lists, you can enter the numbers directly into the component"
    });

    components.SeriesComponent = DataFlow.Component.extend({
        initialize: function(opts){
            //var output = new DataFlow.OutputNumber({shortName: "S"});
            var output = this.createIObjectsFromJSON([
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Series"}
            ], opts, "output");

            /* S = start of series, N = step size, C = # of values in series */
            var inputs = this.createIObjectsFromJSON([
                {shortName: "S", required:false, default: 0, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "First number in series"},
                {shortName: "N", required:false, default: 1, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Step size"},
                {shortName: "C", required:false, default: 10, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Count of numbers in series"}
            ], opts, "inputs");

            var args = _.extend({
                componentPrettyName: "Series",
                preview: false
            },opts || {},{
                inputs: inputs,
                outputs: output
            });
            this.base_init(args);
            this.recalculate(); // since it doesn't need any inputs to have valid output
        },
        recalculate: function(s,n,c){
            var seriesArr = [], count = 0;
            while (count < c) {
                seriesArr.push(s+n*count);
                count++;
            }
            return {S: seriesArr};
        }
    },{
        "label": "Series",
        "desc": "Generates a list of numbers. You can control the start of the list, the increment, and the number of values"
    });

    components.SliderComponent = DataFlow.Component.extend({
        initialize: function(opts){
            //var output = new DataFlow.OutputNumber({shortName: "N", default: 0.5});
            var output = this.createIObjectsFromJSON([
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Value"}
            ], opts, "output");

            /* S = start of series, N = step size, C = # of values in series */
            var inputs = this.createIObjectsFromJSON([
                {shortName: "S", required:false, default: 0, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start"},
                {shortName: "E", required:false, default: 1, type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End"},
                {shortName: "I", required:false, default: false, type: DataFlow.OUTPUT_TYPES.BOOLEAN, desc: "Integers"},
                {shortName: "N", required:false, default: 0.5, type: DataFlow.OUTPUT_TYPES.NUMBER, invisible: true, desc: "Value"}
            ], opts, "inputs");

            var args = _.extend({
                componentPrettyName: "Slider",
                preview: false
            },opts || {},{
                inputs: inputs,
                outputs: output
            });
            this.base_init(args);
        },
        storeUserData: function(val){
            var tree = new DataTree();
            tree.setDataAtPath([val],[0]);
            this.getInput("N").assignPersistedData(tree);
        },
        recalculateTrees: function(){
            // Value is chosen directly in the UI, not calculated from inputs. Value is assigned directly to
            // "persistedData" on INPUT "N", then "recalculate" ensures that this value is actually inside the acceptable range
            // before assigning to the OUTPUT "N".
            var currVal = this.getInput("N").getFirstValueOrDefault();
            var min = this.getInput("S").getFirstValueOrDefault(),
                max = this.getInput("E").getFirstValueOrDefault(),
                integers = this.getInput("I").getFirstValueOrDefault();
            if (integers === true && Math.floor(currVal) != currVal) {
                currVal = Math.floor(currVal);
            }

            if (currVal > max) currVal = max;
            if (currVal < min) currVal = min;

            this.getOutput("N").values.setDataAtPath([currVal],[0]);// assignValues([currVal],[0]);
        }
    },{
        "label": "Slider",
        "desc": "A convenient way to change numerical values on the fly. Shows a touch/mouse-enabled slider"
    });

    return components;
});

