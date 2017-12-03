define([
    "jquery",
    "underscore",
    "dataFlow/enums",
    "backbone",
    "bootstrap3"
],function(
    $,_,ENUMS,Backbone
){
    // DO NOT CACHE THIS SELECTOR!
    // If the workspace is removed then re-added, we want to make sure this gets re-evaluated
    var WS_ELEMENT = 'div.TOP';

    // There's a somewhat odd strategy in motion here...
    // To make it so there's never more than one popover onscreen at a time, and because the WebGL and CSS3D Transforms
    // make it hard for bootstrap to correctly detect the position of DOM elements handed to it,
    // the strategy is to create an anchor element the same size and shape as the IO element (*including its applied
    // css transforms!*, and add the popover to that instead. This produces a little popover state management
    var $currentAnchor = null;
    function clearPopover(){
        // Always make sure there's only one at a time
        if ($currentAnchor) {
            if ($currentAnchor.popover) $currentAnchor.popover('destroy');
            $currentAnchor.remove();
            $currentAnchor = null;
        }
    }
    var clearPopoversOnZoom = _.once(function(){
        document.addEventListener( 'mousewheel', clearPopover, false );
        document.addEventListener( 'DOMMouseScroll', clearPopover, false ); // firefox
    });
    clearPopoversOnZoom();


    // Not used... but very useful.
    // function toScreenPosition(obj, camera, renderer)
    // {
    //     var vector = new THREE.Vector3();
    //
    //     var widthHalf = 0.5*renderer.context.canvas.width;
    //     var heightHalf = 0.5*renderer.context.canvas.height;
    //
    //     obj.updateMatrixWorld();
    //     vector.setFromMatrixPosition(obj.matrixWorld);
    //     vector.project(camera);
    //
    //     vector.x = ( vector.x * widthHalf ) + widthHalf;
    //     vector.y = - ( vector.y * heightHalf ) + heightHalf;
    //
    //     return {
    //         x: parseInt(vector.x),
    //         y: parseInt(vector.y)
    //     };
    //
    // };


    /////////////////////
    //  THIS IS THE MAIN EVENT
    /////////////////////
    function HelpTooltips() {
        this.mouseDown = 0;

        _.bindAll(this,"incrementMousedown","decrementMousedown","mouseEnter");

        $(WS_ELEMENT).on("mouseenter","div.draggable",this.mouseEnter);
        $(WS_ELEMENT).on('mousedown',this.incrementMousedown);
        $(WS_ELEMENT).on('mouseup',this.decrementMousedown);
    }

    HelpTooltips.prototype.incrementMousedown = function(){
        clearPopover();
        this.mouseDown = this.mouseDown + 1;
    };
    HelpTooltips.prototype.decrementMousedown = function(){
        this.mouseDown = this.mouseDown - 1;
    };

    var _bodyContentTemplate = _.template(
        "<ul class='io_tooltip'>" +
        "<% if (desc != '') { %><li><span class='io_description'><%= desc %><% if (required) { %>*<% } %></span></li><% } %>" +
        "<li><span class='io_isRequired'><% if (required) { %>*<% } %>(<% if (!required) { %>Not <% } %>Required)</span></li>" +
        "<% if (defaultValue != '(none)') { %><li><span class='io_tooltip_field_title'>Default Value: </span> <span class='io_tooltip_field_value'><%= defaultValue %></span></li><% } %>" +
        "<li><span class='io_tooltip_field_title'>Interpreted as: </span><span class='io_tooltip_field_value'><%= interpretAs %></span></li>" +
        "</ul>"
    );

    var _bodyContentTemplateOutput = _.template(
        "<ul class='io_tooltip'>" +
        "<% if (desc == '') { %><li><span class='io_tooltip_field_title'>(no description)</span></li><% } else { %>" +
        "<li><span class='io_description'><%= desc %></span></li><% } %>" +
        "</ul>"
    );

    var _titleContentTemplate = _.template("<%= shortName %>: <%= type %>")

    HelpTooltips.prototype.mouseEnter = function(e){
        var that = this;
        e.stopPropagation();
        e.preventDefault();

        // The "view" object associated with the thing that was clicked for context menu:
        var viewObject = $(e.currentTarget).data('viewObject'),
            x = e.clientX,
            y = e.clientY;

        var constructorName = viewObject.constructor.name;
        if (constructorName && (constructorName == "OutputView" || constructorName == "InputView") && that.mouseDown === 0) {

            // Start fresh
            clearPopover();

            var cancel = setTimeout(function(){
                // Cancel for clicks
                if (that.mouseDown !== 0) {return;}

                // See Tooltips for understanding
                var IOPosition = viewObject.cssObject.element.getBoundingClientRect();
                var anchorTemplate = _.template("<div class='locationAnchor' style='position: absolute;z-index:0; opacity: 0; width: <%= width %>px; height: <%= height %>px;top: <%= top %>px; left: <%= left %>px;'></div>")
                $currentAnchor = $(anchorTemplate(IOPosition));
                $('body').append($currentAnchor);

                var m = viewObject.model;
                var jsonRep = m.toJSON();
                var isOutputView = constructorName == "OutputView";

                jsonRep.defaultValue = ( _.isUndefined(jsonRep.default) || _.isNull(jsonRep.default) ) ? "(none)" : jsonRep.default;
                jsonRep.desc = _.isUndefined(jsonRep.desc) ? "" : jsonRep.desc;
                jsonRep.interpretAs = ENUMS.DISPLAY_NAMES.INTERPRET_AS[jsonRep.interpretAs] || "Item";
                jsonRep.required = _.isUndefined(jsonRep.required) ? true : jsonRep.required;
                jsonRep.type = ENUMS.DISPLAY_NAMES.OUTPUT_TYPES[jsonRep.type];
console.log(jsonRep)
                // Figure out hide/show conditions....
                $currentAnchor.popover({
                    title: _titleContentTemplate(jsonRep),
                    html: true,
                    content: isOutputView ? _bodyContentTemplateOutput(jsonRep) : _bodyContentTemplate(jsonRep),
                    trigger:'manual',
                    container: 'body',
                    placement: 'auto ' + (isOutputView ? "right" : "left")
                }).popover('show');

                $(e.currentTarget).one('mouseleave',clearPopover);
            },750);

            $(e.currentTarget).one('mouseleave',function(){
                clearTimeout(cancel);
            });
        }
    };

    HelpTooltips.prototype.destroy = function(){
        clearPopover();
        $(WS_ELEMENT).off("mouseenter","div.draggable",this.mouseEnter);
        $(WS_ELEMENT).off('mousedown',this.incrementMousedown);
        $(WS_ELEMENT).off('mouseup',this.decrementMousedown);
    };

    return HelpTooltips;
});