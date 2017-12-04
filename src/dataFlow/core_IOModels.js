define([
    "underscore",
    "backbone",
    "dataFlow/dataTree",
    "dataFlow/enums",
    "dataFlow/pulse"
],function(_,Backbone,DataTree, ENUMS, Pulse){


    var io = Backbone.Model.extend({
        defaults: function(){
            return {
                persistedData: new DataTree(),
                invisible: false,
                //isNull: true
            }
        },
        initialize: function(opts){
            // Output objects are able to extract bits of information from a raw result pointer, via a passed-in function
            // This could be as simple as returning the array of pointers directly, or it could mean querying those objects
            // for some property and creating that array instead.
            var args = _.extend(opts || {}, {/* default args */});
            if (_.isUndefined(args.type)) {throw new Error("No type specified for Output");}
            if (!_.has(_.values(ENUMS.OUTPUT_TYPES), args.type)) {throw new Error("Invalid Output Type Specified: "+args.type);}
            if (_.isUndefined(args.shortName)) {throw new Error("No shortName specified for Output");}

            this.required = _.isUndefined(args.required) ? true : args.required;
            this.type = args.type;
            this.default = _.isUndefined(args.default) ? null : args.default; // store default value if spec'd
            this.containsNewData = _.isUndefined(args.containsNewData) ? true : false; // by default, this component will .destroy() its contents when its values are cleared
            this.shortName = args.shortName;
            this.values = new DataTree([]);
            this.desc = args.desc;
            if (!_.isUndefined(args.invisible)) this.set({"invisible": args.invisible});

            var parameterType = ENUMS.INTERPRET_AS.ITEM;
            if (!_.isUndefined(args.interpretAs)) {
                if (!_.has(_.keys(ENUMS.INTERPRET_AS), args.interpretAs)) {
                    console.warn("Invalid list interpretation type passed to an input. Using default ITEM interpretation. See ENUMS.INTERPRET_AS");
                } else {
                    parameterType = args.interpretAs;
                }
            }
            this.interpretAs = parameterType;
            this.isMaster = args.isMaster;

            // restore user-saved values to the component
            if (!_.isUndefined(args.persistedData)) {
                var tree = new DataTree();
                tree.fromJSON(args.persistedData);
                this.assignPersistedData(tree);
            }

            if (typeof this._initialize === "function") {
                this._initialize();
            }
        },
        replaceData: function(dataTree){
            if (dataTree.constructor.name !== "DataTree") {
                throw new Error("Attempt to replace Data Tree with something that's not a Data Tree.");
            }
            this.clearValues();
            this.values = dataTree;
        },
        assignPersistedData: function(tree){
            throw new Error("Cannot call assignPersistedData() on base io class");
        },
        getTree: function(){
            /* Returns data on this node in correct precedence:
            1) Tree inherited from any connected outputs
            2) User-entered data ie, "persistedData"
            3) Default value
            4) No data
             */

            if (this.hasConnectedOutputs()) {
                // are there connected outputs? use those.
                return this.applyTreeTransform(this.values);
            } else if (!_.isUndefined(this.get('persistedData')) && !this.get('persistedData').isEmpty()) {
                // no connected outputs, but there IS user-entered data. Use that.
                return this.applyTreeTransform(this.get('persistedData'));
            } else if (!_.isNull(this.default)) {
                // no connected outputs OR user-entered data, but there IS a default. use that.
                var t = new DataTree();
                t.setDataAtPath([this.default],[0]);
                return t;
            } else {
                // no data sources available, but something is polling for data
                return new DataTree();
            }
        },
        applyTreeTransform: function(tree){
            // TODO: Apply transformations, such as graft or flatten
            return tree.copy();
        },
        getDefaultValue: function(){
            console.warn("getDefaultValue() is deprecated. Use getTree() instead, but assume that the default value will appear inside a data tree.");
            return this.default;
        },
        getFirstValueOrDefault: function(){
            // getTree() now takes care of the "or default" part of this logic -- the tree returned by getTree() will
            // reveal default values if no data sources with greater precedence are available
            return this.getTree().dataAtPath([0])[0];
        },
        clearValues: function(){
            // It's critical to manually free emscripten memory. Test by cyclically destroying a single curve. 
            // The pointer will be the same each time if memory is being cleared out appropriately. 
            // log(geocurve._pointer) to see it in action
            // HOWEVER: It's also critical NOT to .destroy() SISL objects just because lists are being rewritten
            // because of things like shift() and graft() components (which re-structure referencing arrays and objects,
            // but do not actually mutate the data inside). So inputs and outputs need to have some intelligence about
            // their contents: they must know what it means to clear their values: either (A) destroy references only or
            // (B) destroy references AND OBJECTS. This has to do with whether the output represents newly calculated data
            // or just re-arranged data, which is a function of the containing component. So this is defined along with the
            // IO's definition with the component. Note also that if this IO's role is an "INPUT", it is intrinsically
            // not going to destroy incoming objects. Inputs are just "gatherers" for the component, they never manipulate
            // contents of the incoming list beyond combination and tre remapping.
            // So the full test here is:
            // if ( is input OR is marked as not manipulating contained objects ) => SKIP destroy phase

            if (this.modelType === "Output" && this.containsNewData === true) {
                this.values.recurseTree(function(data,node){
                    _.each(data, function(object){
                        if (!_.isEmpty(object) && typeof object.destroy === "function") object.destroy();
                        else if (!_.isEmpty(object) && !_.isNumber(object) && !_.isArray(object)) {
                            console.warn("Can't destroy object type: " + typeof object + " / constructor: " + object.constructor.name);
                        }
                    });
                    node.data = []; // clear out all values
                });
            }

            // Regardless of memory clearing responsibilities, references should be dropped
            this.values = new DataTree();
        },
        _destroy: function(){
            // for each connected input, trigger disconnection

            this.disconnectAll();
            this.stopListening();
        },
        toJSON: function(){
            var obj = {
                shortName: this.shortName,
                desc: this.desc,
                default: this.default,
                required: this.required,
                interpretAs: this.interpretAs,
                id: this.id || this.cid,
                connections: _.map(this._listeningTo,function(output){
                    return output.id || output.cid;
                }),
                type: this.type
            };

            if (!_.isUndefined(this.get('persistedData')) && !this.get('persistedData').isEmpty()) {
                obj.persistedData = this.get('persistedData').toJSON();
            }

            return obj;
        }
    });













    // INPUTS are unique because they store CONNECTIONS to outputs, can store user-defined data, and know how to
    // figure out if they are "full" ie, if they can provide data to connected outputs or not.
    var input = io.extend({
        modelType: "Input",
        validateOutput: function(outputModel){
            // for inputs only, supports the data-flow attachment mechanism
            var wild = ENUMS.OUTPUT_TYPES.WILD;

            if (this.type !== outputModel.type && this.type !== wild && outputModel.type !== wild) { throw new Error("Incongruent output connected to an input"); }

            return true;
        },
        connectOutput: function(outputModel){
            // remove prior connections first
            this.disconnectAll(true);

            // make the new connection
            try {
                // I believe this is covered by disconnectAll() above, and may cause bugs!
                //if (this.validateOutput(outputModel) === true) this.stopListening();
                this.connectAdditionalOutput(outputModel, false);
            } catch (e){
                this.trigger('pulse',new Pulse({startPoint:this}));
                console.warn('Caught an error during connection: ', e.message, e.stack);
            }
        },
        disconnectOutput: function(outputModel, silent){
            this.stopListening(outputModel);
            this.trigger("disconnectedOutput", outputModel);
            if (silent !== true) 
                this.trigger('pulse',new Pulse({startPoint:this}));
        },
        disconnectAll: function(silent){
            // For inputs
            var that = this;
            _.each(_.clone(this._listeningTo),function(outputModel){
                that.disconnectOutput.call(that,outputModel, true);
            });
            if (silent !== true) {
                this.trigger('pulse',new Pulse({startPoint:this})); // once after all outputs disconnected
                this.trigger("disconnectAll",this); // completely remove the input
            }
        },
        processIncomingChange: function(p){
            // In a simple world, an input can only be connected to one output, so it would inherit that
            // output's values directly. However, an input can be attached to multiple outputs, so it needs to
            // harvest and combine those output's values into a single data tree.
            // console.log('processIncomingChange on '+this.shortName);
            // Step through each connected output model. For each model, append data to the same branch of the tree
            var treeCreated = false,
                pulse = p || new Pulse({startPoint:this}),
                that = this;

            if (pulse.get('state') === "RECALCULATION") {
                //console.log("RECALCULATION pulse received on " + this.shortName + " from " + pulse.cid  );
                //console.trace();
                // Only actually copy the tree data during the recalculation phase.
                // Doing it during Graph Discovery will cause multiple copy operations
                // for one data tree, a huge waste of an expensive operation!
                _.each(this._listeningTo,function(outputModel){
                    if (treeCreated === false) {
                        //console.log('COPYING values from output '+outputModel.shortName + " to input " + that.shortName);;
                        //outputModel.values.log();
                        that.values = outputModel.getTree().copy();
                        treeCreated = true;
                    } else {
                        //console.log('APPENDING values from output '+outputModel.shortName + " to input " + that.shortName);
                        // ADD this model's data to the end of each path in the tree
                        outputModel.getTree().recurseTree(function(data,node){
                            var path = node.getPath(),
                                existingData = that.values.dataAtPath(path),
                                newData = existingData.concat(data);
                            that.values.setDataAtPath(newData,path);
                        });
                    }
                });
            } else {
                //console.log("(no changes made for GRAPH_DISCOVERY)");
            }

            //console.log('processIncomingChange DONE:'+this.shortName);
            //this.values.log();
            this.trigger("pulse",pulse);
        },
        connectAdditionalOutput: function(outputModel, validateModels){
            //console.log('CONNECT ADDITIONAL OUTPUT------------');
            if (validateModels !== false) this.validateOutput(outputModel);

            var that=this;

            // Is this input already connected to outputModel ? If so, disconnect it first, then reconnect
            // This guarantees that the inputs stay in the right order.
            _.each(this._listeningTo,function(o){
                if (outputModel === o) {
                    that.disconnectOutput.call(that,o);
                }
            });

            this.listenTo(outputModel, "pulse", function(pulse){
                that.processIncomingChange.call(that,pulse);
            });

            // "Connections" live entirely on INPUT objects, but still need to be removed when the connected OUTPUT objects are removed
            // This cleans up connections on the RIGHT side of components when a component is removed from the middle of the graph
            this.listenTo(outputModel,"disconnectAll",function(outputModel){
               that.disconnectOutput.call(that,outputModel);
            });

            //this.set({isNull: false},{silent: true}); // unset the "null" override
            this.trigger("connectedOutput", outputModel);
            //console.log('trigger pulse on '+this.shortName);
            this.processIncomingChange();
            //this.trigger('pulse',new Pulse({startPoint: this})); // Not the best
        },
        assignPersistedData: function(tree){
            //propagateChange.call();
            //
            //function propagateChange(){
                // Persisted data is independent of "connected" data... so we assign each branch of it normally, but keep an un-altered copy
                // of the tree to be serialized later
                var dataTree = tree;
                if (_.isArray(tree)) {
                    dataTree = new DataTree();
                    dataTree.setDataAtPath(tree,[0]);
                }

                this.set('persistedData',dataTree);
                //this.set({isNull: false},{silent: true}); // unset the "null" override

                // Change events on THIS input should trigger when new persisted data is assigned AND
                // there are no connected outputs that are providing data with higher precedence.
                // Otherwise, no change-trigger necessary, since the data this input provides will not have changed.
//                if (!this.hasConnectedOutputs()) {
//                    this.trigger("change");
//                }

                this.trigger('pulse', new Pulse({startPoint: this}));
            //}
        },
        hasConnectedOutputs: function(){
            return !(_.keys(this._listeningTo).length === 0);
            //
            //if (_.keys(this._listeningTo).length === 0) return false;
            //
            //// it only counts as a connection if we're getting non-null data
            //var foundNonEmptyConnection = false;
            //_.each(_.clone(this._listeningTo),function(outputModel){
            //    // There are two ways that a connected output would not be counted:
            //    if (outputModel.getTree().isEmpty() === false && outputModel.isNull() === false) {
            //        foundNonEmptyConnection = true;
            //    }
            //});
            //
            //return foundNonEmptyConnection;
        },
        destroy: function(){
            // custom INPUT destroy stuff

            this._destroy();
        }
    });












    // OUTPUTS are unique because they know if they are null or not. They can't store user-defined data, so their
    // null status comes directly from the presence or absence of data
    var output = io.extend({
        _initialize: function(){
            //this.set({isNull: true});
        },
        modelType: "Output",
        destroy: function(){
            // custom OUTPUT destroy stuff
            // Slightly involved, since the connections TO THIS OUTPUT are actually stored on INPUT OBJECTS, not on "this"

            this.clearValues();
            //this.setNull(true);
            this._destroy();
        },
        disconnectAll: function(){
            // For outputs
            this.trigger("disconnectAll",this); // completely remove the input
        },
        assignPersistedData: function(dataTree){

            // Persisted data is independent of "connected" data... so we assign each branch of it normally, but keep an un-altered copy
            // of the tree to be serialized later
            this.set('persistedData',dataTree);
            //this.set({isNull: false},{silent: true}); // unset the "null" override

            // When persistedData is assigned to an OUTPUT, it means the component exists only so users can enter data
            // (eg, a slider). So entering persistedData in this context ALWAYS means a change: no precedence rules apply
            this.trigger("pulse",new Pulse({startPoint: this}));
        },

        // "null" status is unique to OUTPUTS. An INPUT connected to a NULL OUTPUT is not necessarily null --
        // it could have a default value or 'persisted data' that allows it to provide values while disconnected.
        //setNull: function(val){
        //    // suppress null changes when the io is ALREADY NULL, no matter what.
        //    // If being set to NOT NULL, a change will be triggered already by the data that caused the change in null status
        //    var silent = this.isNull() === true;
        //    this.set({isNull: val},{silent: silent});
        //},

        //isNull: function(){
        //    return this.getTree().isEmpty();
        //    //return this.get('isNull') === true || this.getTree().isEmpty();
        //},
        hasConnectedOutputs: function(){
            // the data on OUTPUTS is set by components -- there's only one data source, not several as is the case for inputs
            return true;
        }
    });

    return {
        Output: output,
        Input: input
    }

});