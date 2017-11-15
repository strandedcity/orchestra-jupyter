define(["underscore","backbone","dataFlow/dataFlow_loader"],function(_,Backbone,DataFlow){
    return Backbone.Model.extend({
        defaults: function(){
            return {
                authorName: "anonymous",
                authorId: "",
                title: "",
                description: "",
                projectId: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                components: []
            }
        },
        initialize: function(opts){
            _.bindAll(this,"destroy");
            if (opts && opts.components) {
                this.loadComponentsFromJSON(opts.components);
            }
        },
        addComponentToProject: function(component){
            /* When the component is already defined elsewhere, and just needs to be part of the persistable model */
            var components = this.get('components');
            components.push(component);
            this.listenTo(component,'removed',this.removeComponent);
            this.set('components',components);
            return this;
        },
        createComponent: function(name,position){
            /* When the component hasn't been defined yet. CAREFUL: This does NOT read all the state from JSON, it just takes two parameters! */
            var pos = position || {x: 0, y: 0},
                newcpt;

            newcpt = DataFlow.createComponentByName(name,{
                position: pos
            });
            this.addComponentToProject(newcpt);
            return this;
        },
        removeComponent: function(component){
            /* Remove all the CONNECTIONS to the component first, then remove the component from the array */
            this.stopListening(component);
            var remainingComponents = _.without(this.get('components'),component);
            this.set('components', remainingComponents);
        },
        destroy: function(){
            console.warn("DESTROY on project isn't really a good idea. I should just remove VIEW stuff, not DATA stuff.");
            //_.each(this.get('components'),function(cpt){
            //    cpt.destroy();
            //});
            //this.stopListening();
            //console.log('destroyed project');
        },
        toJSON: function(){
            var attrs = _.clone(this.attributes);
            attrs.components = _.map(attrs.components,function(cpt){
                return cpt.toJSON();
            });
            return attrs;
        },
        loadComponentsFromJSON: function(json) {
            // loading occurs in two stages since connections can't easily be made until all components are added
            // first step: create each component, and keep track of EVERY IO as they go by so connections can be made directly
            var IOIdsForConnections = {};
            var connectionRoutes = [];
            var components = [];
            var that = this;
            var maxCid = 0;
            var updateMaxCid = function(idString){
                var thisId=parseInt(idString.replace("c",""));
                if (thisId > maxCid){
                    //console.log('increased max cid to: '+thisId+" from "+maxCid);
                    maxCid = thisId;
                }
            };

            _.each(json, function (cpt) {
                // Prior JSON files will use CIDs as IDs to identify components.
                // Any components we end up adding in this session should absolutely not conflict with those,
                // but the unique counter starts over per session. Solution: increment the session's
                // counter once per item that gets added to the project.
                // see https://github.com/dobtco/formbuilder/issues/123
                // BUG! When you add a component, delete it, then add another and save, the uniqueId will be "2" not "1".
                // When that definition is retrieved, _.uniqueId will only be called once, so the next created component will be
                // "2", which duplicates the retrieved CID. So instead of blindly calling this once, I actually need to detect the
                // largest ID I see, and call uniqueid that many times.
                
                updateMaxCid(cpt.id);
                if (cpt.output) {
                    // CODE DEBT! "output" should be "outputs"...
                    cpt.outputs = cpt.output;
                    delete cpt.output;
                }
                var component = DataFlow.createComponentByName(cpt.componentName, _.clone(cpt));
                components.push(component);
                that.addComponentToProject.call(that,component);

                // if the inputs are supposed to be connected to something, keep track of them for a moment
                _.each(cpt.inputs, function (iptJSON) {
                    updateMaxCid(iptJSON.id);
                    if (iptJSON.connections.length > 0) {
                        IOIdsForConnections[iptJSON.id] = component[iptJSON.shortName];
                        _.each(iptJSON.connections, function (connectedIptId) {
                            (function(connectedInputId){
                                var route = {};
                                route[iptJSON.id] = connectedInputId;
                                connectionRoutes.push(route);
                            })(connectedIptId);
                        });
                    }
                });

                // keep track of all outputs:
                //IOIdsForConnections[cpt.output[0].id] = component.output;
                _.each(component.outputs,function(out){
                    IOIdsForConnections[out.id] = out;
                });
            });

            // All components and IOs are initialized. Call "uniqueid" that many times
            while (parseInt(_.uniqueId("c").replace("c","")) < maxCid) { /* The test actually does all the work here! */ }
            //console.log('Next unique id will be: '+_.uniqueId("c"));

            // Now that all the component objects exist, they can be connected to each other:
            _.each(connectionRoutes,function(route){
                var inputId = _.keys(route)[0],
                    outputId = route[inputId],
                    inputObject = IOIdsForConnections[inputId],
                    outputObject = IOIdsForConnections[outputId];
                if (!_.isUndefined(inputObject.connectAdditionalOutput) && !_.isUndefined(outputObject))
                    inputObject.connectAdditionalOutput(outputObject);
                else {
                    console.trace();
                    console.warn("COULD NOT MAKE CONNECTION!! INVESTIGATE THIS!", inputObject, outputObject);
                    console.log(route);
                    console.log(json);
                }
            });

            this.set('components',components);
        }
    });
});