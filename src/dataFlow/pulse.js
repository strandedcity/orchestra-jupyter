define([
        "underscore",
        "backbone",
        "dataFlow/enums"
    ],function(_,Backbone,ENUMS){
        /*
            Pulse is not a traditional Backbone model. It does not store data that would need to be persisted, and it's
            difficult (but not impossible) to imagine making a view for it.

            When data on an input in the graph changes, the DOWNSTREAM components in the graph must recalculate their values
            There are several nuances to this process however:

            1) Component A may be connected to several inputs on component B, as in the case where a "Number" is connected 
                to X,Y, and Z values of a "Point". In this case, component B ("Point") should recalculate ONLY once it detects that
                all three of its inputs (X,Y,Z) have completed recalculating. Because the graph can be complex, the only
                way to know for sure which inputs need to be recalculated is to "pulse" through the whole graph in advance,
                so that components know how many "recalculate" events to expect before recalculating themselves. This can save many
                expensive "recalculate" cycles, perhaps thousands in the case of a very large graph.
            2) Because the graph can be complex, there is a need to know when the "Pulse" phase is complete and actual calculations
                should begin. The graph can both diverge and converge (as in the reverse case where three numeric values each
                output to X,Y,Z, reducing graph branches from 3 numbers to 1 Point). The Pulse object makes this easy by counting
                The number of "opened" paths, then counting "closed" paths. When these two tallies are equal, the Pulse has run to
                the end of each branch and recalculation should begin. At this point in the lifecycle, components are all prepared
                to wait for the right number of inputs to recalculate before recalculating themselves. The "Pulse" object allows
                the last component in the graph to communicate indirectly with the first component in the graph without any explicit
                tie between the two. Ie, the component starting a pulse can listen for Pulse.trigger("endOfGraph") to know when to recalculate.
            3) During recalculation, the "sufficiency" of a component may change, meaning that it may go from having valid inputs
                to having invalid inputs, or the reverse. When such a change occurs, downstream components will need to either
                recalculate for the first time, or clear out their prior calculations without running any calculation themselves.
                In these cases, a second type of Pulse is needed to communicate to _their_ downstream components that (A) a recalculation
                has occurred and (B) that downstream recalculation should be executed, skipped, or the prior results cleared.
            4) User input can be changed extremely fast in the case of UI components like Sliders, but concurrency would be a potential
                problem even if not. Pulses identify a particular starting point in the graph for an input change, and make it possible
                to cancel prior pulses or recalculations when inputs change before completion. A given component might be downstream from
                two different nearly-simultaneous input changes, in which case it would need to recalculate once for each (or wait for both).
                Similarly, incrementing pulse counts from a given starting point in the graph make it easy to see when an "old" value
                no longer needs recalculation.
        */

        // Pulse Events:
        // endOfGraph: Indicates that the graph downstream of the Pulse start point has been fully discovered. 
        //      The Pulse owner can proceed with the next phase
        // change:state: Can be listened for to know if the associated recalculation should happen or not
        // states: GRAPH_DISCOVERY, RECALCULATION, CANCELLED

        var Pulse = Backbone.Model.extend({
            defaults: function(){
                return {
                    pathsOpened: 0,
                    pathsClosed: 0, 
                    state: "GRAPH_DISCOVERY",
                    componentPulseCounts: {} // will store component IDs and the number of times this pulse has hit them, (1) above
                }
            },
            shouldPropagate: function(component){
                return !_.contains(_.keys(this.get('componentPulseCounts')),component.cid);
            },
            updatePathCounts: function(component){
                // Called each time a pulse is received by a component. The component will pass itself to this function,
                // which will increment pathsClosed and conditionally set pathsOpened. The ID of the component, and the number
                // of times it sees this pulse, will be recorded for the next phase.

                // During the RECALCULATION phase, pulse counts are DECREMENTED instead. When the pulse count for a given
                // component reaches zero, that component recalculates
                var pulseShouldPropagate = false,
                    cptPulseCounts = this.get('componentPulseCounts');
                //console.log('Path Counts BEFORE update/ Open: '+this.get('pathsOpened') + " Closed: "+this.get('pathsClosed'));
                if (this.get('state') == "GRAPH_DISCOVERY") {
                    // Receipt of a pulse indicates that one path is closed. Ie, a "wire" terminates at this component.
                    this.set('pathsClosed',this.get('pathsClosed') + 1);
                    pulseShouldPropagate = this.shouldPropagate(component);
                    if (pulseShouldPropagate) {
                        this.setOpenPathCountBasedOnComponentOutputs(component);

                        // Keep track of how many pulses this component receives. Will be used in the recalculate phase
                        // so the component knows when to run its calculation
                        cptPulseCounts[component.cid] = 1;
                    } else {
                        cptPulseCounts[component.cid] = cptPulseCounts[component.cid] + 1;
                    }

                    // We've now logged the number of paths that terminate and originate at this component.
                    // Are those counts equal? If yes, we're done pulsing through the whole tree
                    if (this.get('pathsClosed') === this.get('pathsOpened')) {
                        //console.log("Graph Fully Traversed. Last component: ",component.get('componentPrettyName'), ". Triggering RECALC pulse on ", this.get('startPoint').shortName || this.get('startPoint').get('componentPrettyName'));
                        this.set('state',"RECALCULATION");
                        var start = this.get('startPoint');
                        if (typeof start.processIncomingChange === "function") {
                            //console.log("STARTING RECALCULATION PULSE");
                            start.processIncomingChange(this);
                        } else {
                            start.trigger('pulse',this);
                        }
                    } else {

                    }
                } else if (this.get('state') == "RECALCULATION") {
                    //console.log("Decrementing path counts in RECALCULATION phase. Before:",cptPulseCounts);
                    cptPulseCounts[component.cid] = cptPulseCounts[component.cid] - 1;
                    if (cptPulseCounts[component.cid] === 0) {
                        pulseShouldPropagate = true; // ie, the component should trigger recalculation then pass the pulse to its outputs
                    }
                    //console.log("After:",cptPulseCounts);

                }
                //console.log('Path Counts AFTER update / Open: '+this.get('pathsOpened') + " Closed: "+this.get('pathsClosed'));
                return pulseShouldPropagate;
            },
            setOpenPathCountBasedOnComponentOutputs: function(component){
                // For each output connection from this component, there's one additional path for the pulse to follow:
                var connectedOutputCount = 0;
                _.each(component.outputs,function(output){
                    if (typeof output._events == "object" && _.isArray(output._events["pulse"])) {
                        connectedOutputCount += output._events["pulse"].length
                    } else {
                        // console.log('zero pulse connections for ',component);
                    }
                });
                this.set('pathsOpened',this.get('pathsOpened') + connectedOutputCount);
            },
            cancel: function(){
                this.set('state','CANCELLED');
            },
            initialize: function(o){
                _.bindAll(this,
                    "cancel",
                    "updatePathCounts",
                    "shouldPropagate",
                    "setOpenPathCountBasedOnComponentOutputs"
                );

                if (!o || !o.startPoint) {
                    throw new Error("Pulse must be initialized with a starting Input, Output, or Component");
                }
                
                if (o.startPoint.modelType === "Input") {
                    // Pulses can be triggered on inputs, outputs, or components.
                    // When triggered on inputs, the subsequent pulse on the associated component will increment "pathsClosed"
                    // even though that path was never opened by any previous component. This creates an off-by-one error
                    // when an input is used as the starting point of a pulse.
                    this.set('pathsOpened', 1); 
                }

                //o.startPoint.trigger('pulse',this);
                
            }
        });

        return Pulse;
    }
);
