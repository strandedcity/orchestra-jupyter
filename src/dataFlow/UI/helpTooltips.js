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
            $currentAnchor.off("show.bs.popover");
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

    var _componentTitle = _.template("<%= componentPrettyName %> <span class='cmpt_tooltip_title_modulename'>(<%= module %>.<%= componentName %>)</span>");

    var _componentBodyErrorState = _.template(
        "<% _.each(errors,function(e,idx){ %> "+
        "       <div class='cmpt_error_line'>"+
        "           <span class='err_type'><%= e.type %>:</span>"+
        "           <span class='err_msg'><%= e.message %></span>"+
        "       <div> "+
        "<% }) %>"
    );

    var _componentBody = _.template(
        "<div class='cmpt_tooltip'>"+
        "   <div class='cmpt_description'><%= description %></div> "+
        "       <div class='cmpt_io_container'>"+
        "           <span class='cmpt_io_title'>Inputs:</span>"+

        "<% _.each(inputs,function(i){ %> "+
        "       <div class='cmpt_io'>"+
        "           <span class='cmpt_io_name'><%= i.shortName %><% if (i.required) { %>*<% } %></span>"+
        "           <span class='cmpt_io_details'>(<%= i.type %>, as <%= i.interpretAs %>) <%= i.desc %>"+
        "               <% if (i.defaultValue != '(none)') { %>Default: <%= i.defaultValue %><% } %>"+
        "           </span></span>"+
        "       </div> "+
        "<% }) %>"+

        "           <span class='cmpt_io_title'>Outputs:</span>"+

        "<% _.each(outputs,function(i){ %> "+
        "       <div class='cmpt_io'>"+
        "           <span class='cmpt_io_name'><%= i.shortName %></span>"+
        "           <span class='cmpt_io_details'>(<%= i.type %>, as <%= i.interpretAs %>) <%= i.desc %></span>"+
        "       </div> "+
        "<% }) %>"+

        "           <span class='cmpt_io_required_legend'>* = required</span>"+
        "       </div> "+
        "</div>"
    );

    function representIO(m){
        var jsonRep = m.toJSON();
        jsonRep.defaultValue = ( _.isUndefined(jsonRep.default) || _.isNull(jsonRep.default) ) ? "(none)" : jsonRep.default;
        jsonRep.desc = _.isUndefined(jsonRep.desc) ? "" : jsonRep.desc;
        jsonRep.interpretAs = ENUMS.DISPLAY_NAMES.INTERPRET_AS[jsonRep.interpretAs] || "Item";
        jsonRep.required = _.isUndefined(jsonRep.required) ? true : jsonRep.required;
        jsonRep.type = ENUMS.DISPLAY_NAMES.OUTPUT_TYPES[m.get('type')];
        return jsonRep;
    }

    function representComponent(m){
        var jsonRep = m.toJSON();
        jsonRep.errors = m.errors; // deliberately not an attribute, b/c no need to listen or persist
        jsonRep.description = m.constructor.desc;
        jsonRep.label = m.constructor.label;
        jsonRep.module = m.constructor.module;
        jsonRep.inputs = _.map(m.inputs,function (i) {
            return representIO(i);
        });
        jsonRep.outputs = _.map(m.outputs,function (o) {
            return representIO(o);
        });

        return jsonRep;
    }


    HelpTooltips.prototype.mouseEnter = function(e){
        // Bail during click or drag events
        if (this.mouseDown !== 0) return;

        var that = this;
        e.stopPropagation();
        e.preventDefault();

        // The "view" object associated with the thing that was clicked for context menu:
        var viewObject = $(e.currentTarget).data('viewObject'),
            constructorName = viewObject.constructor.name;

        // Start fresh
        clearPopover();

        var hoverObject = $(viewObject.cssObject.element);
        if (hoverObject.find('.componentLabel').size() > 0) {
            // "component" cssObject is for the whole component, which includes the IOs. I only want the label.
            hoverObject = hoverObject.find('.componentLabel').get(0);
        } else {
            // IO's are just the IO's
            hoverObject = hoverObject.get(0);
        }

        var hoverObjectPosition = hoverObject.getBoundingClientRect(),
            anchorTemplate = _.template("<div class='locationAnchor' style='position: absolute;z-index:0; opacity: 0; width: <%= width %>px; height: <%= height %>px;top: <%= top %>px; left: <%= left %>px;'></div>");
        $currentAnchor = $(anchorTemplate(hoverObjectPosition));
        $('body').append($currentAnchor);


        if (constructorName && (constructorName == "OutputView" || constructorName == "InputView")) {
            // // Commented out 12/10/17. These I/O Tooltips work, but I find them distracting and
            // unnecessary because of the component tooltips. So... commenting out for now.
            // //  HELP TOOLTIPS FOR INPUTS AND OUTPUTS
            // var jsonRep = representIO(viewObject.model),
            //     isOutputView = constructorName == "OutputView";
            //
            // showPopoverWithDelay(
            //     _titleContentTemplate(jsonRep),
            //     isOutputView ? _bodyContentTemplateOutput(jsonRep) : _bodyContentTemplate(jsonRep),
            //     isOutputView ? "right" : "left",
            //     null,
            //     e.currentTarget
            // );
        } else if (constructorName && constructorName.indexOf("ComponentView") > -1) {

            //  HELP TOOLTIPS FOR COMPONENTS
            // Tooltip can be used for "PrintComponentView" and others

            var jsonRep = representComponent(viewObject.component),
                errorState = viewObject.component.get('sufficient') === "error";

            showPopoverWithDelay(
                _componentTitle(jsonRep),
                errorState ? _componentBodyErrorState(jsonRep) : _componentBody(jsonRep),
                'top',
                {"max-width":"600px"},
                e.currentTarget
            )
        }
    };

    function showPopoverWithDelay(title,content,positionPreference,extraCss,targetElement){
        var cancel = setTimeout(function(){

            if (extraCss && $currentAnchor) {
                $currentAnchor.on("show.bs.popover", function(){
                    $(this).data("bs.popover").tip().css(extraCss);
                });
            }

            $currentAnchor.popover({
                title: title,
                html: true,
                content: content,
                trigger:'manual',
                container: 'body',
                placement: 'auto ' + positionPreference // prefer the specified spot, but go where you have to
            }).popover('show');


            $(targetElement).one('mouseleave',clearPopover);
        },600);

        $(targetElement).one('mouseleave',function(){
            clearTimeout(cancel);
        });
    }

    HelpTooltips.prototype.destroy = function(){
        clearPopover();
        $(WS_ELEMENT).off("mouseenter","div.draggable",this.mouseEnter);
        $(WS_ELEMENT).off('mousedown',this.incrementMousedown);
        $(WS_ELEMENT).off('mouseup',this.decrementMousedown);
    };

    return HelpTooltips;
});