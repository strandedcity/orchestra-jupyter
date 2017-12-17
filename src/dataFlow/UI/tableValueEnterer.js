define([
    "jquery",
    "underscore",
    "dataFlow/dataTree",
    "HandsontableWrapper", // DO NOT LOAD WITHOUT STYLES! SEE WRAPPER.
    "dataFlow/enums"
],function($,_,DataTree,Handsontable,ENUMS){

    function TableView(data,x,y,callback,dataType,readOnly){
        this.init.apply(this,arguments);
    }

    // Configuration:
    // {
    //     data: dataTree,
    //     dataType: ENUMS...
    //     position: {x: 100, y: 100},
    //     callback: fn(outputDataTree), (optional)
    //     readOnly: true, // determines, for now, if the rows are "0,1,2" (in write mode) or {0;0} (1) (in read mode)
    // }

    var mapIODataTypeToTableCellTypes = {};
    mapIODataTypeToTableCellTypes[ENUMS.OUTPUT_TYPES.NUMBER] = {type: "numeric"};
    mapIODataTypeToTableCellTypes[ENUMS.OUTPUT_TYPES.STRING] = {type: "text"};
    mapIODataTypeToTableCellTypes[ENUMS.OUTPUT_TYPES.BOOLEAN] = {type: "checkbox"};

    TableView.prototype.init = function(data,x,y,callback,dataType,readOnly){
        this.callback = callback;
        this.data = data;
        this.dataType = dataType;
        this.readOnly = !!readOnly; // false if undefined

        _.bindAll(this,
            "dataAsArrayOfArrays",
            "initializeTable",
            "cleanDataArray"
        );

        this.overlay = this.createOverlay();

        this.$tableContainer = this.insertTable(x,y);

        var arrays = this.dataAsArrayOfArrays(data)
        this.dataArray = arrays[0];
        this.dataHeaderArray = arrays[1];

        this.initializeTable();
    };

    TableView.prototype.initializeTable = function(){

        var that=this;

        this.table = new Handsontable(this.$tableContainer.find('#editableTable').get(0), {
            data: that.dataArray,
            contextMenu: true,
            colWidths: 100,
            minSpareRows: 50,
            rowHeaders: that.readOnly ? function(idx) {
                return that.dataHeaderArray[idx] || "";
            } : true, // when this allows input, showing path-matching is over-complicated.
            columns: [
                mapIODataTypeToTableCellTypes[that.dataType]
            ],
            // afterChange: function () {
            //     if (typeof that.callback === "function") {
            //         that.callback(that.dataArray);
            //     }
            // }
        });
    };

    TableView.prototype.dataAsArrayOfArrays = function(tree){
        var outputData = []; // each element is a row
        var outputLabels = []; // each element is a row LABEL
        tree.recurseTree(function(data,node){
            // print column headers -- these are not editable:
            var path = node.getPath();
            var labelBase = "{"+path.join(";")+"}";

            _.each(data,function(item,idx){
                outputData.push([item.toString()]);
                outputLabels.push(labelBase + " (" + (idx) + ")");
            });
        });

        return [outputData,outputLabels];
    };

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

    TableView.prototype.cleanDataArray = function () {
        // Return a copy of 'dataArray' that's being edited where empty strings have been removed
        if (this.dataType === ENUMS.OUTPUT_TYPES.NUMBER) {
            return _.map(_.filter(this.dataArray, function(itm){
                return !_.isEmpty(itm) && !_.isUndefined(itm[0]) && !_.isNull(itm[0]) && !_.isNaN(Number(itm[0]));
            }),function(numberdata){
                // return from the filter will be an object that still has the column index
                // eg: {"0": <number>}
                return Number(numberdata[0]);
            });
        } else if (this.dataType === ENUMS.OUTPUT_TYPES.STRING) {
            return _.map(_.filter(this.dataArray, function(itm){
                return !_.isEmpty(itm) && !_.isEmpty(itm[0]);
            }),function(stringdata){
                return stringdata[0];
            });
        } else if (this.dataType === ENUMS.OUTPUT_TYPES.BOOLEAN) {
            // TODO ... handle booleans
            console.warn("NOT IMPLEMENTED: PARSING FOR BOOLEANS");
            return true;
        }

    };

    TableView.prototype.destroy = function(){
        // So we capture the value the user entered before they hit enter
        // If we don't do this and then wait a beat, users have to hit enter
        // or down for their info to be collected. Confusing!
        this.table.deselectCell();

        var that=this;
        function removeAll(){
            that.table.destroy();
            that.$tableContainer.remove();

            if (typeof that.callback === "function" && !that.readOnly) {
                // TODO: Handle multiple paths for input? Not sure if that's really worth it or not....
                that.data.setDataAtPath(that.cleanDataArray(),[0]);
                that.callback(that.data);
            }
        }

        _.delay(removeAll,10); // So deselectCell() can finish it's business
    };

    TableView.prototype.insertTable = function(x,y){
        // add tableview at spec'd position
        var $tableContainer = $("<div class='tableView'><div id='editableTable' style='position:relative; overflow: hidden; height: 200px;'></div></div>");
        $tableContainer.css({
            top: y,
            left: x,
            height: 200,
            width: 150,
            'z-index': 102,
            position: 'absolute',
            display: 'block'
        });
        $('body').append($tableContainer);

        return $tableContainer;
    };

    return TableView;
});
