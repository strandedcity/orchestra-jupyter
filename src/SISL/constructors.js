define(["SISL/sisl_loader","SISL/module_utils","underscore","threejs"],function(){
    console.warn("NEED A PLACE FOR USER SETTINGS SUCH AS PRECISION!");
    var precision = 0.00001;

    // a tiny helper to avoid long lists of 'number' in the SISL cwrap calls
    var numberArguments = function(count){
        var arr = [];
        while (count > 0){
            arr.push('number');
            count--;
        }
        return arr;
    };

    try {
        var newCurve = Module.cwrap('newCurve','number',numberArguments(7));
        var freeCurve = Module.cwrap('freeCurve','number',numberArguments(1));
        var curveParametricEnd = Module.cwrap('curveParametricEnd','number',numberArguments(1));
        var curveParametricStart = Module.cwrap('curveParametricStart','number',numberArguments(1));
        var curveKnotVectorCount = Module.cwrap('curveKnotCnt','number',numberArguments(1));
        var curveControlPointCount = Module.cwrap('curveCtrlPtCnt','number',numberArguments(1));
        var curveOrder = Module.cwrap('curveGetOrder','number',numberArguments(1));
        var curveKind = Module.cwrap('curveGetKind','number',numberArguments(1));
        var curveGetKnotVectorPointer = Module.cwrap('curveGetKnots','number',numberArguments(1));
        var curveGetControlPointsPointer = Module.cwrap('curveGetCtrlPts','number',numberArguments(1));
        var s1240 = Module.cwrap('s1240','number',numberArguments(4));
        var s1227 = Module.cwrap('s1227','number',numberArguments(6));
        var s1303 = Module.cwrap('s1303','number',numberArguments(8));
        var s1356 = Module.cwrap('s1356','number',numberArguments(14));
        var s1360 = Module.cwrap('s1360','number',numberArguments(14));
        var s1857 = Module.cwrap('s1857','number',numberArguments(10));
        var s1613 = Module.cwrap('s1613','number',numberArguments(5));
        var s1957 = Module.cwrap('s1957','number',numberArguments(8));
    } catch (e) {
        throw new Error("Missing SISL dependency encountered.");
    }

    function validateControlPointList(controlPoints){
        var controlPointsPass = true;
        if (!_.isArray(controlPoints) || controlPoints.length < 2) {
            controlPointsPass = false;
        } else {
            _.each(controlPoints, function(pt){

                if (pt.constructor !== THREE.Vector3){
                    console.log('failed control point test: ',pt);
                    controlPointsPass = false;
                }
            });
        }
        if (!controlPointsPass) {
            console.log("Bad control points: ",controlPoints);
            throw new Error("Controlpoints must be an array of at least 2 Vector3 objects");
        }
    }

    function flattenPointList(points){
        var arr=[];
        for (var i=0; i< points.length; i++){
            arr.push(points[i].x,points[i].y,points[i].z);
        }
        return arr;
    }

    var unitZ = new THREE.Vector3(0,0,1),
        unitScale = new THREE.Vector3(1,1,1);

    var Geo = {};

    Geo.Utils = {
        transformMatrixFromNormalAndPosition: function(normal,position){
            var quaternion = new THREE.Quaternion().setFromUnitVectors(unitZ.clone(),normal.clone().normalize());
                return (new THREE.Matrix4()).compose(position.clone(),quaternion,unitScale);
        },
        translateMatrix: function(translation){
            return new THREE.Matrix4().makeTranslation(translation.x,translation.y,translation.z);
        }
    };

    Geo.Point = THREE.Vector3;
    Geo.Point.prototype.destroy = function(){
        /* This is a no-op for now, but for completeness we should be able to clean up all non base-type objects */
    };

    /*  Geo.Plane is basically a THREE.Matrix4, but with the added benefit of a 'setFromCoplanarPoints' method
        that threejs only makes available for planes. I've added a method to its prototype here that allows you
        to create a basis matrix from three coplanar points, and another that basically lets you subtract basis
        matrices to arrive at a transform matrix that will handle position and rotation. */
    Geo.Plane = THREE.Matrix4;
    Geo.Plane.prototype.setFromCoplanarPoints = function(a,b,c){
        // Take the three coplanar points and construct a basis matrix.
        // Normalize and force them to be orthogonal first, so no shear occurs using the resulting matrix4 for transforms
        // Vec(a,b).normalize() => x-axis
        // Vec(a,b) x Vec(a,c) .normalize() => z-axis
        // Rotate x-axis 90 degrees around Z to get y
        // Matrix4.makeBasis(x,y,z)
        // Matrix4.setPosition(a)
        var x = (new THREE.Vector3()).subVectors(b,a).normalize(),
            y = x.clone().cross((new THREE.Vector3()).subVectors(c,a)).normalize(), // in webgl, Y is up. :/
            z = x.clone().applyAxisAngle(y,Math.PI/2); // already normalized, since x was normalized

        this.makeBasis(x,y,z);
        this.setPosition(a);
    };
    Geo.Plane.prototype.getChangeBasisMatrixForTransformationTo = function(anotherPlane){
        // Return a Matrix4 representing the full change-basis transformation from 'this' to 'anotherPlane', including
        // the translate aspect introduced by having an origin point for the plane
        return (new THREE.Matrix4()).getInverse(this).premultiply(anotherPlane);
    };
    Geo.Plane.prototype.destroy = function(){
        /* This is a no-op for now, but for completeness we should be able to clean up all non base-type objects */
    };

    // SISLCurve *newCurve (vertex_count, curve_order, *knotvector, *vertices, ikind, dimension, icopy)
    // ikind: 1=polynomial b-spline, 2=rational b-spline, 3=polynomial bezier, 4=rational bezier
    // icopy: 0=Set pointer to input arrays, 1=Copy input arrays, 2=Set pointer and remember to free arrays.
    
    Geo.Curve = function GeoCurve(){
        var that = this;

        // Direct Construction of a Curve can have a few different inputs....
        this.fromControlPointsDegreeKnots = function(controlPoints, degree, knots){
            // validate inputs
            validateControlPointList(controlPoints);

            return this.fromControlPointArrayDegreeKnots(flattenPointList(controlPoints),degree,knots);
        };

        this.fromControlPointArrayDegreeKnots = function(controlPointArray, degree, knots) {
            // Preparing data for geometry library:
            var dimension = 3, // always
                vertexCount = controlPointArray.length / dimension,
                curveOrder = degree + 1,
                ikind = 1, /* see sisl.h:   = 1 : Polynomial B-spline curve.    = 2 : Rational B-spline curve.
                                            = 3 : Polynomial Bezier curve.      = 4 : Rational Bezier curve.   */
                icopy = 2, // set pointer and remember to free arrays
                knotVector, knotVectorPointer,
                vertices = controlPointArray, verticesPointer;

            if (typeof degree !== "number" || degree % 1 !== 0) {throw new Error("Curve degree must be an integer");}
            if (knots && !_.isArray(knots)) {throw new Error("Knots, if defined, must be an array");}
            if (degree >= vertexCount) {throw new Error("Curve degree must be smaller than the number of control points");}
            // By definition, from http://en.wikipedia.org/wiki/Non-uniform_rational_B-spline
            // #knots = #control pts + curve order
            // curve order = degree + 1
            // knot vectors look like [0,0,1,2,3,3]

            // Knot vector must be generated if not supplied... there are a couple ways we might do this, but the simplest is:
            knotVector = _.isArray(knots) ? knots : Module.Utils.generateUniformKnotVector(vertexCount,curveOrder);

            // copy knotvector, get pointer:
            knotVectorPointer = Module.Utils.copyJSArrayToC(knotVector);
            verticesPointer = Module.Utils.copyJSArrayToC(vertices);

            this._pointer = newCurve(vertexCount,curveOrder,knotVectorPointer,verticesPointer,ikind,dimension,icopy);

            return this;
        }

        this.fromPointer = function(pointer){
            this._pointer = pointer;
        }
    };

    var curveMethods = {
        getLength: function(){
            // corresponds to s1240: void s1240(*curve, double precision, *result length, *result stat(>0= warning, 0=ok, <0=error))
            var buffer = Module._malloc(16);
            s1240(this._pointer,precision,buffer,0);
            var len = Module.getValue(buffer,'double');
            Module._free(buffer);
            return len;
        },
        divideEqualLengthSegments: function(segmentCount){

            // var timing = (new Date()).getTime();
            // SISL doesn't natively include the facility to retrieve parameter values of a curve which, when evaluated,
            // will produce equal-length sections along the curve.
            // There's almost no tax to doing this in JavaScript, however, since all the arrays and pointers stay in C-land until the end.
            // Strategy: Use s1613 to approximate the curve with straight segments, then use the straight segments to divide the curve by
            // length. Pull those points back to the original curve using s1957 or s1953
            // s1613(*curve, geometricPrecision, **points, *numpoints, *stat)

            // INPUT ARGS
            var curve = this._pointer,
                epsge = precision, // less precision needed at this step, since points will be pulled back to curve.

            // OUTPUT ARGS
                points = Module._malloc(8),     // double**
                numPoints = Module._malloc(8),  // int*
                stat = Module._malloc(8);       // int*

            s1613(curve,epsge,points,numPoints,stat);

            var sv = Module.Utils.copyCArrayToJS(Module.getValue(points,'i8*'),Module.getValue(numPoints,'i8*')*3); //"segmentVertices";
            var accumulatedLengthsToStartOfVertex = [0];

            // Find segments of the approximated polyline in which the requested curve lengths fall. Interpolate to find closest
            // parameters on the curve.
            // Would be nice if this happened in C-land to avoid copying the whole array sv, which turns out to be very long, into JS
            var segmentLength = this.getLength()/segmentCount,
                closePointsByLinearSegmentApproximation = [this.getEndPoint()], // add endpoint so that results are in order
                whichSegment = 1;

            for (var i=0; i < sv.length / 3 - 1; i++) {
                // find distance between this point and the next point
                var deltaX = sv[3*i+3]-sv[3*i],
                    deltaY = sv[3*i+4]-sv[3*i+1],
                    deltaZ = sv[3*i+5]-sv[3*i+2],
                    deltaDist = Math.sqrt( Math.pow(deltaX,2) + Math.pow(deltaY,2) + Math.pow(deltaZ,2)  ),
                    lastDist = accumulatedLengthsToStartOfVertex[accumulatedLengthsToStartOfVertex.length-1],
                    totalDist = lastDist+deltaDist;
                accumulatedLengthsToStartOfVertex.push(totalDist);

                if (lastDist < whichSegment * segmentLength && totalDist > whichSegment * segmentLength) {
                    // The length-along-curve that I'm looking for is in this segment! Interpolate to find the position of the point
                    // that matches the requested length best

                    // interpolate as many points as fall on this segment. I expect the number is small, usually 1
                    while (totalDist > whichSegment * segmentLength) {
                        var neededLengthOfSegment = whichSegment*segmentLength - lastDist,
                            scale = neededLengthOfSegment / deltaDist;

                        closePointsByLinearSegmentApproximation.push(new Geo.Point(
                            sv[3*i] + scale*deltaX,
                            sv[3*i+1] + scale*deltaY,
                            sv[3*i+2] + scale*deltaZ
                        ));

                        whichSegment++;
                    };
                } 
            }

            var that = this;
            var paramsAtPoints = _.map(closePointsByLinearSegmentApproximation,function(approxPoint){
                return that.getClosestPointParameter.call(that,approxPoint);
            });

            // Clean up:
            Module._free(Module.getValue(points,'i8*'));
            Module._free(points);
            Module._free(numPoints);
            Module._free(stat);

            return paramsAtPoints;
        },
        getClosestPointParameter: function(point){
            // s1957(pcurve, epoint, idim, aepsco, aepsge, gpar, dist, jstat)
            
            if (typeof point !== "number" && point.constructor !== Geo.Point) {
                throw new Error("getClosestPointParameter requires the input point to either be a C-style pointer, or a GeoPoint");
            }

            // INPUT ARGUMENTS
            var pcurve = this._pointer,
                // pass either a pointer to an array of length 3, or copy the data
                epoint = typeof point === "number" ? point : Module.Utils.copyJSArrayToC(point.toArray()),
                idim = 3,
                aepsco = 0,
                aepsge = precision,

                // OUTPUT ARGUMENTS
                gpar = Module._malloc(8), // parameter value of the closest point
                dist = Module._malloc(8), // distance between the curve and point
                jstat = Module._malloc(8); // <0=error, 0=point found, >0 warning, =1 point lies at an end

            s1957(pcurve, epoint, idim, aepsco, aepsge, gpar, dist, jstat);

            var outputParameter = Module.getValue(gpar,'double');

            Module._free(gpar);
            Module._free(dist);
            Module._free(jstat);
            if (typeof point !== "number") Module._free(epoint); // if "point" is just a number, it was a pointer passed in that's owned by somebody else

            return outputParameter;
        },
        getKnotVector: function(){
            // # knots =  number of control points plus curve order
            var cnt = curveControlPointCount(this._pointer) + curveOrder(this._pointer),
                pntr = curveGetKnotVectorPointer(this._pointer);
            return Module.Utils.copyCArrayToJS(pntr,cnt);
        },
        getControlPointArray: function(){
            var dim = 3,
                cnt = curveControlPointCount(this._pointer) * dim,
                pntr = curveGetControlPointsPointer(this._pointer);
            return Module.Utils.copyCArrayToJS(pntr,cnt);
        },
        getControlPoints: function(){
            var pointPositions = this.getControlPointArray(),
                controlPoints = [];

            // Turn the control points into Geo.Point objects from [x1,y1,z1,x2,y2,z2....]
            for (var i=0; i<pointPositions.length; i+=3){
                controlPoints.push(new Geo.Point(pointPositions[i],pointPositions[i+1],pointPositions[i+2]));
            }
            return controlPoints;
        },
        getCurveKind: function(){
            return curveKind(this._pointer);
        },
        getCurveOrder: function(){
            return curveOrder(this._pointer);
        },
        getDegree: function(){
            return this.getCurveOrder() - 1;
        },
        rotateAxisAndCenterMatrix: function(theta,axis,center) {
            // TODO: This method should be in Geo.Utils
            var composed = new THREE.Matrix4();
            return composed.multiplyMatrices(this.rotateAxisMatrix(theta,axis), Geo.Utils.translateMatrix(center.clone().multiplyScalar(-1))).premultiply(Geo.Utils.translateMatrix(center.clone()));
        },
        rotateAxisMatrix: function(theta,axis){
            // Axis is optional. Omitting it will assume a rotation in the XY plane around the origin.
            // TODO: This method should be in Geo.Utils
            var rotationAxis = axis ? axis.clone().normalize() : new THREE.Vector3(0,0,1),
            rotationMatrix = new THREE.Matrix4().makeRotationAxis ( rotationAxis, theta );

            return rotationMatrix;
        },
        applyMatrix4: function(matrix4){
            // Returns a new curve, transformed by the supplied matrix. The beauty of NURBS: affine transforms can be done on control points, and the resulting objects will appear translated.
            // THREEJS supplies robust enough matrix math to nicely complement SISL's disinterest in affine transforms.
            var oldControlPoints = this.getControlPointArray(), // so I can use .applyToVector3Array ( array ), see https://threejs.org/docs/api/math/Matrix4.html
                newControlPoints = matrix4.applyToVector3Array(oldControlPoints),
                degree = this.getCurveOrder()-1;
            
            return new Geo.Curve().fromControlPointArrayDegreeKnots(newControlPoints,degree,this.getKnotVector());
        },
        getPointer: function(){
            return this._pointer;
        },
        getMaxParameter: function(){
            if (typeof this.maxParam === "number") {
                return this.maxParam;
            }
            return curveParametricEnd(this._pointer) - 1;
        },
        getMinParameter: function(){
            if (typeof this.minParam === "number") {
                return this.minParam;
            }
            return curveParametricStart(this._pointer) + 1;
        },
        getPositionAt: function (param) {
            var evaluation = this._evalAt(param);
            return new Geo.Point(evaluation[0],evaluation[1],evaluation[2]);
        },
        getTangentAt: function(param){
            var evaluation = this._evalAt(param);
            return new Geo.Point(evaluation[3],evaluation[4],evaluation[5]);
        },
        getStartPoint: function(){
            return this.getPositionAt(this.getMinParameter());
        },
        getEndPoint: function(){
            return this.getPositionAt(this.getMaxParameter());
        },
        _evalAt: function(param){
            // void s1227(*curve, int #derivatives to compute: 0=position 1=tangent, parvalue, *leftknot (opt), double[] derive, *stat))
            if (typeof param === "undefined") {throw new Error("Curve parameter must be defined");}
            var buffer = Module._malloc(16*6);
            s1227(this._pointer,1,param,0,buffer,0);
            var derivs = Module.Utils.copyCArrayToJS(buffer,6);
            Module._free(buffer);

            return derivs;
        },
        destroy: function(){
            // big performance problems (browser crashes!) when freeing emscripten's memory synchronously. 
            // Doing it asynchronously seems to solve that completely.
            // function getStackTrace () {

            //     var stack;

            //     try {
            //         throw new Error('');
            //     }
            //     catch (error) {
            //         stack = error.stack || '';
            //     }

            //     stack = stack.split('\n').map(function (line) { return line.trim(); });
            //     return stack.splice(stack[0] == 'Error' ? 2 : 1);
            // }

            // var details = getStackTrace().join('\n');

            var that = this;
            setTimeout(function(){
                if (that.DESTROYED) {
                    // THIS IS BAD! BECAUSE SISL CURVES AREN'T ACTUALLY CLONED IN EVERY OPERATION, THEY VIOLATE THE FUNCTIONAL PARADIGM
                    // PRESENT ELSEWHERE. IT'S POSSIBLE, THEN, FOR A DOWNSTREAM COMPONENT TO DESTROY SOMETHING AN UPSTREAM COMPONENT IS USING,
                    // POSSIBLY JUST BY CLEARING VALUES IN THE DATA TREE
                    console.warn("AN ATTEMPT WAS MADE TO DESTROY AN ALREADY-DESTROYED CURVE. THIS WILL CAUSE A MEMORY ALLOCATION ERROR, BUT CAN HAPPEN WHEN A JAVASCRIPT REFERENCE IS KEPT AFTER IT WAS SUPPOSED TO BE DROPPED.");
                    return;
                }
                try {
                    freeCurve(that._pointer);
                    that.DESTROYED = true;
                }
                catch (e) {
                    // console.log(details);
                    console.warn("UNABLE TO DESTROY A CURVE! INVESTIGATE! " + that._pointer);
                    // throw (e);
                }
            },10);
        }
    };

    Geo.CircleCNR = function CircleCNR(center,normal,radius){
        // JS wrapper to make the SISL code go.
        // s1303(startPoint[3], precision, angle, centerPoint[3], normalAxis[3], dimension, **resultCurve, &stat);
        // NOTES:
        // double startpt[3] // point on circle where arc starts
        // double angle // arc angle, full circle if < −2π, +2π >

        // startpt must be calculated from the radius (which I want to supply) and the normal
        // (that we have). It's a point on the circle, but isn't simple addition unless the circle is flat
        // This calculation (get rotation matrix, get translate matrix, apply it to the startpoint) is very
        // heavy for what it does, but is also very generic.
        var transformMatrix = Geo.Utils.transformMatrixFromNormalAndPosition(normal,center);

        // Use this transformation matrix to calculate a start point on the circle
        var flatRadius = new THREE.Vector3(radius,0,0),
            start = flatRadius.applyMatrix4(transformMatrix);


        var startpt = Module.Utils.copyJSArrayToC([start.x,start.y,start.z]),
            angle = 10, // just bigger than 2pi, to close the circle
            centrept = Module.Utils.copyJSArrayToC([center.x,center.y,center.z]),
            axis = Module.Utils.copyJSArrayToC([normal.x,normal.y,normal.z]),
            dim = 3,
            ptr = Module._malloc(16*7); /* This may be wrong, but I believe it's the size of the SISLCurve Struct */
//        console.log('params: ',center,normal,radius);
//console.trace();
        s1303(startpt, precision, angle, centrept, axis, dim, ptr, 0);

        // store the pointer for later use. s1303 takes a pointer to a pointer, so this._pointer needs to be retrieved
        this._pointer = Module.getValue(ptr, 'i8*');
    };

    Geo.CurveOffset = function CurveOffset(oldCrv,offsetDist,normalVect){
        // s1360(*oldcurve, double offset, double maxdeviation, double[] normal Vector (for 3d), double maxStepLength, int dimension, **newcurve, int* stat)

        var normal = normalVect || new THREE.Vector3(0,0,1),
            normalArr = Module.Utils.copyJSArrayToC([normal.x,normal.y,normal.z]),
            maxStepLength = 0.01, // ignored when > precision
            ptr = Module._malloc(16*7); // SISLCurve Struct size, for output

        console.warn("Not sure what step length means!");

        s1360(oldCrv._pointer, offsetDist, precision, normalArr, maxStepLength, 3, ptr, 0);

        this._pointer = Module.getValue(ptr, 'i8*');
    };

    Geo.Intersections = {};
    Geo.Intersections.CurveCurve = function CurveCurveIntersection(curve1,curve2){
        // s1857 - Find all the intersections between two curves.

        // INPUT arguments
        var crv1ptr = curve1.getPointer(),  // SISLCurve        *curve1;
            crv2ptr = curve2.getPointer(),  // SISLCurve        *curve2;
            epsco = precision,              // double           epsco;
            epsge  = precision,             // double           epsge;

        // OUTPUT
            numintpt = Module._malloc(8),   // int              *numintpt;
            intpar1 = Module._malloc(8),    // double           **intpar1;
            intpar2 = Module._malloc(8),    // double           **intpar2;
            numintcu = Module._malloc(8),   // int              *numintcu;     // not implemented in round 1
            intcurve = Module._malloc(8),   // SISLIntcurve     ***intcurve;     // not implemented in round 1
            stat = Module._malloc(8);       // int              *stat;         // not implemented in round 1

        // Find Intersections!
        s1857(crv1ptr,crv2ptr,epsco,epsge,numintpt,intpar1,intpar2,numintcu,intcurve,stat);

        // how to deal with the pointer-pointer????
        // http://kapadia.github.io/emscripten/2013/09/13/emscripten-pointers-and-pointers.html
        // ... that would actually lead you astray, because in this case the memory is allocated by functions
        // in SISL. So all we need is to read the first pointer, then start reading the array at the array's location
        var intersectionCount = Module.getValue(numintpt, 'i8');
        var t1 = Module.Utils.copyCArrayToJS(Module.getValue(intpar1,'i8*'),intersectionCount);
        var t2 = Module.Utils.copyCArrayToJS(Module.getValue(intpar2,'i8*'),intersectionCount);
        // console.log("Intersection Result:",{count: intersectionCount, curve1Min: curve1.getMinParameter(),curve1Max: curve1.getMaxParameter(), tA: tA,tB: tB});

        console.warn("TODO: FREE MEMORY FOR ALL THE STUFF ALLOCATED FOR INTERSECTIONS -- WE HAVE WHAT WE NEED NOW")

        // Returns list of intersection points, as well as the parameters of the intersection points
        // on c1 and c2
        return {
            t1: t1,
            t2: t2
        };
    };

    Geo.CurveInterpolated = function CurveInterpolated(pointList,degree,periodic){
        validateControlPointList(pointList);
        if (typeof degree !== "number" || degree % 1 !== 0) {throw new Error("Curve degree must be an integer");}
        if (typeof periodic !== "boolean") {throw new Error("Periodic must be a boolean");}

        // not sure what to do with this functon. It's stupid, but I don't need this parameter and have to fill
        // it with something. See SISL docs for s1356
        function dummyArray(count){
            var dummy = [];
            for (var i=0; i<count; i++){
                dummy[i] = 1; // 1= ordinary point for interpolation curve
            }
            return dummy;
        }

        // INPUT arguments
        var pointsToInterpolate = Module.Utils.copyJSArrayToC(flattenPointList(pointList)),
            numPts = pointList.length,
            dim = 3, // 3 dimensions, always
            pointTypes = Module.Utils.copyJSArrayToC(dummyArray(pointList.length),'i8'), // each point is an "ordinary point"
            initialCondition = 0, // no initial condition
            endCondition = 0, // no end condition
            open = 0, //periodic === true ? -1 : 1, // -1 = periodic, 1 = open
            order = degree + 1,
            startParam = 0,

        // OUTPUT arguments
            endparam = Module._malloc(16),
            curvePtr = Module._malloc(16*7),
            paramsPtr = Module._malloc(16*numPts),
            numberOfParams = Module._malloc(80);
        console.warn('interpcurves are DRAMATICALLY overallocated, but I dont know how.');
        console.warn('ALSO the hard-coded value of periodic seems to be a bug!!');

        var arg = [
            pointsToInterpolate,    // double epoint[];
            numPts,                 // int    inbpnt;
            dim,                    // int    idim;
            pointTypes,             // int    nptyp[];
            initialCondition,       // int    icnsta;
            endCondition,           // int    icnend;
            open,                   // int    iopen;
            order,                  // int    ik;
            startParam,             // double astpar;
            endparam,               // double *cendpar;
            curvePtr,               // SISLCurve  **rc;
            paramsPtr,              // double **gpar;
            numberOfParams,         // int    *jnbpar;
            0                       // int    *jstat;
        ];

        s1356.apply(this,arg);
        this.minParam = startParam;
        this.maxParam = Module.getValue(endparam, 'double');

        // store the pointer for later use. s1303 takes a pointer to a pointer, so this._pointer needs to be retrieved
        this._pointer = Module.getValue(curvePtr, 'i8*');
    };

    _.extend(Geo.Curve.prototype,curveMethods);
    _.extend(Geo.CircleCNR.prototype,curveMethods);
    _.extend(Geo.CurveInterpolated.prototype,curveMethods);
    _.extend(Geo.CurveOffset.prototype,curveMethods);

    // BASIC TESTING STRATEGY:
    // window.CurveInterp = Geo.CurveInterpolated;
    // var pointList = [new THREE.Vector3(0,0,0),new THREE.Vector3(1,5,0),new THREE.Vector3(5,1,0),new THREE.Vector3(10,0,0)];
    // var curve = CurveInterp(pointList,3,false);
    // (expect no errors in the JS Console)

    return Geo;
});

