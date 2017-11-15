define(["jquery","parse","underscore","backbone"],function($,Parse,_,Backbone){
    var currentUser,
        projectsFetched = false;

    function fetchCurrentUser(callback){
        currentUser = Parse.User.current();
        if (currentUser) {
            // do stuff with the user
            // user id = currentUser.id
            currentUser.fetch().then(function(){
                callback(currentUser);
            });
        } else {
            // show the signup or login page
            callback(null);
        }
    }

    function fetchProjects(callback){
        var cb = function(u){
            projectsFetched = true;
            currentUser = u;
            callback(u);
        };

        if (projectsFetched === true) {
            // callback immediately
            return cb(u);
        }

        fetchCurrentUser(function(user){
            if (!_.isNull(user)) {
                var projectQuery = new Parse.Query(Parse.ORCHESTRA_OBJECTS.PROJECT);
                projectQuery.equalTo("authorId", currentUser.id);
                projectQuery.select("title");
                projectQuery.find({
                    success: function(results) {
                        // results has the list of users with a hometown team with a winning record
                        var projectList = _.map(results,function(result){
                            return {
                                id: result.id,
                                title: _.isEmpty(result.get('title')) ? "(untitled) - " + result.updatedAt : result.get('title')
                            };
                        });
                        Parse.User.current().set('projects',projectList,{
                            error: function(a, error) {
                                console.error('SET FAILED VALIDATION',error);
                            }
                        });
                        Parse.User.current().save()
                            .then(function(u){
                                cb(u);
                            });
                    }
                });
            } else {
                $.ajax({
                    url: "./examples/registry.json",
                    success: function(d){
                        // null user, make a stub
                        var userStub = new Backbone.Model();
                        userStub.set({
                            username: "Demo Account",
                            projects: d
                        });
                        cb(userStub);
                    },
                    error: function(e){
                        alert("Error Downloading Demo Projects. Please send a note to info@orchestra3d.io to let us know what happened.");
                        console.log('ERROR DOWNLOADING DEMO PROJECT REGISTRY: ',e);
                    }
                });
            }
        });
    }

    return {
        //fetchCurrentUser: fetchCurrentUser,
        fetchProjects: fetchProjects
    }
});