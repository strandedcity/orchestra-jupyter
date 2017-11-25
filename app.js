
define([
        "jquery",
        "underscore",
        "backbone",
        'dataFlow/dataFlow_loader',
        "dataFlow/UI/workspaceView",
        "dataFlow/UI/componentView",
        "dataFlow/project",
        "dataFlow/components/engine",
        "dataFlow/pulse",
        "dataFlow/freezeCalculations"
    ],
    function(
        $,
        _,
        Backbone,
        dataFlow,
        WS,
        ComponentView,
        OrchestraProject,
        PythonEngine,
        Pulse,
        Freezer
    ){
        // Include general styles
        $("head").append("<link rel='stylesheet' href='"+require.toUrl("src/css/orchestra.css")+"' type='text/css' media='screen'>");

        var prevTimeStamp = 0, events = [];
        window.LOG_TIME_EVENT = function(eventName, end){
            var timestamp = (new Date()).getTime();
            var timeobj = {};
            timeobj[eventName] = timestamp - prevTimeStamp;
            events.push(timeobj);
            prevTimeStamp = timestamp;

            if (end) {
                //console.log(JSON.stringify(events).toString().replace(/},{/g,"\n"));
                prevTimeStamp = 0;
                events = [];
            }
        };

        function App(Jupyter){
            if (Jupyter) this.setupEngine(Jupyter);
            else {console.error("Python Engine Not Initialized. All Python Functions will Error.");}
            _.extend(this,Backbone.Events);
            this.init();
        }





        App.prototype.init = function(){
            this.currentProject = null;
            _.bindAll(this,
                "newProject",
                "loadParseProject",
                "clearWorkspace",
                "loadJSON",
                "initializePulses"
            );

            this.workspace = new WS.Workspace();
            this.workspace.createWorkspace();

            // For initial, non-persisted testing
            this.currentProject = new OrchestraProject();

            // New components can be created directly in the workspace, as well as from the global nav:
            var that = this;
            this.workspace.on('createNewComponent',function(component){
                that.newComponent.call(that,component);
            });
        };

        App.prototype.newComponent = function(component){
            var that=this,
                position = component.position || this.workspace.getCurrentVisibleCenterPoint(),
                cptObject = dataFlow.createComponentByName(component["functionName"],{
                    position: position
                });
            this.currentProject.addComponentToProject(cptObject);

            // Handle "bake" equivalents: export STL, SVG, OBJ, Rendered Image, etc
            cptObject.on('requestFileExport',function(o){that.exporter.export(o);});

            new ComponentView(cptObject);
        };

        App.prototype.newProject = function(){
            this.clearWorkspace();
            this.loadWorkspace(this.currentProject);
        };

        App.prototype.clearWorkspace = function(){
            Freezer.setFrozen(true);
            console.warn('DO SOME TESTS TO MAKE SURE THAT ZOMBIES DONT REMAIN');

            // Stop listening to the project to remove ref's to the project
            this.stopListening();

            // We'll remove the views directly here, since we don't actually want to remmove the components from the project
            // model itself. That could cause weird behavior if a save occurred at the wrong moment, this is safer.
            if (!_.isNull(this.currentProject)) {
                _.each(this.currentProject.get('components').slice(0),function(cpt){
                    cpt.componentView.remove();
                });
            }

            this.currentProject = new OrchestraProject();
            require(["dataFlow/projectLoader"],function(Loader){
                Loader.clearCurrentProject();
            });

            this.workspace.render(); // render workspace once to remove wires from view
        };

        // App.prototype.save = function(){
        //     var proj = this.currentProject,
        //         that=this;
        //     if (_.isNull(proj)) throw new Error("No current project available to save");
        //
        //     require(["dataFlow/projectLoader"],function(Loader){
        //         Loader.saveProjectToParse(proj,that.getDisplayState());
        //     });
        // };

        App.prototype.getDisplayState = function(){
            return {
                workspace: this.workspace.toJSON()
            }
        };

        App.prototype.loadParseProject = function(projectId){
            this.clearWorkspace();
            var that = this;
            require(["dataFlow/projectLoader"],function(Loader){
                // no reference necessary. The slider will clean itself up.
                Loader.loadProjectFromParse(projectId)
                    .then(function(proj){
                        console.log('\n\nLOADED PROJECT FROM PARSE');
                        console.warn("VIEWER USED TO BE INITIALIZED HERE");
                        that.loadWorkspace(proj);
                    })
                    .fail(function(e){
                        if (e && e.code === 100) {
                            // Server is unavailable. This is a fatal error, but for right now let's just enter demo mode
                            alert("Server Unavailable. Entering Demo Mode.");
                            that.setupDemoMode();
                        } else {
                            alert("Unknown fatal error. See console for more info.");
                            console.log("Error details while trying to load project from Parse Server:");
                            console.log(e);
                        }
                    });
            });
        };

        App.prototype.loadJSONProjectUrl = function(url){
            this.clearWorkspace();
            var that = this;

            require(["dataFlow/projectLoader"],function(Loader){
                Loader.loadProjectFromUrl(url,function(proj){
                    console.log('\n\nLOADED PROJECT FROM FILE');
                    that.loadWorkspace(proj);
                });
            });
        };

        App.prototype.loadJSON = function(jsonData) {
            this.clearWorkspace();
            var that = this;

            require(["dataFlow/projectLoader"],function(Loader){
                Loader.loadProjectFromJson(jsonData,function(proj){
                    that.loadWorkspace(proj);
                });
            });
        }

        App.prototype.loadWorkspace = function(proj){
            // Make sure no pulses occur while we're loading components and connections
            Freezer.setFrozen(true);

            var that = this;
            this.currentProject = proj;

            // Bubble up changes to the active project so we can trigger a 'project changed' event externally
            this.listenTo(this.currentProject,'change',function(p){
                that.trigger('change',p.toJSON());
            });

            // Draw Componets, Inputs and Outputs in workspace:
            _.each(proj.get('components'),function(cpt){
                // Attach file export capabilities
                cpt.on('requestFileExport',function(o){that.exporter.export(o);});

                new ComponentView(cpt);
            });

            // CONNECTIONS between I/O's can't be drawn until all components have been drawn
            // (the views must exist before they can be connected)
            // TODO: ELIMINATE THIS DEFER STATEMENT -- PERHAPS WITH A PROMISE? PERHAPS BY SETTING THE IOVIEW PROPERTY SYNCHRONOUSLY
            // TODO: THEN PUTTING THE _.DEFER STATEMENT INSIDE THE DRAWALLCONNECTIONS FUNCTION?
            _.defer(function(){
                _.each(proj.get('components'),function(cpt){
                    _.each(cpt.inputs,function(ipt){
                        var inputView = ipt.IOView;
                        if (inputView) {
                            inputView.drawAllConnections();
                        }
                    });
                });
            });

            if (proj.get('contextData')) {
                this.workspace.fromJSON(proj.get('contextData')["workspace"]);
            }

            this.initializePulses(proj);
        };

        App.prototype.initializePulses = function(proj){

            // Unfreeze so we can follow pulses
            Freezer.setFrozen(false);

            // Trigger "change" events on components with inputs without connections, one per component
            // These are the beginnings of the "graph"
            _.each(proj.get('components'),function(cpt){
                var disconnectedCount = 0;
                _.each(cpt.inputs,function(ipt){
                    if (  _.keys(ipt._listeningTo).length === 0 && !ipt.getTree().isEmpty()) {
                        disconnectedCount++;
                    } else if (ipt.get('invisible') === true) {
                        disconnectedCount++;
                    }
                });

                // if all inputs to a component are disconnected, trigger a pulse
                // to make sure the component recalculates now that all connections are in place
                if (disconnectedCount === cpt.inputs.length) {
                    //console.log('master trigger now');
                    var start = cpt.inputs[0];
                    start.trigger('pulse',new Pulse({startPoint:start}));
                }
            });
        };

        App.prototype.setupEngine = function (J) {
            console.warn("SETUP ENGINE NEEDS TO BE IMPLEMENTED NOW")
            PythonEngine.setup(J);
        };

        App.prototype.close = function () {
            console.warn("Orchestra.Close() not yet implemented. It needs to clean up and remove UI.");
            this.workspace.destroy();
            this.trigger('closed',this.currentProject.toJSON());
            this.off();
        };

        return App;
    }
);
