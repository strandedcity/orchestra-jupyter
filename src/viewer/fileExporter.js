define(["underscore","threejs"],function(_){

    function FileExporter(modelView){
        // Needs access to the modelView object, so that the camera, scene, and current renderer
        // can be accessed when the user requests a file for download.
        if (!modelView) {throw new Error("FileExporter must be instantiated with a viewer");}
        this.modelView = modelView;
        this.reset();
    }

    FileExporter.prototype.export = function(options){
        if (options.type = "SVG") this.downloadSVG(options.geometry);
    };

    FileExporter.prototype.reset = function(){
        this.camera = this.modelView.camera;
        this.width = this.modelView.renderer.getSize().width;
        this.height = this.modelView.renderer.getSize().height;
        this.scale = null;
    };

    FileExporter.prototype.setOrthoView = function(orientation,scale){
        // lets you set the camera to a specific orientation ("top", "left" or "right")
        // then sets the output size and scale to render lines at a particular scale
    };

    FileExporter.prototype._buildSVGFileAndDownload = function(domElement){
        // a mix of the approaches presented here: 
        // http://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
        var svg = domElement;

        // //get svg source.
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(svg);

        //add name spaces.
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        
        var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
        var url = URL.createObjectURL(svgBlob);

        //set url value to a element's href attribute.
        var downloadLink = document.createElement("a");
            downloadLink.href = url;
            downloadLink.download = "orchestra-output.svg";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
    };

    FileExporter.prototype._buildExportScene = function(geom){
        // Construct a new scene for the export. Though we borrow the modelView's cameras and camera
        // funtionality because the user might want to use it for previews, "export" is a bit different
        // on the scene level. Specifically:
        // 1) No "helpers" such as the grid or axis-guides
        // 2) Geometry is rendered selectively by component
        // 3) Geometry is drawn as polylines, projected Bezier curves, and high-segment-count polylines, 
        //    prioritizing fidelity to its definition over speed
        var exportScene = new THREE.Scene(),
            that = this,
            material = new THREE.LineBasicMaterial({
                color: 0x000000
            });

        console.warn("EXPORT SUPPORTS ONLY CURVE OBJECTS");
        _.each(geom,function(geometryItem){
            var object3d = that.drawingRouter(geometryItem,material);
            exportScene.add(object3d);
        });
        
        return exportScene;
    };

    FileExporter.prototype.drawingRouter = function(geometryItem,material){
        switch (geometryItem.constructor.name) {
            case "GeoCurve":
                return this.drawCurve(geometryItem,material);
            default:
                console.warn("Unsupported type for export: "+geometryItem);
                return null;
        }

    };

    FileExporter.prototype.drawCurve = function(curve,material){
        var geometry = new THREE.Geometry();

        // Is the curve degree one? Use its vertices:
        if (curve.getDegree() === 1) {
            var controlPoints = curve.getControlPoints();
            _.each(controlPoints,function(pt){
                geometry.vertices.push(pt);
            });
        } else {
            // TODO: Smartly project Bezier curves for export via SVG *AS CURVES*
            // For now, use 1000 point divisions
            console.log('curve is not degree 1.');
        }

        return new THREE.Line( geometry, material );
    };

    FileExporter.prototype.downloadSVG = function(geom){
        // Retrieve previewable geometry from component, then render it using threejs's
        // svgrenderer, exporting that svg to a text file for download
        // The catch is using the current viewer's camera, but removing certain objects (eg: the grid) from
        // the scene.

        var that = this;
        require(["Projector","SVGRenderer"],function(Projector,SVGRenderer){
            // all geometry must somehow fit on the screen in order to be rendered by the SVG renderer. 
            // But that means I don't get the scale I want.
            // So I'll scale DOWN to get all the data in the export, then scale back UP by changing the width and height
            // of the SVG itself.
            var SCALE = 1, ZOOM = 0.2;
            console.warn("HARD-CODED SCALE AND ZOOM SET FOR SVG EXPORT. SHOULD BE CONFIGURABLE");

            that.modelView.setOrtho(true);
            that.modelView.setStandardView("TOP");
            that.modelView.setUnitsAndScale("in",(SCALE*ZOOM)); 
            that.reset(); // Make sure we aren't referencing an old camera or renderer

            var renderer = new THREE.SVGRenderer();
                renderer.setClearColor( 0xffffff );
                renderer.setSize( that.width/(SCALE*ZOOM),that.height/(SCALE*ZOOM));
                renderer.setQuality( 'high' );
            document.body.appendChild( renderer.domElement );

            renderer.render( that._buildExportScene(geom), that.modelView.orthoCamera );

            // Download the SVG
            // IMPORTANT: We have real geometry here, and we'd like to download curves as curves, rather than as
            // line segments. THREEJS no longer helps us here.... SO we baically need to do this the hard way.
            // Curves need to be broken up, (re)defined as degree <= 3, and then projected to the view plane of the SVG.
            // This is because the SVG drawing API supports cubic and quadratic curves, but nothing higher-order than that.
            // http://stackoverflow.com/questions/37616929/draw-svg-bezier-curve
            // Perhaps it makes more sense to export DXF's, which actually store the piecewise interpolates on the data structure
            // itself, then use free tools like inkscape to read those?
            // Here's a parser, which seems like it could easily go the other way:
            // https://github.com/bjnortier/dxf
            that._buildSVGFileAndDownload(renderer.domElement);

            // Remove the SVG from the DOM. Not needed until next time!    
            document.body.removeChild(renderer.domElement);

            // Reset the viewer
            that.modelView.setOrtho(false);
            that.modelView.render();
        });

    };

    return function(viewer){
        return new FileExporter(viewer);
    };

});