define([
    "jquery",
    "bootstrap-slider"
],function($){
    // See https://github.com/seiyria/bootstrap-slider for slider documentation

    function SliderView(min,max,integers,x,y,valueCallback){
        this.init.apply(this,arguments);
    }

    SliderView.prototype.init = function(val,min,max,integers,x,y,valueCallback){
        // setup overlay
        var overlay = this.createOverlay();

        // Add input to the DOM
        var id = "slider_"+Math.floor(Math.random()*10000);
        var input = $("<input id='"+id+"'></input>");
        $('body').append(input);

        // Bind slider widget to input
        input.slider({
            min: min,
            max: max,
            step: integers ? 1 : 0.01,
            value: val,
            selection: 'none',
            tooltip: 'always',
            id: 'a'+id
        });

        // manually position the visible slider:
        $('#a'+id).css({
            top: y + 'px',
            left: x + 'px'
        });

        // Register slide event callback. Use 'slideStop' to prevent updating entire model on every drag.
        // That bogs down even in desktop grasshopper, so it seems like a tall order. But this can be changed...
        // See "events" on the github page at the top of this file.
        input.on('slide slideStop',function(){
            //window.LOG_TIME_EVENT("SLIDER PULSE");
            valueCallback(input.slider('getValue'));
        });

        // Keep references to things we made so they can be destroyed later
        this.sliderInput = input;
        this.overlay = overlay;
    };

    SliderView.prototype.createOverlay = function(){
        var id = "overlay_"+Math.floor(Math.random()*10000);
        var overlay = $("<input id='"+id+"' class='TOP workspaceOverlay'></input>");
        $('body').append(overlay);

        var that = this;
        overlay.on('click',function(){
            that.sliderInput.slider('destroy');
            that.sliderInput.remove();
            that.overlay.off();
            that.overlay.remove();
        });

        return overlay;
    };

    return SliderView;
});