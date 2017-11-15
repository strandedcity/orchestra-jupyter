define(["jquery","parse-lib"],function($,Parse) {
    var appId = "PKe6uzh8RhcfpeEfJS7IGId4wr7YbINnhkQnPMFv",
        jsKey = "3fINWMPQ0mS9wQXYCosurMA3bb9jHfMpJK26L84v";
    Parse.initialize(appId,jsKey);

    Parse.ORCHESTRA_OBJECTS = {
        PROJECT: Parse.Object.extend("OrchestraProject")
    };

    // Choose environment based on hostname at runtime.
    var ENV = window.location.host.indexOf("orchestra3d.io") > -1 ? "PROD" : "LOCAL";
    if (ENV == "PROD") {
        Parse.serverURL =  'https://api.orchestra3d.io';
    } else {
        Parse.serverURL =  'http://localhost:8264';
    }

    return Parse;

});
