define([
    "underscore"
],function(_){
    function DataTree(data){
        // The tree is just a node, but it's a little special:
        // 1) It's the only one that's exposed to outside this module, which means it's impossible to create a "stranded" node with no connection to the tree
        // 2) It's the only one with no parents
        // 3) It has tree-traversal and path-mapping "class methods" that allow the creation of new, re-arranged trees (individual nodes can't re-arrange)
        // 4) It has no siblings
        this.init(); // Node's init
        delete this.pathId; // Undefined base path ID allows, in principle, multiple base branches
        delete this.data; // no data can be stored at the root. Just branches. This is why all data is at least inside the branch {0}
        if (!_.isUndefined(data)) this.addChildAtPath(data,[0]);
        _.bindAll(this,"dataAtPath","setDataAtPath","recurseTree","flattenedTree","graftedTree","remappedTree");
    }

    DataTree.prototype = Object.create(Node.prototype);
    DataTree.prototype.constructor = DataTree;

    DataTree.prototype.recurseTree = function(funcOfDataAndNode){  // iterator = function(data[,node])
        // walks the tree, calling iterator for each node. Iterator is a function that takes DATA (an array) and an optional PATH string.
        // PATH strings will match the node's complete tree path, DATA will represent the data on that node.

        if (typeof funcOfDataAndNode !== "function") {throw new Error("recurseTree must be called with an iterator: function(data[,node])");}

        (function recurseChildren(node){
            // if data, call the iterator
            if (!_.isEmpty(node.data)) {
                funcOfDataAndNode(node.data, node);
            }
            // if children, recurse a level deeper
            var childKeys = _.keys(node.children);
            if (childKeys.length > 0) {
                _.each(childKeys,function(childName){
                    recurseChildren(node.children[childName]);
                });
            }
        })(this);
    };

    DataTree.prototype.fromJSON = function(json){
        var tree = this;
        _.each(json,function(data,pathString){
            var parsedPath = _.map(pathString.split(";"),function(pathAddress){
                return Number(pathAddress);
            });
            tree.setDataAtPath(data,parsedPath);
        })
    };

    DataTree.prototype.toJSON = function(){
        var jsonobj = {};
        this.recurseTree(function(data,node){
            var path = node.getPath(),
                pathString = path.join(";");
            jsonobj[pathString] = data;
        });
        return jsonobj;
    };

    DataTree.prototype.flattenedTree = function(nocopy){
        // Works like grasshopper. Recurse the whole tree, appending each piece of encountered data to the top-level node's data
        // RETURNS A NEW DATA TREE, leaving the original unmutated and uncopied, unless "nocopy" is specified

        var flatData = [];
        this.recurseTree(function(data){
            _.each(data,function(item){flatData.push(item)});
        });

        if (nocopy) {
            this.data = flatData;
        } else {
            return new DataTree(flatData);
        }

    };

    DataTree.prototype.dataAtPath = function(path, filtered){
        // works a little differently than Node.getChildAtPath. Since the tree is the top-level node, we
        // can retrieve nodes by more-intuitive absolute paths, rather than mucking around in relative node paths
        // which are necessary internally, but confusing externally

        try {
            var pathCopy = path.slice();

            var currentNode = this;
            while (pathCopy.length > 0){
                currentNode = currentNode.children[pathCopy.shift()];
            }
            return filtered === true ? currentNode.getFilteredData() : currentNode.data;
        } catch (e) {
            return [];
        }
    };

    DataTree.prototype.copy = function(){
        return this.map();
    };

    DataTree.prototype.map = function(dataTransformFunction){
        // same as "copy" function in that it returns a fresh new tree. Different, in that
        // it allows for the data in each branch to be transformed along the way.

        var copy = new DataTree();
        this.recurseTree(function(data,node){
            if (typeof dataTransformFunction === "function") {
                var dataAtBranch = _.map(data,function(d){return dataTransformFunction(d)});

                // Some components, such as CCX, produce multiple outputs for each set of inputs. Ie,
                // Two input curves (A&B) could produce hundreds of intersection points (output P)
                if (dataAtBranch.length > 0 && _.isArray(dataAtBranch[0])) {
                    _.each(dataAtBranch,function(dataItem,index){
                        var path = node.getPath();
                        path.push(index);
                        copy.addChildAtPath(dataItem,path,true);
                    });
                } else {
                    copy.addChildAtPath(dataAtBranch,node.getPath(),true);
                }
            } else {
                copy.addChildAtPath(data,node.getPath(),true);
            }
        });
        return copy;
    };

    DataTree.prototype.setDataAtPath = function(data, path){
        return this.addChildAtPath(data,path,true);
    };

    DataTree.prototype.log = function(){
        var empty = true;
        this.recurseTree(function(data,node){
            empty = false;
            console.log('Path: ',node.getPath(),'      Data: ',data);
        });
        if (empty) console.log("(Tree has no data)");
    };

    DataTree.prototype.getMaxPathLength = function(){
        // Useful for finding "master" inputs in grasshopper components
        // Recurses each branch until it finds one with no children, and reports the maximum path depth.

        var maxDepth = 1;
        (function recurseChildren(node){
            // if children, recurse a level deeper
            var childKeys = _.keys(node.children);
            if (childKeys.length > 0) {
                _.each(childKeys,function(childName){
                    recurseChildren(node.children[childName]);
                });
            } else {
                // no children; test if this is deeper than other paths found
                maxDepth = Math.max(maxDepth,node.getPath().length);
            }
        })(this);

        return maxDepth;
    };

    DataTree.prototype.isEmpty = function(){
        var isEmpty = true;
        this.recurseTree(function(data){
            if (!_.isEmpty(data)) isEmpty = false;
        });
        return isEmpty;
    };

    DataTree.prototype.graftedTree = function(){
        // Works like grasshopper. Creates a new sub-branch for each data item.
        // eg: 8 branches with 6 items each -->  8 branches with 6 sub-branches each, 1 item per branch
        // returns a NEW DATATREE unless 'nocopy' is specified
        var graftedTree = new DataTree();
        this.recurseTree(function(data,node){
            var destPath = node.getPath().slice();
            _.each(data,function(dataItem,index){
                var destPathCopy = destPath.slice();
                destPathCopy.push(index);
                graftedTree.addChildAtPath([dataItem],destPathCopy);
            });
        });
        return graftedTree;
    };

    DataTree.prototype.remappedTree = function(sourcemap,destmap){
        // A lexical path re-mapper, like grasshoppers. Let's you type a "start" and "end"
        // DataTree.remappedTree("{A;B}(i):{B;i}(A)") --> returns copy of data tree, remapped
        // returns a NEW DATATREE

        //TODO: Validate the path mappings are validly specified

        function getPathArray(string){
            return string.match(/(^.*\})/)[0].replace(/[^A-Za-z]/g," ").trim().split(" ");
        }
        function getIndexMapping(string){
            return string.match(/(\(.*$)/)[0].replace(/[^A-Za-z]/g," ").trim().split(" ")[0];
        }

        // the "index" value is implied if it's not included in the source/dest strings
        if (sourcemap.indexOf("(") === -1) sourcemap += "(i)";
        if (destmap.indexOf("(") === -1) destmap += "(i)";

        // Step 1, parse the path mappings
        var sourcemapPaths = getPathArray(sourcemap), // "{A;B}(i):{B;i}(A)" --> matches ["A","B"] from source string
            destmapPaths = getPathArray(destmap),// "{A;B}(i):{B;i}(A)" --> matches ["B","i"] from dest string
            sourcemapIndexVar = getIndexMapping(sourcemap), //"{A;B}(i):{B;i}(A)" --> matches ["i"] from source string
            desmapIndexVar = getIndexMapping(destmap), // "{A;B}(i):{B;i}(A)" --> matches ["A"] in dest string
            remapsItems = sourcemapIndexVar !== desmapIndexVar;

        // create a custom path-remapping function from the source and destination strings. Accepts uppercase letters and the lowercase letter "i",
        // just as grasshopper's path remappter does
        var pathArrayOffsets = _.map(sourcemapPaths,function(sourceLetter){
            var sourceIndex = _.indexOf(sourcemapPaths,sourceLetter),
                destIndex = _.indexOf(destmapPaths,sourceLetter);
            return destIndex - sourceIndex; // returns an offset for the path POSITION, not the pathId.
            // ie, the path id encountered at position 3 in the path should move to position 2, an offset of -1
        }).slice(); // remove leading zero -- the main tree branch cannot be remapped

        var remappedTree = new DataTree();

        if (!remapsItems) {
            // PATHS are re-arranged, but data items inside paths are not. Step through each branch, but copy data arrays wholesale
            this.recurseTree(function (data, node) {
                var p = node.getPath().slice();  // {A;B} as [A,B]
                var remappedPath = [];

                for (var i = 0; i < p.length; i++) {
                    remappedPath[i] = p[i + pathArrayOffsets[i]];
                }

                remappedTree.addChildAtPath(node.data, remappedPath);
            });
        } else {
            // DATA ITEMS are remapped individually. Step through each item to get the right destination path
            sourcemapPaths.push(sourcemapIndexVar);
            destmapPaths.push(desmapIndexVar);

            this.recurseTree(function (data, node) {
                var nodePath = node.getPath();
                _.each(node.data,function(dataItem, dataIndex){
                    var pathForDataItem = nodePath.slice();
                    pathForDataItem.push(dataIndex);
                    var pathDictionary = {};
                    _.each(sourcemapPaths,function(key,index){
                        pathDictionary[key] = pathForDataItem[index];
                    });

                    var destPath = [];
                    _.each(destmapPaths,function(key,index){
                        destPath[index] = pathDictionary[key];
                    });

                    var destinationDataIndex = destPath.pop();
                    remappedTree.addSingleDataItemAtPathAndIndex(dataItem,destPath,destinationDataIndex);
                });
            });
        }



        return remappedTree;
    };



    function Node(data,parent){
        this.init(data,parent);
    }

    Node.prototype.init = function(data,parent){
        var defined = !_.isUndefined(data), array = _.isArray(data);
        if (defined && !array) {
            throw new Error("Tried to assign a non-array to a Node in a Data Tree");
        }

        if (!defined) {data = [];}
        this.data = data;
        //this.children = []; // no! PATHS ARE STORED IN DICTIONARIES, and parents define children's keys
        this.children = {};

        this.parent = parent;
        //this.pathId = parent.getPathForChildNode(this); // node won't be added yet. The parent must assign this property
    };

    Node.prototype.isRoot = function () {
        return _.isUndefined(this.parent);
    };

    Node.prototype.addChildAtPath = function(data, pathArray, replaceData){
        // Function assumes you set one list of data to a particular path, relative to this node.
        // All branches along the path, prior to the end, will be data-free
        if (!_.isArray(pathArray)) {throw new Error("must pass pathArray to addChildAtPath");}

        // don't mutate the arguments:
        var pathArrayCopy = pathArray.slice(); // don't mutate inputs

        //pathArrayCopy.reverse();
        _.each(pathArrayCopy,function(element){
            if (parseInt(element) !== element) {throw new Error("Encountered non-integer array path: " + element);}
        });

        // recursively add nodes to arrive at point where data belongs
        var addedNode = (function addNode(node,pathArrayCopy){
            var path = pathArrayCopy.shift();
            var newNode = node.children[path] || new Node([],node); // don't overwrite nodes and their data if they already exist
            node.children[path] = newNode;
            newNode.pathId = path;
            if (pathArrayCopy.length > 0) {
                return addNode(newNode,pathArrayCopy);
            }

            // end of the path to add at. This is the node!
            newNode.data = replaceData === true ? data : newNode.data.concat(data);
            return newNode;
        })(this,pathArrayCopy);

        return addedNode; // return a reference to the
    };
    Node.prototype.addSingleDataItemAtPathAndIndex = function(dataItem, path, index){
        var n = this.addChildAtPath([],path);
        n.data[parseInt(index)] = dataItem;
        return n;
    };

    Node.prototype.getChildAtPath = function(path){
        // recurse through sub-nodes
        var pathCopy = path.slice(0); // don't mutate inputs
        pathCopy.reverse();
        return (function getChildNode(nextNode){
            var nextPathIndex = pathCopy.pop();
            if (!_.isUndefined(nextPathIndex)) {
                return getChildNode(nextNode.children[nextPathIndex]);
            } else {
                return nextNode;
            }
        })(this);
    };

    Node.prototype.getPathForChildNode = function(childNode){
        var that = this;
        _.each(_.keys(this.children),function(childPath){
            if (that.children[childPath] === childNode) {
                return childPath;
            }
        })
    };
    Node.prototype.getPath = function(){
        var path = [];
        (function addToPath(node) {
            if (!_.isUndefined(node.pathId)) path.push(node.pathId);
            if (!node.isRoot()) {
                addToPath(node.parent);
            }
        })(this);
        return path.reverse();
    };
    Node.prototype.getFilteredData = function(){
        return _.filter(this.data,function(item){
            return !_.isNaN(item) && !_.isNull(item) && !_.isUndefined(item);
        });
    };


    return DataTree;

});
