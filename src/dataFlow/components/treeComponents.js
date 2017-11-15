define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataMatcher){

    var components = {};

    components.GraftComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Graft"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "T", type: DataFlow.OUTPUT_TYPES.WILD}
                            ], opts, "inputs"),
                    outputs: this.createIObjectsFromJSON([
                                {shortName: "T", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false}
                            ], opts, "output")
                })
            );
        },
        recalculateTrees: function(){
            this.getOutput("T").replaceData(this.getInput("T").getTree().graftedTree());
        }
    },{
        "label": "Graft Tree",
        "desc": "Creates a separate branch for each data item in the supplied tree"
    });

    components.ShiftComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Shift"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST, isMaster: true},
                                {required: false, shortName: "S", default: 1, type: DataFlow.OUTPUT_TYPES.NUMBER},
                                {required: false, shortName: "W", default: true, type: DataFlow.OUTPUT_TYPES.BOOLEAN}
                            ], opts, "inputs"),
                    outputs: this.createIObjectsFromJSON([
                                {shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false, interpretAs: DataFlow.INTERPRET_AS.LIST}
                            ], opts, "output")
                })    
            );
        },
        recalculate: function(listIn,shiftBy,wrap){
            var listOut = listIn.slice(shiftBy);
            if (wrap) listOut = listOut.concat(listIn.slice(0, shiftBy));
            return {L: listOut};
        }
    },{
        "label": "Shift List",
        "desc": "Removes items from the beginning of a data list, and optionally tacks them back onto the end"
    });

    components.CullIndexComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Cull i"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST, isMaster: true, desc: "List to Cull"},
                                {required: true, shortName: "i", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs: DataFlow.INTERPRET_AS.LIST, desc: "Culling indices"},
                                {required: false, shortName: "W", default: true, type: DataFlow.OUTPUT_TYPES.BOOLEAN, desc: "Wrap indices to list range"}
                            ], opts, "inputs"),
                    outputs: output = this.createIObjectsFromJSON([
                                {shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false, interpretAs: DataFlow.INTERPRET_AS.LIST}
                            ], opts, "output")
                })
            );
        },
        recalculate: function(listIn,cullIndices,wrap){
            var listOut = [];
            _.each(listIn,function(val,idx){
                if (!_.contains(cullIndices,idx)) {
                    listOut.push(val);
                }
            })
            return {L: listOut};
        }
    },{
        "label": "Cull Index",
        "desc": "Cull (remove) indexed elements from a list"
    });

    components.CullPatternComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Cull"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST, isMaster: true, desc: "List to Cull"},
                                {required: true, shortName: "P", type: DataFlow.OUTPUT_TYPES.BOOLEAN, interpretAs: DataFlow.INTERPRET_AS.LIST, desc: "Culling pattern"}
                            ], opts, "inputs"),
                    outputs: output = this.createIObjectsFromJSON([
                                {shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false, interpretAs: DataFlow.INTERPRET_AS.LIST}
                            ], opts, "output")
                })
            );
        },
        recalculate: function(listIn,cullPattern){
            var len = cullPattern.length;
            var culled = _.filter(listIn,function(val,idx){
                // figure out which item in the cull pattern this index aligns to. There can be more items in listIn, in which case
                // the culling pattern should repeat
                return cullPattern[idx % len]
            });
            return {L: culled};
        }
    },{
        "label": "Cull Pattern",
        "desc": "Cull (remove) indexed elements from a list using a repeating bit mask"
    });


    components.CullFrequencyComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    componentPrettyName: "CullN",
                    preview: false
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST, isMaster: true, desc: "List to Cull"},
                                {required: false, default: 2, shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Cull frequency"}
                            ], opts, "inputs"),
                    outputs: output = this.createIObjectsFromJSON([
                                {shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false, interpretAs: DataFlow.INTERPRET_AS.LIST}
                            ], opts, "output")
                })
            );
        },
        recalculate: function(listIn,frequency){
            return {L: _.filter(listIn,function(val,idx){
                // figure out which item in the cull pattern this index aligns to. There can be more items in listIn, in which case
                // the culling pattern should repeat
            return (idx+1) % frequency !== 0;
            })};
        }
    },{
        "label": "Cull Nth",
        "desc": "Cull (remove) every Nth element in a list"
    });

    components.InsertItemsComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Ins"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST, isMaster: true, desc: "List to modify"},
                                {required: true, shortName: "I", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST, isMaster: true, desc: "Items to insert. If no items are supplied, nulls will be inserted"},
                                {required: true, shortName: "i", type: DataFlow.OUTPUT_TYPES.NUMBER, interpretAs: DataFlow.INTERPRET_AS.LIST, desc: "Insertion index for each item"},
                                {required: false, shortName: "W", default: true, type: DataFlow.OUTPUT_TYPES.BOOLEAN, desc: "If true, indices will be wrapped"}
                            ], opts, "inputs"),
                    outputs: output = this.createIObjectsFromJSON([
                                {shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false, interpretAs: DataFlow.INTERPRET_AS.LIST}
                            ], opts, "output")
                })
            );
        },
        recalculate: function(listIn,insertItems,indices,wrap){
            console.warn("TODO: Support 'wrap' option on insert-items component");
            
            // Ghop behavior: insert items starting at the end of the list. 
            // Ie, if you enter data [1,2] and indices [0,0], you'll get output [1,2] not [2,1]
            
            var listOut = listIn.slice(0);
            var reversedItems = insertItems.slice(0).reverse();
            _.each(indices.slice(0).reverse(),function(indexValue,itemPosition){
                listOut.splice(indexValue, 0, reversedItems[itemPosition]);
            });
            return {L: listOut};
        }
    },{
        "label": "Insert Items",
        "desc": "Insert a collection of items into a list"
    });

    components.FlattenComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Flatten"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "T", type: DataFlow.OUTPUT_TYPES.WILD},
                                {required: false, shortName: "P", default: [0], type: DataFlow.OUTPUT_TYPES.ARRAY}
                            ], opts, "inputs"),
                    outputs: this.createIObjectsFromJSON([
                                {shortName: "T", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false}
                            ], opts, "output")
                })
            );
        },
        recalculateTrees: function(){
            /* T=input Tree Data, P = (optional) path to put flattened data on (default is [0] */
            console.warn("PATH input is ignored for now");
            var flattened = this.getInput("T").getTree().flattenedTree(false); // makes a copy!
            this.getOutput("T").replaceData(flattened);
        }
    },{
        "label": "Flatten Tree Data",
        "desc": "Flatten a data tree by removing all branching information"
    });

    components.ListItemComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Item"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST},
                                {required: false, shortName: "i", default: 0, type: DataFlow.OUTPUT_TYPES.NUMBER},
                                {required: false, shortName: "W", default: true, type: DataFlow.OUTPUT_TYPES.BOOLEAN}
                            ], opts, "inputs"),
                    outputs: this.createIObjectsFromJSON([
                                {shortName: "i", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false}
                            ], opts, "output")
                })    
            );
        },
        recalculate: function(list,item,wrap){
            /* L=input list, i=item to retrieve, W=wrap list */
            if (!_.isArray(list)) return null;
            if (!wrap && list.length <= item) return null;

            // wrap is true, so we're going to return something! "wrapping" is easy, using a modulo
            return {i: list[item % list.length]};
        }
    },{
        "label": "Extract Item from List",
        "desc": "Retrieve a specific item from a list"
    });

    components.DuplicateDataComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Dup"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "D", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST}, // data (as list)
                                {required: false, shortName: "N", default: 2, type: DataFlow.OUTPUT_TYPES.NUMBER}, // number of duplicates
                                {required: false, shortName: "O", default: true, type: DataFlow.OUTPUT_TYPES.BOOLEAN} // retain list order
                            ], opts, "inputs"),
                    outputs: this.createIObjectsFromJSON([
                                {shortName: "D", type: DataFlow.OUTPUT_TYPES.WILD, containsNewData: false, interpretAs: DataFlow.INTERPRET_AS.LIST}
                            ], opts, "output")
                })
            );
        },
        recalculate: function(data,numberOfDupes,retainOrder){
            if (!_.isArray(data)) return null;
            console.warn("RETAIN ORDER FALSE NOT SUPPORTED");
            
            var duppedList = [];
            for (var i=0; i<numberOfDupes; i++){
                duppedList = duppedList.concat(data);
            }

            return {D: duppedList};
        }
    },{
        "label": "Duplicate Data",
        "desc": "Duplicate data a predefined number of times"
    });

    components.ListLengthComponent = DataFlow.Component.extend({
        initialize: function(opts){
            this.base_init(
                _.extend({
                    preview: false,
                    componentPrettyName: "Lng"
                }, opts || {},{
                    inputs: this.createIObjectsFromJSON([
                                {required: true, shortName: "L", type: DataFlow.OUTPUT_TYPES.WILD, interpretAs: DataFlow.INTERPRET_AS.LIST}, // data (as list)
                            ], opts, "inputs"),
                    outputs: this.createIObjectsFromJSON([
                                {shortName: "L", type: DataFlow.OUTPUT_TYPES.NUMBER}
                            ], opts, "output")
                })
            );
        },
        recalculate: function(list){
            if (!_.isArray(list)) return null;
            
            return {L: list.length};
        }
    },{
        "label": "List Length",
        "desc": "Measure the length of a List"
    });



    return components;
});

