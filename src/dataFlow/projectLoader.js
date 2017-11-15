define(["jquery","parse","dataFlow/project","dataFlow/user"],function($,Parse,Project,User){
    // I don't want to actually subclass parse objects for all of my models, so to edit existing models I have to keep a reference
    // to the project as retrieved from Parse. That object will stay in memory, and the same object will just be saved with new json
    // from my own project class. That should keep the persistence layer completely separate from the rest of the application,
    // and limit the fallout if I need to ditch parse later.
    var OrchestraProject = Parse.ORCHESTRA_OBJECTS.PROJECT,
        currentProject = null;

    function saveProjectToParse(proj,contextData){
        Parse.User.current().fetch().then(function(user){
            // The project should always be saved with the current user's information, even if it was originally by someone else
            proj.set('authorId',user.id);
            proj.set('authorName',user.get('username'));

            var persistable,
                jsonData = proj.toJSON();

            // save context, such as camera positions, precision settings, colors, etc
            if (contextData) jsonData["contextData"] = contextData;

            console.log('SAVING: \n\n'+JSON.stringify(jsonData));

            // This method can do UPDATES as well as CREATE-NEW operations, and will, depending on if the project was loaded from parse or elsewhere.
            if (!_.isNull(currentProject) && currentProject.get('objectId') === proj.get('objectId')) persistable = currentProject;
            else persistable = new OrchestraProject();

            persistable.save(jsonData, {
                success: function(object) {
                    console.log('SAVED!\n',object);
                    proj.set({
                        id: object.id,
                        createdAt: object.createdAt,
                        updatedAt: object.updatedAt
                    });
                },
                error: function(model, error) {
                    console.log('ERROR');
                }
            });
        });
    }

    function loadProjectFromParse(projectId, callback){
        var p = new Parse.Promise();
        var query = new Parse.Query(OrchestraProject);
        query.get(projectId, {
            success: function(parseModel) {
                // Store reference in case we want to save changes later. DON'T just return the Parse model,
                // lest we find ourselves dependent on Parse(TM)
                currentProject = parseModel;

                // Create the corresponding native project model, and return it
                p.resolve(new Project(parseModel.toJSON()));
            },
            error: function(object, error) {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                p.reject(error);
            }
        });
        return p;
    }

    function loadProjectFromUrl(url, callback){
        $.get("examples/" + url + "?" + Math.random(),function(json){

            // NOT loading from parse, so if the user hits "save" it should make a new parse model:
            currentProject = null;

            callback(new Project(json));
        });
    }

    function clearCurrentProject(){
        currentProject = null;
    }

    return {
        saveProjectToParse: saveProjectToParse,
        loadProjectFromParse: loadProjectFromParse,
        loadProjectFromUrl: loadProjectFromUrl,
        clearCurrentProject: clearCurrentProject
    };
});