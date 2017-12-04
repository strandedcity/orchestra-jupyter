define([
    "underscore",
    "backbone",
    "dataFlow/core_IOModels",
    "dataFlow/pulse",
    "dataFlow/enums",
    "dataFlow/dataMatcher",
    "dataFlow/components/engine",
    "dataFlow/freezeCalculations"
],function(_,Backbone, IOModels, Pulse, ENUMS, DataMatcher, PythonEngine, Freezer){


    var component = Backbone.Model.extend({

        /*
         *  A general function must be supplied for the calculation of the result objects.
         *  Generally, this function will wrap something in the SISL library
         *  E.g., "Arc3pt" might generate a curve through three input points,
         *  But "radius" might be an optional output from the Component.
         *  "Arc3Pt" would be the "result function" while "radius" would be an output with its own
         *  JS function that knows how to extract "radius" from the result curve
         *
         *  Every component must know what inputs to receive, what outputs to emit,
         *  and how to generate each.
         *
         *  Outputs are not calculated unless subscribed to.
         *
         *  Each named output must specify a separate function to extract a particular value from the
         *  actual output objects.
         *
         * */

        modelType: "Component",
        initialize: function(){
            // Components need to recalculate by exactly one of thow methods. Make sure exactly one is defined.
            var r1 = typeof this.recalculateTrees === "function", r2 = typeof this.recalculate === "function";
            var noCalculationFunction = !r1 && !r2;
            var twoCalculationFunctions = r1 && r2;
            if (noCalculationFunction || twoCalculationFunctions) {
                throw new Error(this.get('componentPrettyName') + " needs either .recalculate() or .recalculateTrees(), but not both!");
            }

            this.base_init.apply(this, arguments);
        },
        createIObjectsFromJSON: function(schemaListJSON,opts,dataKey){
            var objectList = [],
                dataKey = dataKey === "output" ? "outputs" : dataKey, // CODE DEBT! "output" should be "outputs"
                constructorMap = {
                    outputs: IOModels["Output"],
                    inputs: IOModels["Input"]
                },
                that=this;
            // "schemaList" we trust -- it's part of the program.
            // "inputList" we don't -- it's data that gets saved with the files
            // Basically we take the schema, ask the inputlist if it has anything that modifies those inputs in appropriate ways, and move on.

            var correspondingUserData = _.isUndefined(opts) ? {} : _.isUndefined(opts[dataKey]) ? {} : opts[dataKey];
            _.each(_.values(schemaListJSON),function(spec){
                var providedData = _.findWhere(correspondingUserData, {shortName: spec.shortName});
                if (!_.isEmpty(providedData) && providedData.type !== spec.type) {
                    console.warn("Datatype mismatch between persisted datatype and "+ that.componentName +" definition. This indicates a namespace collision, or a change to a component's definition after it was used to persist data. Saved connections to this component may fail!")
                }
                var outputObject = new constructorMap[dataKey](_.extend(providedData || {},spec));
                objectList.push(outputObject);
            });

            return objectList;
        },
        base_init: function(opts){
            if (_.isUndefined(opts) || _.isUndefined(opts.inputs) || (_.isUndefined(opts.output) && _.isUndefined(opts.outputs)) ) {
                throw new Error("Insufficient specifications for a Component");
            }

            this._sufficient = false;
            _.bindAll(this,"_handleInputChange","_propagatePulse","recalculate","getOutputVariableName","validatePythonTemplate");

            // Inputs and outputs are arrays of Ant.Inputs and Ant.Outputs
            this.outputs = this.initializeOutputs(_.isUndefined(opts.outputs) ? [opts.output] : opts.outputs);
            this.inputs = this.initializeInputs(opts.inputs);
            this.position = opts.position || {x: 0, y:0}; // May seem like "view stuff", but the components need to store their screen location as part of the data, given drag and drop

            //this._handleInputChange(); // some components don't require inputs, so we need to make sure this._sufficient gets updated appropriately on init

            this.set('componentPrettyName', opts.componentPrettyName);
            this.set('preview',opts.preview || false);
            this.set('pythonTemplate',opts.pythonTemplate);
            if (opts.pythonTemplate) {
                this.validatePythonTemplate(opts.pythonTemplate);
                this.pythonTemplateFn = _.template(opts.pythonTemplate);
                _.bindAll(this,"pythonTemplateFn");
            }
            this.previews = [];

            // Update previews. This is sort of "view stuff" but it's close to being "data stuff." Located here for now.
            this.on("change:preview",function(){
                this.clearPreviews();
                if (this.get('preview') === true) {
                    this.drawPreviews();
                }
            });
        },
        validatePythonTemplate: function () {
            var requiredReferences = [],
                that=this;
            _.each(this.inputs,function(i){
                requiredReferences.push("IN_"+i.shortName);
            });

            // Obviously, we should save the reference to the result
            requiredReferences.push("RESULT");

            // Outputs don't each get their own calculation, so this is not required.
            // Instead, there's one calculation and we assume we'll be able to extract values from that (ie, tuple indices)
            // _.each(this.outputs,function(o){
            //     requiredReferences.push("OUT_"+o.shortName);
            // });
            _.each(requiredReferences,function (r) {
                if (that.get('pythonTemplate').indexOf(r) < 0) {
                    throw new Error("Component is badly coded. Its inputs and outputs are not referenced by its python template, so they'll never be used.");
                }
            })
        },
        getOutputVariableName: function () {
            var name = this.get('componentPrettyName');
            if (name.length < 1) name = this.componentName;
            name = name + "_";
            return _.uniqueId(name.toLowerCase().replace(/[^a-z]/g,'_'));
        },
        initializeOutputs: function(outputs){
            var that = this;
            _.each(outputs,function(out){
                that.on('pulse',function(p){out.trigger('pulse',p)});
            });

            return outputs;
        },
        initializeInputs: function(inputs){
            // when no inputs are required, sufficiency must be calculated differently
            // ie, if values can be assigned directly, sufficiency = (inputs satisfied | output assigned)

            var that = this;
            _.each(inputs,function(inputModel){
                that[inputModel.shortName] = inputModel;
                that.listenTo(inputModel,"pulse",that._propagatePulse)
            });

            return inputs;
        },
        _propagatePulse: function(pulse){
             //console.log(pulse.get('state') + ' pulse received: ',this.get('componentPrettyName'),pulse.cid);

            if (pulse.get('state') === "GRAPH_DISCOVERY") {
                // DO NOT update path counts prior to running calculations if we're in calculation mode
                if (pulse.updatePathCounts(this)) {
                    // propagate now
                    this.trigger('pulse',pulse);
                }
            } else if (pulse.get('state') === "RECALCULATION")  {
                //console.trace();
                this._handleInputChange();
                var propagate = pulse.updatePathCounts(this);
                if (propagate) this.trigger('pulse',pulse);
            }

            //var propagateNow = pulse.updatePathCounts(this);;
            //console.warn("GOT IT. THIS LINE NEEDS TO BE BELOW HANDLEINPUTCHANGE!!! OTHERWISE, the pulse will switch from discvery to recalculation before inputs are connected!!");
            //if (propagateNow) {
            //    if (pulse.get('state') === "GRAPH_DISCOVERY") {
            //        console.log('graph discovery...');
            //        this.trigger('pulse',pulse);
            //    } else if (pulse.get('state') === "RECALCULATION") {
            //        this._handleInputChange(pulse);
            //    }
            //}

        },
        assignInput: function(inputName, output){
            // TODO: 'input' in the function signature actually refers to the OUTPUT that's supposed to be connected to inputName

            if (_.isUndefined(inputName) || _.isUndefined(output)) {throw new Error("Unspecified Input");}
            if (!_.has(this,inputName)) {throw new Error("Tried to specify an input that does not exist");}
            if (this[inputName].type !== output.type) {throw new Error("Tried to specify an input of the wrong type");}
            //console.log('assigning input '+inputName);
            this[inputName].connectOutput(output); // matches signature found in inputOutputView.js

//            this._calculateSufficiency(); // shouldn't be necessary -- the connection will trigger a 'change' on the input if applicable, which the component will be listening for
        },
        getOutput: function(shortName){
            // when there's only one output or you don't specify which you want, this function returns the only output.
            if (!shortName || this.outputs.length === 1) return this.outputs[0];
            return _.findWhere(this.outputs,{shortName: shortName});
        },
        getInput: function(shortName){
            return _.findWhere(this.inputs,{shortName: shortName});
        },
        destroy: function(){
            _.each(this.outputs,function(out){
                out.destroy();
            });
            this.trigger("removed",this);
            _.each(this.inputs,function(ipt){
                ipt.destroy();
            });
            this.off();
            this.stopListening();
            delete this.inputs;
            delete this.outputs;
        },
        _windowFrozenWarnOnce: _.throttle(function(){
            console.warn("WINDOW FROZEN. CALCULATION SKIPPED.");
        },5000),
        _handleInputChange: function(){
            if (Freezer.getFrozen() === true) {
                return this._windowFrozenWarnOnce();
            }

            ////////// PRE-RECALCULtATION -- CHECK STATUS
            //
            // consider current input statuses: do we have enough input to do the calculation?
            var isNullNow = !_.every(this.inputs,function(input){
                var empty =  input.getTree().isEmpty();
                //console.log(input.shortName + " is ", input.getTree());
                //if (empty) console.log(input.values);
                return empty !== true;
            });

            ////////// RECALCULATION PHASE
            //
            this.set({'sufficient': !isNullNow});
            this.errors = []; // clear out any prior errors. This is just a prop, because ... no need to persist it

            if (!isNullNow) {
                // For testing, this must remain. There are problems spying on the 'subclassed' recalculate functions
                this.simulatedRecalculate();

                if (typeof this.recalculateTrees === "function") {
                    // this component has no effect on the data; just how it's referenced. Avoid running a full dataMatcher
                    // and recalculation phase, and just re-tree the data instead.
                    // This 'alternate recalculation' phase may not be the best coding practice, but it so greatly improves
                    // the contents of the regular .recalculate() functions (which can then be passed straight to the data matcher)
                    // that I think the trade-off is worth it.
                    this.recalculateTrees();
                } else {
                    // Datamatcher is required. Component.recalculate() must be a function *for* the data mapper!
                    var result = DataMatcher(this.inputs, this.recalculate, this.outputs);

                    // If the calculation produced errors, display the status and errors to the user
                    if (result.errors.length > 0) {
                        this.set({'sufficient': "error"});
                        console.log(result.errors);
                    }
                }
            } else {

                //console.log("NULL");
            }

            /////////// POST recalculation
            //
            // Run preview phase, remove previews if null
            if (this.get('preview') === true) {
                if (isNullNow) {
                    this.clearPreviews();
                } else {
                    this.drawPreviews();
                }
            }

            // execute post-recalculation stuff: propagate null status, trigger "change" on outputs
            if (isNullNow) this.clear(false);
        },
        clear: function(shouldPulse){
            _.each(this.outputs,function(out){
                out.clearValues();
            });

            if (shouldPulse === true) {
                var p = new Pulse({startPoint: this, pathsOpened: 1}); // as if triggered on an input
                this.trigger('pulse',p);
            }
        },
        isNull: function(){
            return _.every(this.outputs,function(out){
                return out.getTree().isEmpty();
            });
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

                    PythonEngine.execute(pythonCode, {
                        statusSet: function(status){/* */},
                        success: function () { resolve(outputVariable) },
                        error: function (errorObject) { reject(errorObject) },
                        setOutput: function (outputDisplay) { /* */ }
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

            outputPromise.catch(function (e) {
                // No need to persist or model these in any 'reactive' way... just make 'em simple props
                that.errors.push({
                    type: e.ename,
                    message: e.evalue
                });

                that.set({'sufficient': "error"});
            });

            return retObj;
        },
        simulatedRecalculate: function(){
            // MUST REMAIN A NO-OP
            // if (!_.isUndefined(window.jasmine)) throw new Error("simulatedRecalculate is just for spying in jasmine.");
        },
        // recalculate: function(){
        //     console.warn("DataFlow.Component.recalculate() was called directly. This method should be overridden for all component types.");
        // },
        // recalculateTrees: function(tree){
        //     // 'Graft' and 'Flatten' and 'Reverse' and 'Simplify' are normally IO-level operations. Ie,
        //     // "Graft" applies to an input, or an output, and is persisted accordingly. When these tree-level
        //     // operations are done to individual IO's, the DataMatcher takes them into account while running
        //     // .recalculate(). But when the whole component *is* a tree manipulation, no recalculation should
        //     // even occur. In this case, the input and output are the same data, but referenced differently.
        //     return tree;
        // },
        fetchOutputs: function(){
            /* This function is stupid. It may be useful for writing tests, but it doesn't deal with the data trees in any useful way */
            return this.getOutput().getTree().flattenedTree().dataAtPath([0]);
        },
        getPreviewOutputs: function(){
            // Most components have a "primary" output which is previewable. However, some components might have multiple
            // or non-first previewable outputs, in which case this function can be overridden
            return [this.getOutput()];
        },
        drawPreviews: function(){
            var geom = this.getGeometry(),
                type = this.getPreviewOutputs()[0].type,
                constructors = {},
                preview;
            constructors[ENUMS.OUTPUT_TYPES.CURVE] = "CurveListPreview",
            constructors[ENUMS.OUTPUT_TYPES.POINT] = "PointListPreview";

            if (type === ENUMS.OUTPUT_TYPES.WILD) {
                // extract type from the first piece of data. Discard mismatched data.
                if (geom[0].constructor === Geometry.Curve) {
                    type = ENUMS.OUTPUT_TYPES.CURVE;
                    geom = _.filter(geom,function(item){
                        return item.constructor === Geometry.Curve;
                    });
                } else if (geom[0].constructor === Geometry.Point) {
                    type = ENUMS.OUTPUT_TYPES.POINT;
                    geom = _.filter(geom,function(item){
                        return item.constructor === Geometry.Point;
                    });
                }
            }
            
            if (this.previews[0] && this.previews[0].constructor === Preview[constructors[type]]) {
                // console.log(this.previews[0],typeof this.previews[0], this.previews[0].constructor);
                this.previews[0].updateGeometry(geom);
            } else {
                console.warn("New preview type mismatches previous preview type. Destroy old previews?");
                var constructor = Preview[constructors[type]];
                // Check before constructing the preview. Things like numbers don't have previews,
                // and will throw "Uncaught TypeError: constructor is not a constructor" if
                // we try to create previews for them.
                if (typeof constructor === "function") this.previews[0] = new constructor(geom);
            }

        },
        exportGeometry: function(type){
            if (!_.contains(["SVG"],type)){throw new Error("Unrecognized export type: "+type);}

            this.trigger('requestFileExport',{
                type: type,
                geometry: this.getGeometry()
            });
        },
        getGeometry: function(){
            // Supports previews and Exports, returns an array of geometry generated by this component
            var previewOutputs = this.getPreviewOutputs(); // plural, though components can't currently display more than one type
            var geom = previewOutputs[0].getTree().flattenedTree().dataAtPath([0]);

            // When more than one output contains geometry, gather its data into the same list
            // Currently, a component can only preview one data TYPE at a time.
            if (previewOutputs.length > 1) {
                for (var i=1; i<previewOutputs.length; i++){
                    geom = geom.concat(previewOutputs[i].getTree().flattenedTree().dataAtPath([0]));
                }
            }

            return geom;
        },
        destroyPreviews: function(){
            // destroy prior views
            this.clearPreviews();
            this.previews.splice(0,this.previews.length); // make sure the previews can be deallocated. remove references.
        },
        clearPreviews: function(){
            // destroy prior views
            _.each(this.previews,function(prev){
                prev.hide();
            });
        },
        toJSON: function(){
            var inputData = [],
                outputData = [];
            _.each(this.inputs,function(ipt){
                inputData.push(ipt.toJSON());
            });
            _.each(this.outputs,function(out){
                outputData.push(out.toJSON());
            });

            return {
                componentPrettyName: this.attributes.componentPrettyName,
                componentName: this.componentName,
                position: this.position,
                preview: this.attributes.preview,
                inputs: inputData,
                outputs: outputData,
                id: this.id || this.cid
            };
        }
    });

    return component;

});