define(['dataFlow/dataFlow_loader',"underscore","jquery","bootstrap","bootstrap3-typeahead"],function(DataFlow,_,$){
    // https://github.com/bassjobsen/Bootstrap-3-Typeahead
    //
    // This file essentially customizes typeahead behavior for component selection, and bottles it up for use in
    // any context. To use, just call ComponentSearcher on a jQuery input, then listen for its only event on the
    // very same object that got passed in:

    //$input.on("selectedComponent",function(e,component){
    //    console.log(component);
    //});

    function ComponentSearcher(input){
        this.$input = input;
        this.init();
    }

    // Build component registry from components that are loaded into memory. Replaces a 'componentRegistry' approach
    // that requires me to maintain two changes for each new component, and there are starting to be lots.
    var registryData = [];

    // ComponentSearcher needs an array of: 
    // {
    //     "functionName": "PointComponent",
    //     "name": "Point(x,y,z)",
    //     "shortDescription": "Creates a Point Object from X, Y, and Z coordinate values"
    // }
    DataFlow.iterateComponents(function(name,func){
        registryData.push({
            functionName: name,
            name: func.label,
            shortDescription: func.desc
        });

        if (!func.label || !func.desc) {
            if (console) console.warn(name + " lacks a name or description field. It will not be searchable.");
        }
    });

    ComponentSearcher.prototype.init = function(){
        var $input = this.$input, that=this;
        // $.get('componentRegistry.json?'+Math.random(),function(registryData){

            var matcher = function(item,query){
                var re = new RegExp(this.query || query, 'i'),
                    searchable = item.name + " " + item.shortDescription; // + item.functionName ?? Generates more results, but could be confusing
                return searchable.search(re) > -1;
            };
            $input.on('submit',function(e){e.preventDefault();});
            $input.keyup(function(e){
                // hitting escape should clear out the input entirely, not just remove the dropdown
                if(e.keyCode === 27) {
                    $input.val("");
                    $input.data('active',null);
                }

            });
            $input.typeahead({
                source: registryData,
                highlighter: function (item) {
                    var html = item.name + " / " + item.shortDescription;

                    // This approach is one line to the plugin's 20 lines and iterating over each character (why???)
                    var re = new RegExp(this.query, 'gi');
                    return html.replace(re,function (match) {
                        return "<strong>" + match + "</strong>";
                    });
                },
                displayText: function(item){
                    // This is basically a bug in the plugin. This function is supposed to return the display text, but then
                    // I can't format sections differently later (ie, name and description would have to appear in a single
                    // HTML string passed from this function, and later matched against.
                    //var html = "<span class='typeahead_name'>"+item.name+"</span> <span class='des'>"+item.shortDescription+"</span>";
                    return item;
                },
                matcher: matcher,
                sorter: function(items){
                    var nameMatch = [],
                        descriptionMatch = [],
                        other = [],
                        re = new RegExp(this.query, 'i'),
                        item; // for the loop

                    while ((item = items.pop())) {
                        if (item.name.search(re) === 0) nameMatch.splice(0,0,item);
                        else if (item.name.search(re) > -1) nameMatch.push(item);
                        else if (item.shortDescription.search(re) > -1) descriptionMatch.push(item);
                        else other.push(item);
                    }

                    return nameMatch.concat(descriptionMatch,other);
                },
                afterSelect: function(){
                    var current = $input.typeahead("getActive");
                    if (current && matcher(current,$input.val()) === true) {
                        // must check that the current value is a match. If not, nothing was actually selected by the user!
                        // To test, type something that starts as a match but then empties the list, such as
                        // "Vector lkjasldj" and hit enter. Without this condition, the first item that WAS selected is passed.

                        // TADA! We have selected a new component.
                        $(that).trigger("selectedComponent",[current]);
                    } else {
                        // Bad match, do nothing
                    }

                    // either way, clear out for next round
                    $input.val("");
                }
            });
        // });
    };

    ComponentSearcher.prototype.destroy = function(){
        this.$input.typeahead('destroy');
        this.$input.remove();
    };

    return ComponentSearcher;
});