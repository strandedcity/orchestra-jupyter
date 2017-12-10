define(['Handsontable','jquery'], function ( Handsontable, $ ) {

    $("head").append("<link rel='stylesheet' href='"+require.toUrl("lib/css/handsontable.min.css")+"' type='text/css'>");

    return Handsontable;
});