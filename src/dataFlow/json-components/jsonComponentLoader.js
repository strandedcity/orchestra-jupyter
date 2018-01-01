define([
    "underscore",
    "dataFlow/core",

    "dataFlow/json-components/pd_dataframe"
],function(
    _,
    DataFlow,

    pd_dataframe
){
    // This module parses components defined in JSON format, creating a function for each, initializing it, and then returning
    // a list of component object prototypes that can be loaded into Orchestra

    const allComponentsJson = pd_dataframe
        // .concat(module2)
        // .concat(module3) // etc
    ;
    let components = {};

    _.each(allComponentsJson,function(c){
        try {
            components[c.functionName] = DataFlow.Component.extend({
                initialize: function(opts){
                    const args = _.extend({
                        componentPrettyName: c.componentPrettyName
                    }, opts || {},{
                        inputs: this.createIObjectsFromJSON(c.inputs, opts, "inputs"),
                        outputs: this.createIObjectsFromJSON(c.outputs, opts, "output"),
                        // OUTPUTS PLURAL?

                        pythonTemplate: c.pythonTemplate
                    });

                    this.base_init(args);
                }
            },
            {
                label: c.label,
                module: c.module,
                desc: c.desc
            });
        } catch (e) {
            console.error("One of the component definitions could not be parsed correctly!");
            console.error(cmptJson);
            console.error(e);
        }
    });

    return components;
});