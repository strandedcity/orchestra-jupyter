define([
    "jquery",
    "underscore",
    "dataFlow/dataTree",
    "HandsontableWrapper", // DO NOT LOAD WITHOUT STYLES! SEE WRAPPER.
    "dataFlow/enums",
    "dataFlow/UI/tableValueEnterer"
],function($,_,DataTree,Handsontable,ENUMS,TableView){

    function SpreadsheetView(data){
        this.initSpreadsheet.apply(this,arguments);
    }

    SpreadsheetView.prototype.createOverlay = TableView.prototype.createOverlay;
    SpreadsheetView.prototype.destroy = TableView.prototype.destroy;

    SpreadsheetView.prototype.initSpreadsheet = function(data,x,y,callback,dataType,readOnly){
        this.callback = callback;
        this.data = data;
        this.dataType = dataType;
        this.readOnly = true;

        _.bindAll(this,
            "initializeTable"
        );

        this.overlay = this.createOverlay();
        this.$tableContainer = this.insertTable();

        // Data arrives from dataframe as:
        // {columnName1: {r1name:val, r2name: val}, columnName2: {...}}
        // Need it to be:
        // [ [c1val, c2val, c3val, ... ], [row2] ... ]
        var that=this,
            columnNames = _.keys(that.data),
            columnValues = _.map(that.data,function(column){return column;}),
            rownames = _.keys(that.data[columnNames[0]]),
            dataAsNestedArrays = _.map(rownames,function(rowName){
                return _.pluck(columnValues,rowName)
            });

        this.dataArray = dataAsNestedArrays;

        this.initializeTable();
    };

    SpreadsheetView.prototype.initializeTable = function(){

        var that=this,
            columnNames = _.keys(that.data);

        this.table = new Handsontable(this.$tableContainer.find('#editableTable').get(0), {
            data: that.dataArray,
            // contextMenu: true,
            colWidths: 100,
            minSpareRows: 50,
            minSpareCols: 15,
            readOnly: true,
            colHeaders: columnNames,
            rowHeaders: _.keys(that.data[columnNames[0]]), // take row names from first row
        });
    };

    SpreadsheetView.prototype.insertTable = function(){
        // add tableview at spec'd position
        var height = $(window).height();
        var $tableContainer = $("<div class='tableView'><div id='editableTable' style='position:relative; height:"+(height - 60)+"px; overflow: hidden;'></div></div>");
        $tableContainer.css({
            top: 50,
            left: 10,
            right: 10,
            bottom: 10,
            'z-index': 102,
            position: 'fixed',
            display: 'block'
        });
        $('body').append($tableContainer);

        return $tableContainer;
    };

    return SpreadsheetView;
});
