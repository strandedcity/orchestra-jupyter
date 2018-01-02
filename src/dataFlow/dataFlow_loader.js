define([
        "underscore",
        "dataFlow/core",
        "dataFlow/components/outputComponents",
        "dataFlow/components/number",
        "dataFlow/components/treeComponents",
        "dataFlow/components/string",

        "dataFlow/json-components/jsonComponentLoader"

    ],function(_,
               core,
               outputComponents,
               number,
               tree,
               string,

               jsonComponents
    ){
        var dataFlow = {};
        dataFlow = _.extend(dataFlow,core);

        dataFlow["components"] = {};

        // registerModule will add a 'module' property to each component, then make those components available in the named module
        // This is done using _.extend(), so multiple files can become part of the same module without overwriting anything.
        function registerModule(components,moduleName){
            _.each(components,function(val,k){
                // add 'module' property to each component, so they can be sorted nicely in the UI
                val["module"] = moduleName;
            });

            dataFlow["components"][moduleName] = dataFlow["components"][moduleName] || {};
            _.extend(dataFlow["components"][moduleName],components);
            // if (extendsModule){
            //     _.extend(dataFlow["components"][moduleName],components);
            // } else {
            //     dataFlow["components"][moduleName] = components; 
            // }
        }

        // Older components and more complex components are defined in code, and need to be registered:
        registerModule(tree, "tree");
        registerModule(number, "number");
        registerModule(outputComponents, "outputComponents");
        registerModule(string, "string");

        // New-style components can be defined simply in json for straightforward cases where a component is a python function
        // json components already have 'module' specified per-component, so we don't need to 'register' them in the same way
        _.each(jsonComponents,function (c,cName) {
            const moduleName = c.module;
            dataFlow["components"][moduleName] = dataFlow["components"][moduleName] || {};
            dataFlow["components"][moduleName][cName] = c;
        });

        // TODO: Use this ONCE to create an index, then use the index ?
        dataFlow.iterateComponents = function(callbackNameFunction){
            return (function dig(obj){
                var objKeys = _.keys(obj);
                for (var i=0;i < objKeys.length; i++){
                    var k = objKeys[i];
                    if (typeof obj[k] === "function") {
                        callbackNameFunction(k,obj[k]);
                        //console.log(k + " / "+  obj[k]["label"] + " / " + obj[k]["desc"]+ " (" + obj[k]["module"]+" module)");
                    } else {
                        dig(obj[k]);
                    }
                }
            })(dataFlow["components"]);

            // The less-clever (maybe clearer?) async loop strategy
            //_.each(_.keys(dataFlow["components"]),function(group){
            //    _.each(_.keys(dataFlow["components"][group]),function(componentKeyName){
            //        callbackNameFunction(componentKeyName,dataFlow["components"][group][componentKeyName]);
            //    })
            //});
        };

        dataFlow.findComponentConstructorByName = function(name){
            var f = null;
            dataFlow.iterateComponents(function(testName,ComponentConstructor){
                if (name === testName) f = ComponentConstructor;
            });
            return f;
        };

        dataFlow.createComponentByName = function(name,args){
            var constructorFunction = dataFlow.findComponentConstructorByName(name);
            if (_.isNull(constructorFunction)) {
                console.warn("Couldn't find component by name: " + name);
                return null;
            }
            return new constructorFunction(args);
        };

        // Add a "componentName" property to EVERY component. Putting this function here prevents me from
        // repeating code in every component class to give it a name. This could be done inelegantly
        // with named constructor functions, but that screws up the structure of DataFlow's inheritance
        (function(){
            dataFlow.iterateComponents(function(name,func){
                // 'componentName' is used while reading in and writing out JSON representations of the project
                func.prototype.componentName = name;
            });
        })();

        return dataFlow;
    }
);