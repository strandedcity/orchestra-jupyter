define(['Handsontable','jquery','text!lib/css/handsontable.min.css'], function ( Handsontable, $, handsontableStyles ) {

    //////////////////////////////
    // ATTENTION!!
    //
    // THE HANDSONTABLE STYLES MUST BE LOADED BEFORE THE FIRST TABLE IS INSTANTIATED
    // THIS WRAPPER ENSURES THAT, BUT THE EFFECT IS A CONFOUNDING BEHAVIOR SO BEWARE:
    //
    // Otherwise, the table virtual scroll is completely broken -- the cells after
    // those initially visible won't be drawn for scroll or keyboard events.

    // $("head").append("<link rel='stylesheet' href='"+require.toUrl("lib/css/handsontable.min.css")+"' type='text/css'>");
    $("head").append("<style type='text/css'>"+handsontableStyles+"</style>");

    return Handsontable;
});