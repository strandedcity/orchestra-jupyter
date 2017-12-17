define([
    "jquery",
    'dataFlow/dataFlow_loader',
    "dataFlow/UI/workspaceView",
    "dataFlow/UI/inputOutputView",
    "underscore",
    "backbone",
    "dataFlow/dataTree"
],function($, DataFlow, WS, ioView, _, Backbone, DataTree){
    var INPUT_HEIGHT = 60;

    /* Almost all components will use the regular ol' component view. But as other view types evolve, they can be employed easily here */
    function ComponentViewSelector(component){
        if (_.isUndefined(component) || (_.isUndefined(component.recalculate) && _.isUndefined(component.recalculateTrees)) ) {
            throw new Error('ComponentView objects must be instantiated with the DataFlow.Component which they represent');
        }

        if (component.componentName === "SliderComponent") {
            return new SliderComponentView(component);
        } else if (component.componentName === "BooleanToggleComponent") {
            console.log('creating toggler')
            return new BooleanToggleComponentView(component);
        } else if (component.componentName === "PrintComponent") {
            return new PrintComponentView(component);
        } else if (component.componentName === "LinePlot") {
            return new MatPlotLibComponentView(component);
        } else {
            return new ComponentView(component);
        }
    }

    function PrintComponentView(component) {
        /* This refers only to the dataflow component, not the actual slider. So here, we handle events that interface with
         * the slider, but not the display of the slider itself. */


        var that = this,
            pathNodeTemplate = _.template("<div class='pathNodeTitle'>{<%= path %>}</div>"),
            dataTemplate = _.template("<div class='dataRow'><%= text %></div>");


        _.extend(this,ComponentView.prototype,{
            displayVals: function(){
                // Because the outputs are promises, we need to capture their resolved values rather than printing directly
                var textOutput = "", dataAndNodes = [];
                that.component.getOutput("D").getTree().recurseTree(function (data, node) {
                    dataAndNodes.push(node);
                    _.each(data,function (d) {
                        dataAndNodes.push(d);
                    })
                });
                Promise.all(dataAndNodes).then(function (values) {
                    _.each(values,function(val,index){
                        if (val.constructor.name === "Node") {
                            textOutput += pathNodeTemplate({path: val.getPath()});
                        } else {
                            console.log(val);
                            // it's data! Should look like: {text: "[ 0.  0.  0.  0.  0.]↵", name: "stdout"}
                            textOutput += dataTemplate({text: val.text.replace(/\n/g,"<br />")});
                        }
                    });
                    that.printArea.innerHTML = textOutput;
                });
            },

            createComponentWithNamePosition: function(name, x, y){
                var element = document.createElement( 'div' );
                element.className = 'draggable PrintComponent freezeZooming';

                var label = document.createElement( 'div' );
                label.className = 'printComponentTextArea';
                that.printArea = label;
                element.appendChild( label );
                element.width = "700px";
                element.height = "320px";

                var cssObject = new THREE.CSS3DObject( element );
                cssObject.position.x = x || 0;
                cssObject.position.y = y || 0;
                cssObject.position.z = 0;

                WS.getWorkspaceSingleton().scene.add(cssObject);
                element.uuid = cssObject.uuid; // so the object is identifiable later for drag/drop operations

                return cssObject;
            }
        });

        that.init(component);

        that.listenTo(that.component.getOutput("D"),"change",that.displayVals);
    }

    // A component that visualizes charts
    function MatPlotLibComponentView(component) {
        var that = this,
            pathNodeTemplate = _.template("<div class='pathNodeTitle'>{<%= path %>}</div>"),
            dataTemplate = _.template("<div class='dataRow'><%= text %></div>"),
            imageContainerTemplate = _.template("<div class='dataRow'><img src='data:image/png;base64,<%= pngdata %>' /></div>");


        _.extend(this,ComponentView.prototype,{
            displayVals: function(){
                // Because the outputs are promises, we need to capture their resolved values rather than printing directly
                var textOutput = "", dataAndNodes = [];
                that.component.getOutput("D").getTree().recurseTree(function (data, node) {
                    dataAndNodes.push(node);
                    _.each(data,function (d) {
                        dataAndNodes.push(d);
                    })
                });
                Promise.all(dataAndNodes).then(function (values) {
                    _.each(values,function(val,index){
                        if (val.constructor.name === "Node") {
                            textOutput += pathNodeTemplate({path: val.getPath()});
                        } else {
                            // Should be an array of PNG-base64 encoded images
                            _.each(val,function(pngdata){
                                textOutput += imageContainerTemplate({pngdata: pngdata});
                            });
                        }
                    });
                    that.printArea.innerHTML = textOutput;
                });
            },

            createComponentWithNamePosition: function(name, x, y){
                var element = document.createElement( 'div' );
                element.className = 'draggable PrintComponent freezeZooming';

                var label = document.createElement( 'div' );
                label.className = 'printComponentTextArea';
                that.printArea = label;
                element.appendChild( label );
                element.width = "700px";
                element.height = "320px";

                var cssObject = new THREE.CSS3DObject( element );
                cssObject.position.x = x || 0;
                cssObject.position.y = y || 0;
                cssObject.position.z = 0;

                WS.getWorkspaceSingleton().scene.add(cssObject);
                element.uuid = cssObject.uuid; // so the object is identifiable later for drag/drop operations

                return cssObject;
            }
        });

        that.init(component);

        that.listenTo(that.component.outputs[0],"change",that.displayVals);
    }

    function BooleanToggleComponentView(component){
        /* This refers only to the dataflow component, not the actual slider. So here, we handle events that interface with
         * the slider, but not the display of the slider itself. */
        var that = this;
        _.extend(this,ComponentView.prototype,{
            // Show Slider UI
            doubleclick: function(x,y){
                // change boolean value on double click
                var currValTree = that.component.getInput("B").getTree();
                currValTree.setDataAtPath(!currValTree.dataAtPath([0])[0],[0]);
            },
            displayVals: function(){
                if (_.isEmpty(this.component.getOutput("B").getTree().dataAtPath([0]))) {
                    this.setDisplayLabel(this.component.get('componentPrettyName'));
                } else {
                    this.setDisplayLabel(this.component.getOutput("B").getTree().dataAtPath([0]).toString());
                }
            }
        });

        this.init(component);

        this.listenTo(this.component.getOutput("B"),"change",this.displayVals);
    }

    function SliderComponentView(component) {
        /* This refers only to the dataflow component, not the actual slider. So here, we handle events that interface with
         * the slider, but not the display of the slider itself. */
        var that = this;
         _.extend(this,ComponentView.prototype,{
            // Show Slider UI
            click: function(x,y){
                // Show the slider and overlay. It cleans up itself.
                var val = component.getOutput("N").getFirstValueOrDefault(),
                    min = component.getInput("S").getFirstValueOrDefault(),
                    max = component.getInput("E").getFirstValueOrDefault(),
                    integers =  component.getInput("I").getFirstValueOrDefault(),
                    callback = this.sliderUpdateValue;
                require(["dataFlow/UI/sliderView"],function(SliderView){
                    // no reference necessary. The slider will clean itself up.
                    new SliderView(val,min,max,integers,x,y,callback);
                });
            },
            sliderUpdateValue: function(value){
                // this component uses IOs differently than other components so that the value
                // can persist successfully, be fed into the slider view, trigger recalculations, etc.
                component.storeUserData(value);
                that.displayVals();
            },
            displayVals: function(){
                if (_.isEmpty(this.component.getOutput("N").getTree().dataAtPath([0]))) {
                    this.setDisplayLabel(this.component.get('componentPrettyName'));
                } else {
                    this.setDisplayLabel(this.component.getOutput("N").getTree().dataAtPath([0]).toString());
                }
            }
        });
        _.bindAll(this,"click","sliderUpdateValue");

        this.init(component);
     }

    ///////////////////////
    // BEGIN GENERIC COMPONENTVIEW METHODS
    ///////////////////////
    function ComponentView(component){
        this.init(component);
    }

    ComponentView.prototype.init = function(component){
        this.component = component;

        _.extend(this,Backbone.Events);

        _.bindAll(this,"processIOViews","createGLElementToMatch");
        this.cssObject = this.createComponentWithNamePosition(this.component.get('componentPrettyName'), this.component.position.x, this.component.position.y);

        _.defer(function(){
            this.glObject = this.createGLElementToMatch(this.cssObject);
            WS.getWorkspaceSingleton().setupDraggableView(this);  // make the view draggable!
            if (this.component.get('sufficient') == true) this.changeSufficiency();
            this.listenTo(this.glObject,"changePosition",function(){component.position = this.glObject.position;});
        }.bind(this));

        component.componentView = this;
        this.inputViews = {};
        this.outputViews = {};
        this.processIOViews(this.component.inputs,this.inputViews,true);
        this.processIOViews(this.component.outputs,this.outputViews,false);

        // call once at the end!
        WS.getWorkspaceSingleton().render();

        // With dom elements created, bind events:
        this.listenTo(this.component,"change:preview",this.changePreviewState);
        this.listenTo(this.component,"change:sufficient",this.changeSufficiency);
        this.listenTo(this.component,"change:componentPrettyName",this.displayVals);
        this.listenTo(this.component,"removed",this.remove);

        // Initial rendering states
        this.changePreviewState();
        this.changeSufficiency();
    };

    ComponentView.prototype.displayVals = function(){
        this.setDisplayLabel(this.component.get('componentPrettyName'));
    };

    ComponentView.prototype.doubleclick = function(){
        // default double-clicking just logs the data from the first output
        this.component.getOutput().getTree().log();
    };

    ComponentView.prototype.changeSufficiency = function(){
        var state = this.component.get("sufficient");

        var classToAdd;
        if (state === true) classToAdd = "sufficient";
        else if (state === "error") classToAdd = "error";
        else classToAdd = "insufficient";

        var displayDiv = this.getDisplayDiv();
        displayDiv.classList.remove("sufficient");
        displayDiv.classList.remove("insufficient");
        displayDiv.classList.remove("error");
        displayDiv.classList.add(classToAdd);
    };

    ComponentView.prototype.changePreviewState = function(){
        // true or false, but default component display assumes preview on. There's only one CSS class to manage.
        var state = this.component.get("preview"); 

        var displayDiv = this.getDisplayDiv(),
            previewOffClass = "previewOff";
        displayDiv.classList.remove(previewOffClass);
        if (state === false) {
            displayDiv.classList.add(previewOffClass);
        }
    };

    ComponentView.prototype.getDisplayDiv = function(){
        return this.cssObject.element.firstChild;
    };

    ComponentView.prototype.setDisplayLabel = function(text){
        this.getDisplayDiv().textContent = text;
    };

    ComponentView.prototype.createComponentWithNamePosition = function(name, x, y){
        var element = document.createElement( 'div' );
        element.className = 'draggable';

        var label = document.createElement( 'div' );
        label.className = 'componentLabel';
        label.textContent = name;
        element.appendChild( label );
        element.width = "240px";
        element.height = "80px";

        var cssObject = new THREE.CSS3DObject( element );
        cssObject.position.x = x || 0;
        cssObject.position.y = y || 0;
        cssObject.position.z = 0;

        WS.getWorkspaceSingleton().scene.add(cssObject);
        element.uuid = cssObject.uuid; // so the object is identifiable later for drag/drop operations

        return cssObject;
    };

    ComponentView.prototype.remove = function(){
        this.stopListening();

        // Delete input views first, the connections live there
        _.each(this.component.inputs,function(ipt){
            if (!_.isEmpty(ipt.IOView)) ipt.IOView.remove();
        });

        _.each(this.component.outputs,function(out){
            if (!_.isEmpty(out.IOView)) {
                out.IOView.remove();
            }
        });

        WS.getWorkspaceSingleton().scene.remove(this.cssObject);
        WS.getWorkspaceSingleton().glscene.remove(this.glObject);
        delete this.component.componentView; // remove references to the view
        delete this.component; // shouldn't be necessary but can't really hurt

        WS.getWorkspaceSingleton().render(); // get rid of input wires
    };

    ComponentView.prototype.processIOViews = function(IOModelArray,IOViewsArray,inputsBoolean){
        var invisibleInputCount = _.filter(IOModelArray, function(input){ return input.get('invisible') === true; }).length,
            verticalStart = INPUT_HEIGHT * (_.keys(IOModelArray).length - 1 - invisibleInputCount) / 2,
            cssObj = this.cssObject,
            ioViewConstructor = inputsBoolean ? ioView.InputView : ioView.OutputView,
            componentName = this.component.componentName;

        _.each(IOModelArray, function(ioModel,idx){
            if (ioModel.type !== DataFlow.OUTPUT_TYPES.NULL && ioModel.get('invisible') !== true) {
                //this.createOutputWithNameAndParent(ioModel.shortName,ioModel.type,this.cssObject,verticalStart - idx * INPUT_HEIGHT);

                var name = ioModel.shortName,
                    outputCSSObj = this._createIOWithNameAndParent(
                        name,
                        componentName,
                        cssObj,
                        verticalStart - idx * INPUT_HEIGHT,
                        inputsBoolean,
                        ioModel.type
                    ),
                    that = this;

                _.defer(function(){
                    var glObject = that.createGLElementToMatch(outputCSSObj);
                    IOViewsArray[name] = new ioViewConstructor(ioModel,glObject,outputCSSObj);
                });
            }
        },this);
    };

    ComponentView.prototype._createIOWithNameAndParent = function(name, componentName, parentCSSElement, verticalOffset, isInput, dragScope){
        var element = document.createElement("div");
        element.className = 'draggable IO ' + componentName;
        element.textContent = name;
        parentCSSElement.element.appendChild(element);

        var cssObject = new THREE.CSS3DObject( element );

        parentCSSElement.add(cssObject);

        // Position of the IO elements is tricky.
        // It's based on the width of the parent element, but we don't actually know what that is until the parent
        // element is on the page. However, it can and should be coded into the JS, which allows us to position the IOs
        var parentWidthHalf = 150; // default for 'normal' components. This should be set in 'createComponentWithNamePosition'
        try {
            parentWidthHalf = parseInt(parentCSSElement.element.width.replace("px", "")) / 2 + 40;
        } catch (e) {
            console.warn("Could not parse 'width' attribute of the component's main CSS Element. This should be set both in code and in CSS, so that element size can be determined (and GL dopplegangers placed) without first rendering the element")
        }

        cssObject.position.z = 0;
        cssObject.position.y = verticalOffset;
        cssObject.position.x = isInput ? - parentWidthHalf : parentWidthHalf;
        cssObject.element.className += isInput ? ' inputIO' : ' outputIO';
        cssObject.addDraggableScopes([isInput ? "input":"output", dragScope]);
        cssObject.addDroppableScopes([isInput ? "output":"input", dragScope]);

        return cssObject;
    };

    // We need the css renderer so that standard DOM components like inputs can be usable, and scaled
    // all the hit calculation and drawing of connections, however, happens in webgl.
    ComponentView.prototype.createGLElementToMatch = function(cssElement){
        var width = cssElement.element.clientWidth, height = cssElement.element.clientHeight;

        // it's possible to hit this line before the css element renders.
        if (width === 0 || height === 0) { throw new Error("CSS Element Must be allowed to render before polling for its size."); }

        var rectShape = new THREE.Shape();
        rectShape.moveTo( 0, 0 );
        rectShape.lineTo( 0, height );
        rectShape.lineTo( width, height );
        rectShape.lineTo( width, 0 );
        rectShape.lineTo( 0, 0 );
        // rectShape.moveTo( left, top );
        // rectShape.lineTo( left, height );
        // rectShape.lineTo( width, height );
        // rectShape.lineTo( width, top );
        // rectShape.lineTo( left, top );

        var geometry = new THREE.ShapeGeometry( rectShape );
        geometry.applyMatrix( new THREE.Matrix4().makeTranslation( - width/2,  - height/2, 0) ); // the corresponding css element centers itself on the 3js position
        var mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true, transparent: true, opacity: 0.0 }) );
        mesh.position.set(cssElement.position.x,cssElement.position.y,0);
        cssElement.element.uuid = cssElement.uuid;

        // If this.glObject is defined, we're talking about a child to be added (ie, an input's glObject)
        // Otherwise, we're talking about the component itself:
        var glParent = !_.isUndefined(this.glObject) ? this.glObject : WS.getWorkspaceSingleton().glscene;
        glParent.add(mesh);

        return mesh;
    };

    return ComponentViewSelector;
});