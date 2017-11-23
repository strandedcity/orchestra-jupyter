define([
        "underscore",
        "dataFlow/dataTree",
        "dataFlow/enums"
    ],function(_,DataTree,ENUMS){
        // See http://www.grasshopper3d.com/page/new-data-matching-in-0-9 for reference

        /*  The master parameter might not be the parameter with the most branches.
            It is therefore possible that we run out of defined paths before the component is done computing.
            If this happens, the last index of the last available path in the master parameter is incremented on each iteration:
            Input A = {0;0} {0;1} {0;2}
            Input B = {0;1;0}
            Output C = {0;1;0} {0;1;1} {0;1;2}
            A has a maximum path length of 2, B has a maximum path length of 3, B is therefore the master parameter.
            However we need three unique output paths since A provides three paths, so {0;1;1} and {0;1;2} are made up on the spot.
        */

        /* The DataMatcher doesn't really need any properties; it just returns a fully calculated output tree */
        var DataMatcher = function DataMatcher(inputs,calculationFunction,outputsArray){
            if (!_.isFunction(calculationFunction)) {throw new Error("DataMatcher requires a calculation function");}
            if (!_.isArray(inputs)) {throw new Error("DataMatcher expects an array of inputs");}
            if (!_.isArray(outputsArray)) {throw new Error("'outputs' parameter for dataMatcher must be an array of outputs corresponding to each result generated by .recalculate()")}

            // Outputs are required, and should be something like this:
            //{
            //    A: DataTree
            //    B: DataTree
            //}
            //... where A and B are named parameters in an object that will need to be returned by the corresponding calculation function.
            // Create "outputs" map from the supplied array here:
            var outputs = {};
            _.each(outputsArray, function(out){
                outputs[out.shortName] = out;
            });

            // DataMatcher is really just meant to be used as a function, but in some cases it may
            // be useful to create an object and read some additional properties.
            var errors = [],
                masterInput = identifyMasterInput(inputs),
                tree = createCorrespondingOutputTree(inputs,masterInput,calculationFunction,outputs,errors);

            return {
                errors: errors,
                tree: tree,
                masterInput: masterInput
            };
        };

        // This function accepts an arbitrary list of DataTree objects, and finds the "master" tree amongst them
        function identifyMasterInput(inputs){
            // first off: an input can be named master
            var specifiedMaster;
            _.each(inputs,function(i){
                if (i.isMaster === true)  {
                    specifiedMaster = i;
                }
            });
            if (specifiedMaster) return specifiedMaster;

            // Longer path lengths win
            // "list" parameters have lower priority than "item" parameters
            // "tree" parameters are never master unless all params are trees
            var pathLengths = _.map(inputs,function(IOObject){
                if (!_.isNull(IOObject.getTree())) {
                    return IOObject.getTree().getMaxPathLength();
                }
                return 1;
            });
            var longestPath = _.max(pathLengths);
            var contenders = [];

            _.each(pathLengths,function(el,index){
                // TODO: If one input has tree access, it shouldn't be a contender unless all inputs have tree access
                if (el === longestPath) {
                    contenders.push(inputs[index]);
                }
            });

            // Only one list with the longest path? That's the master
            if (contenders.length === 1) return contenders[0];

            var itemTypeContenders = _.filter(contenders,function(input){
                return input.interpretAs === ENUMS.INTERPRET_AS.ITEM;
            });

            if (itemTypeContenders.length === 1) {
                // Huzzah! Only one "item" typed list with the maximum path length, it wins
                return itemTypeContenders[0];
            } else if (itemTypeContenders.length === 0) {
                // The longest list is NOT a list of item type. Check list-type contenders, then.
                var listTypeContenders = _.filter(contenders,function(input){
                    return input.interpretAs === ENUMS.INTERPRET_AS.LIST;
                });

                // gotcha! Just one list-type input
                if (listTypeContenders.length === 0) return contenders[0]; // TODO: Poorly defined behavior. No ITEM or LIST inputs found!
                if (listTypeContenders.length === 1) return listTypeContenders[0]; // Well defined: no ITEM type inputs, and just one LIST type
                return listTypeContenders[0]; // TODO: Poorly defined: multiple LIST type inputs with same path level?
            } else { // itemTypeContenders.length > 1
                // TODO: Poorly defined: multiple ITEM type inputs with same path level?
                return itemTypeContenders[0];
            }
        }

        function createCorrespondingOutputTree(inputs,masterInput,calculation,outputs,errors){
            var outputTree = new DataTree(),
                outputKeys = _.isObject(outputs) ? _.keys(outputs) : undefined,
                masterInputInterpretsAsList = false;

            // Grasshopper matches lists the same way it matches list *items*, so yes, it's possible that a master
            // input path may match an output path exactly, but the contained data may not align.
            // Basically we print out the "used" paths in recursive order for each element, then go down the line
            // doing calculations for lists and then repeating the last list when one runs out.

            var flattenedNodeList = [];     // will contain lists OF OBJECTS corresponding to each node with data.
                                            // each object will know the path of the node it should go to

            function appendUsedDataPaths(input){
                var dataListForTree = [],
                    inputTree = input.getTree().copy();

                if (input.interpretAs === ENUMS.INTERPRET_AS.LIST) {
                    if (input.isMaster) {
                        masterInputInterpretsAsList = true;
                    }
                    input.getTree().recurseTree(function(data,node){
                        inputTree.setDataAtPath([data],node.getPath());
                    });
                }

                inputTree.recurseTree(function(data,node){
                    dataListForTree.push(node);
                });
                return dataListForTree;
            }

            // gotta know where the master input is, and which params to treat as lists:
            var indexOfMaster = _.indexOf(inputs,masterInput);
            _.each(inputs,function(ipt){
                flattenedNodeList.push(appendUsedDataPaths(ipt));
            });

            // Flattened node list is now an "aligned" array of arrays of nodes. Each node stores an array of data.
            // [                   All data                        ]
            // [ [       input A        ]  [       input B       ] ]
            // [ [ [ node1 ] [ node 2 ] ]  [  [ node1 ] [ node 2 ] ]
            flattenedNodeList = alignArrays(flattenedNodeList);

            // Count number of nodes (same for each input now). For each "row" of lists:
            // -Calculate the correct destination path based on the master list's path
            // -Extract data arrays for each input, build an array of these arrays
            // -Align these data arrays (repeat items until they are comparable lengths
            // -Calculate the result list
            var prevPath = [], prevPathUsed = false;
            for (var rowIndex=0; rowIndex < flattenedNodeList[0].length; rowIndex++){
                var rowData = [],
                    result,
                    destPath;

                // Where in the result tree should this result list be placed?
                if (prevPathUsed === true || _.isEqual(flattenedNodeList[indexOfMaster][rowIndex].getPath(), prevPath) ){
                    // Increment the previous path. Inlined the condition to avoid testing path equality each time.
                    prevPath = destPath = incrementPath(prevPath);
                    prevPathUsed = true;
                } else {
                    prevPath = destPath = flattenedNodeList[indexOfMaster][rowIndex].getPath();
                }

                // build item-aligned input lists:
                for (var inputIndex=0; inputIndex < flattenedNodeList.length; inputIndex++){
                    rowData.push(flattenedNodeList[inputIndex][rowIndex]["data"]);
                }
                rowData = alignArrays(rowData);

                // calculate results item by item, and store
                try {
                    result = calculateItemsForAlignedLists(rowData,calculation);
                } catch (e) {
                    result = null;
                    errors.push(e.stack);
                    // console.log('Runtime error during calculation process. Inputs:\n',rowData,'\nCalculation Error:\n', e.stack);
                }

                outputTree.setDataAtPath(result,destPath);

                // THIS HAS BEEN REPLACED BY THE OUTPUTS LOOP BELOW, WHICH USES 'REPLACEDATA' INSTEAD
                // // If outputs are supplied they can be filled in now:
                // if (_.isObject(outputs)) {
                //     _.each(result,function(resultItem){
                //         _.each(outputKeys,function(key){
                //             console.log('output '+key+": ",outputs[key]);
                //             var d = outputs[key].getTree().dataAtPath(destPath);
                //             d.push(resultItem[key]);
                //             outputs[key]["values"].setDataAtPath(d,destPath);
                //         });
                //     });
                // }
            }

            // see comment above. We just need to dig the lists out of their arrays again.
            // HOWEVER -- we only want to do this for OUTPUTS that are also "AS_LIST"... in rare cases we could
            // have "as list" input without "as list" output, in which case we don't want to do this    
            // eg: cull-pattern
            // THIS CAUSES A BUG WHEN NOT ALL OUTPUTS ARE THE SAME, FOR EXAMPLE 'MASS ADDITION' WHICH HAS
            // ONE LIST OUTPUT AND ONE 'RESULT' -- BOTH OF WHICH APPEAR AT BRANCH {0} IN GRASSHOPPER!
            if(masterInputInterpretsAsList && outputs[outputKeys[0]].interpretAs !== ENUMS.INTERPRET_AS.LIST) {
                outputTree.copy().recurseTree(function(data,node){
                    outputTree.setDataAtPath(data[0],node.getPath());
                });
            }

            // If an OUTPUT interprets as a list, that means that the .recalculate() function for that output
            // should return an array. But we don't want .dataAtPath([0]) to return [[a,b,c,d]]. Instead,
            // the array should end up one path deeper, so .dataAtPath([0,0]) would return [a,b,c,d].
            _.each(outputs,function(output,shortName){
                // if (output.interpretAs === ENUMS.INTERPRET_AS.LIST) {
                    output.replaceData(outputTree.map(function(data){return data[shortName];}));
                // }
            });

            return outputTree;
        }

        function calculateItemsForAlignedLists(alignedLists,calculation){
            // Here's where we actually DO the calculation for EVERY item in ALL of the lists we're passed.
            // These lists have been aligned with each other by all the methods above, so all we need to do
            // is run the calculation
            var results = [];
            for (var i=0; i < alignedLists[0].length; i++){
                // pull the i-th item from each list as an argument for the calculation
                var args = _.map(alignedLists,function(list){
                    return list[i];
                });
                results[i] = calculation.apply(this,args);

                // Arguments to recalculate() can be values or promises. Resolve the promises, then calculate.
                // Promise.all(args).then(function (values) {
                //     results[i] = calculation.apply(this,values);
                // })
                //
                // results[i] = new Promise(function (resolve,reject) {
                //     Promise.all(args).then(function (values) {
                //         console.log("DATAMATCHER VALUES: ",values);
                //         var calc = calculation.apply(this,values);
                //         console.log("CALCULATION RETURN VALUE: ",calc)
                //
                //         resolve(calc);
                //     })
                // })


            }
            // console.log("RESULTS: ",results)
            return results;
        }

        function alignArrays(arrays){
            // Input:   An array of random-length arrays
            // Output:  An array of arrays, each with the length of the longest input array.
            //          The last item of an array is repeated until it is the desired length.
            var outputArrays = [],
                maxArrayLength = _.max(_.map(arrays,function(list){return list.length}));

            _.each(arrays,function(list){
                var outList = [],
                    i=0;
                while (i < maxArrayLength) {
                    if (i < list.length) outList[i] = list[i];  // copy over beginning items
                    else outList[i] = outList[i-1];             // reuse items once the shorter lists run out
                    i++;
                }
                outputArrays.push(outList);
            });
            return outputArrays;
        }

        function incrementPath(path){
            var pathCopy = path.slice(0);
            pathCopy[pathCopy.length-1] = pathCopy[pathCopy.length-1] + 1;
            return pathCopy;
        }

        return DataMatcher;
    }
);