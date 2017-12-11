define([
    "jquery",
    "underscore",
    "dataFlow/dataTree",
    "HandsontableWrapper", // DO NOT LOAD WITHOUT STYLES! SEE WRAPPER.
    "dataFlow/enums"
],function($,_,DataTree,Handsontable,ENUMS){

    function TableView(data,x,y,callback,dataType){
        this.init.apply(this,arguments);
    }

    TableView.prototype.init = function(data,x,y,callback,dataType){
        this.callback = callback;
        this.data = data;
        this.dataType = dataType;

        _.bindAll(this,
            "parseInput",
            "dataAsArrayOfArrays",
            "initializeTable"
        );

        this.overlay = this.createOverlay();

        this.$tableContainer = this.insertTable(x,y).find('#editableTable');

        var tabularData = this.dataAsArrayOfArrays(data);

        var fakedata = [];
        for (var i=0; i<100; i++) {
            fakedata.push([i])
        }

        this.initializeTable(fakedata);
    };

    TableView.prototype.initializeTable = function(tabularData){

        this.table = new Handsontable(this.$tableContainer.get(0), {
            data: tabularData,
            // rowHeaders: false,
            // colHeaders: false,
            // contextMenu: true,
            // height: 200,
            // width: 200,
            colWidths: 100,
            minSpareRows: 100,
            // renderAllRows: true, // really shouldn't be needed, yet virtual scrolling is a total fail for me
            // colHeaders: true,
            rowHeaders: true, // demonstrates the issue I'm seeing ... row headers don't scroll
        });

        var that=this;
        // this.table.updateSettings({
        //     cells: function (row, col, prop) {
        //         // console.log(row,col,prop);
        //         var cellProperties = {};
        //
        //         if (that.table.getSourceData()[row][prop] === 'Nissan') {
        //             cellProperties.readOnly = true;
        //         }
        //
        //         return cellProperties;
        //     }
        // })
    }

    TableView.prototype.parseInput = function(newData, item){
        // This whole module is a mess. Obviously, this data-parser should be configurable to parse user input
        // into the right data type for the component. And it sort of is but.... basically the code just assumes
        // it's a number and if that fails, tries parsing as a boolean.
        // There's an exception for strings.

        if (this.stringType) {return newData;}

        var parsedData = item; // can't parse it? do jack.

        var parsingTest = Number(newData);
        // try parsing as a number
        if (!_.isNaN(parsingTest)) {
            parsedData = parsingTest;
        } else {
            if (newData.toString().toLowerCase().slice(0,1) === "t") parsedData = true;
            if (newData.toString().toLowerCase().slice(0,1) === "f") parsedData = false;
        }

        return parsedData;
    };

    TableView.prototype.headerHtmlFromPath = function(path){
        return "<tr><td class='headerRow'>{"+path.join(";")+"}</td></tr>";
    };

    TableView.prototype.dataAsArrayOfArrays = function(tree){
        var outputData = [];
        tree.recurseTree(function(data,node){
            // print column headers -- these are not editable:
            var path = node.getPath();
            outputData.push(["{"+path.join(";")+"}"]);

            _.each(data,function(item,index){
                var number = _.isNumber(item),
                    bool = _.isBoolean(item),
                    editable = number || bool,
                    cssClass = editable ? "" : "non",
                    dataString = item.toString();
                outputData.push([dataString]);
            });
        });

        return outputData;
    };

//     TableView.prototype.populate = function(tree,$table){
//         var that = this,
//             lastDataPath = [0],
//             lastDataArray = [];
//         tree.recurseTree(function(data,node){
//             // print column headers -- these are not editable:
//             var path = node.getPath(),
//                 headerHtml = that.headerHtmlFromPath(path);
//             $table.append($(headerHtml));
//
//             _.each(data,function(item,index){
//                 var number = _.isNumber(item),
//                     bool = _.isBoolean(item),
//                     editable = number || bool,
//                     cssClass = editable ? "" : "non",
//                     dataString = item.toString();
//                 var html = "<tr><td contentEditable='"+editable+"' class='"+cssClass+"editData'>"+dataString+"</td></tr>";
//                 var $tr = $(html);
//                 $table.append($tr);
//                 $tr.find('td').data({
//                     'd': dataString,
//                     'f': function(newData){
// // console.log('new data: ',newData)
//                         var parsedData = that.parseInput(newData,item);
// // console.log('parsed data: ',parsedData)
//                         // replace this item of the array with spec'd data
//                         data[index] = parsedData;
//
//                         $tr.find('td').text(parsedData); // make any standardization kinds of fixes that may be needed
//                     }
//                 });
//             });
//
//             lastDataPath = node.getPath();
//             lastDataArray = data;
//         });
//
//
//         if (tree.isEmpty()) {
//             $table.append($(this.headerHtmlFromPath(lastDataPath)));
//             tree.setDataAtPath(lastDataArray,lastDataPath);
//         }
// /////////////
// // TODO: FIX THIS CODE ITS A MESS!
// //////////////
//         console.warn("FIX THIS CODE IT IS MESSY ");
//         // Make it possible to add a single item at the end:
//         var extraRowHTML = "<tr><td contentEditable='true' class='addData'>(add value)</td></tr>",
//             blankRowHTML = "<tr><td contentEditable='true' class='addData'></td></tr>",
//             $bottomRow = $(blankRowHTML);
//         $table.append($(extraRowHTML));
//         $table.append($bottomRow);
//
//         // Handle events for data ADDITION
//         $table.on('focus','.addData',function(){
//             $(this).text("(add value)");
//             selectElementContents(this);
//         }).on('blur','.addData',function(){
// // console.log('this text: ',$(this).text())
//             var parsed = that.parseInput($(this).text(),undefined);
//
//             if (_.isUndefined(parsed)) $(this).text("(add value)");
//             else {
//                 // add to data tree....
//                 //console.log('adding to data tree:',parsed);
//                 var index = lastDataArray.length;
//                 lastDataArray[index] = parsed;
//                 $(this).text(parsed.toString()); // show the user any corrections that have been made
//
//                 // remove "addData" class, change to "editData" since there's now a corresponding entry in the data tree
//                 $(this).removeClass('addData').addClass('editData').data({
//                     'd': parsed,
//                     'f': function(newData){
//                         var newParsedVal = that.parseInput(newData, parsed);
//                         lastDataArray[index] = newParsedVal;
//                     }
//                 });
//
//                 // create a new row for further addition:
//                 var newRow = $(blankRowHTML);
//                 $table.append(newRow);
//             }
//         });
//
//         // Handle events for data EDITING
//         $table.on('focus','.editData', function() {
//             selectElementContents(this);
//         }).on('blur','.editData',function(){
//             if ($(this).data('d') !== $(this).text()){
//                 var setCorrespondingDataFunction = $(this).data('f');
//                 setCorrespondingDataFunction($(this).text());
//             }
//         });
//
//         function selectElementContents(el) {
//             var range = document.createRange();
//             range.selectNodeContents(el);
//             var sel = window.getSelection();
//             sel.removeAllRanges();
//             sel.addRange(range);
//         }
//     };

    // You might think this is combinable with other overlays, but actually almost all of the overlay code is unique since it
    // relates to the destruction of other stuff in the specific class....
    TableView.prototype.createOverlay = function(){
        var id = "overlay_"+Math.floor(Math.random()*10000);
        var overlay = $("<div id='"+id+"' class='TOP workspaceOverlay'></div>");
        $('body').append(overlay);

        var that = this;
        overlay.on('click',function(){
            that.overlay.off();
            that.overlay.remove();
            that.destroy();
        });

        return overlay;
    };

    TableView.prototype.destroy = function(){
        $('.editData').off();
        this.$tableContainer.remove();
        if (typeof this.callback === "function") this.callback(this.data);
    };

    TableView.prototype.insertTable = function(x,y){
        // add tableview at spec'd position
        var $tableContainer = $("<div class='tableView'><div id='editableTable' style='position:relative; overflow:hidden; width: 200px; height: 200px;'></div></div>");
        $tableContainer.css({
            top: y,
            left: x,
            overflow:'hidden',
            width: 200,
            height: 200,
            'z-index': 102,
            position: 'absolute',
            display: 'block'
        });
        $('body').append($tableContainer);

        return $tableContainer;
    };

    return TableView;
});
