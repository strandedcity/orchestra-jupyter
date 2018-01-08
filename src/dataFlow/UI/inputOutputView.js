define([
    'dataFlow/dataFlow_loader',
    "dataFlow/UI/workspaceView",
    "underscore",
    "dataFlow/enums",
    "three"
],function(DataFlow, WS, _, ENUMS, THREE){

    /* Base class IOView */
    function IOView(ioModel,glObject,cssObject){
        if (_.isUndefined(ioModel) || _.isUndefined(glObject) || _.isUndefined(cssObject) ) {
            throw new Error('IOView must be passed a model and associated GL and CSS Views');
        }

        // refs work both ways
        this.model = ioModel;
        this.glObject = glObject;
        this.cssObject = cssObject;
        this.model.IOView = this;
        this.glObject.IOView = this;
        this.cssObject.IOView = this;

        _.extend(this, Backbone.Events);

        this._remove = function(){
            this.stopListening();
            //this.stretchy.remove();
            this.stretchy.parent.remove(this.stretchy);
            this.glObject.parent.remove(this.glObject);
            this.cssObject.parent.remove(this.cssObject);

            delete this.glObject.IOView;
            delete this.cssObject.IOView;
            delete this.model.IOView;
            delete this.model;
            delete this.glObject;
            delete this.cssObject;
        };
        this.setupStretchyWire = function(){
            // All inputs and outputs are connected via a "stretchy band" to their home positions
            // When dropped on an acceptable input, this line will be drawn as a permanent "connection" instead
            this.glObject.setHomePosition(); // snap-back behavior requires IO elements to know their own home positions. With reference to parent, not world!
            this.stretchy = WS.getWorkspaceSingleton().drawCurveFromPointToPoint(this.glObject.getHomePosition(), this.glObject.position);
            this.glObject.parent.add(this.stretchy);

            // NOTE! We want to do as little as possible inside the wire-drawing callback. So the start and end positions are defined by reference a scope outside.
            this.stretchyCurveArguments = [glObject.position, glObject.getHomePosition()];
            this.listenTo(this.glObject,"changePosition",function(){
                // NOTE: When there's a connection to this node, the INTERNAL line SHOULD NOT be redrawn when the overall component is moved!
                // Currently, this works because this event listener is attached to the IOView's "changePosition" event, not the component's
                WS.getWorkspaceSingleton().drawCurveFromPointToPoint(this.stretchyCurveArguments[0], this.stretchyCurveArguments[1], this.stretchy);
            });
        };

        this.doubleclick = function(){
            this.model.getTree().log();
        };

        var that = this;
        this.click = function(x,y){
            if (that.model.type !== ENUMS.OUTPUT_TYPES.NUMBER &&
                that.model.type !== ENUMS.OUTPUT_TYPES.BOOLEAN &&
                that.model.type !== ENUMS.OUTPUT_TYPES.STRING &&
                that.model.type !== ENUMS.OUTPUT_TYPES.WILD &&
                that.model.type !== ENUMS.OUTPUT_TYPES.COMPARATOR) return;

            // Show the table-number-enterer UI. It cleans up after itself.
            var data = that.model.get('persistedData') || new DataTree(),
                callback = function(tree){
                    that.model.assignPersistedData(tree);
                };
            require(["dataFlow/UI/tableValueEnterer"],function(TableView){
                // no reference necessary. The slider will clean itself up.
                new TableView(data,x,y,callback,that.model.type);
            });
        };

        WS.getWorkspaceSingleton().setupDraggableView(this);  // make the view draggable!
        this.setupStretchyWire();
    }


    /* Input Views Are responsible for drawing connection wires and handling drop events that change data flow */
    function InputView(inputModel,glObject,cssObject) {
        IOView.call(this,inputModel,glObject,cssObject);
        this.connectedOutputViews = [];
        this.connectionWires = [];

        // register event listeners! Both inputs and outputs need to pass through events when their parents move around:
        var that = this;

        // When moving the INPUT'S Component, all the wires connected to the input should be redrawn:
        this.listenTo(this.glObject.parent,"changePosition",function(){
            _.each(this.connectedOutputViews,function(outputView,idx){
                that.redrawWireForConnectedOutput(outputView,that.connectionWires[idx]);
            });
        });

        // Inputs handle drop events directly. Triggered in the workspaceView!
        this.listenTo(this.cssObject, "drop", function(droppedCSSObj,modifiers){
            // Is the user holding the shift key? If so, connect output ADDITIONALLY.
            // Otherwise, replace connections.
            if (modifiers[ENUMS.KEYS.SHIFT] === true) {
                this.model.connectAdditionalOutput(droppedCSSObj.IOView.model, true);
            } else {
                this.model.connectOutput(droppedCSSObj.IOView.model);
            }
        });

        // The backbone way: listen to data changes to make view changes
        this.listenTo(this.model,"connectedOutput",this.connectToOutput);
        this.listenTo(this.model,"disconnectedOutput",this.disconnectFromOutput);
    }

    InputView.prototype.objectType = "InputView"; // protects name from optimizer in build process

    InputView.prototype.remove = function(){
        // input-specific cleanup
        var that = this;
        _.each(this.connectionWires,function(wireView){that.glObject.parent.parent.remove(wireView)});
        this._remove();
    };

    InputView.prototype.connectToOutput = function(output){
        var outputView = output.IOView;

        // must pre-render to make sure that the matrices for the referenced GL elements are updated
        WS.getWorkspaceSingleton().render();

        var that = this;
        this.connectedOutputViews.push(outputView);
        var wireView = this.redrawWireForConnectedOutput(outputView);
        this.glObject.parent.parent.add(wireView); // Adding the wire to the input or component slows rendering for reasons I don't totally understand. But it doesn't matter.
        this.connectionWires.push(wireView);
        this.listenTo(outputView.glObject.parent,"changePosition",function(){
            that.redrawWireForConnectedOutput(outputView,wireView);
        });

        // post-render to make sure the wire gets drawn
        WS.getWorkspaceSingleton().render();
    };

    InputView.prototype.disconnectFromOutput = function(output){
        var outputView = output.IOView,
            index = _.indexOf(this.connectedOutputViews,outputView),
            wire = this.connectionWires[index];

        // Remove wire and output from tracking arrays
        this.connectionWires = _.without(this.connectionWires,wire);
        this.connectedOutputViews = _.without(this.connectedOutputViews,outputView);

        wire.parent.remove(wire);

        // update the view to this effect
        WS.getWorkspaceSingleton().render();
    };

    InputView.prototype.removeAllWires = function(){
        var that = this;

        // Remove prior wires
        _.each(this.connectionWires,function(wire){
            wire.parent.remove(wire);
        });
        _.each(this.connectedOutputViews,function(outView){
            that.stopListening(outView.glObject.parent, "changePosition");
        });
        this.connectionWires = [];
        this.connectedOutputViews = [];
    };

    InputView.prototype.drawAllConnections = function(){
        var that = this,
            connections = this.model._listeningTo;
        if (!_.isEmpty(connections)){
            _.each(_.values(connections),function(outputModel){
                that.connectToOutput.call(that,outputModel);
            });
        }
    };

    InputView.prototype.redrawWireForConnectedOutput = function(outputView,wireView){
        outputView.glObject.updateMatrixWorld();
        this.glObject.updateMatrixWorld();

        var end = (new THREE.Vector3()).setFromMatrixPosition(this.glObject.matrixWorld),
            start = (new THREE.Vector3()).setFromMatrixPosition(outputView.glObject.matrixWorld);

        return WS.getWorkspaceSingleton().drawCurveFromPointToPoint(start,end,wireView);
    };

    function OutputView(inputModel,glObject,cssObject) {
        IOView.call(this,inputModel,glObject,cssObject);

        // The internal "stretchy band" is still oriented left-to-right, so must be drawn in the correct order for Outputs also:
        this.stretchyCurveArguments.reverse();
    }
    OutputView.prototype.remove = function(){
        // output-specific cleanup
        this._remove(); // IOView Superclass
    };

    OutputView.prototype.objectType = "OutputView"; // protects name from optimizer in build process

    return {
        InputView: InputView,
        OutputView: OutputView
    };
});