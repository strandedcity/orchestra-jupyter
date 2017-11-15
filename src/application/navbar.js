define(["jquery","componentSearcher","backbone","underscore"],function($,ComponentSearcher,Backbone,_){
    var Nav = Backbone.View.extend({
        el: '#navContainer',
        template: _.template($('#navTemplate').html()),
        events: {
            'click .saveBtn': "saveProject",
            'click .openProjectLink': "openProject",
            'click #newProjectButton': "newProject",
            'click .navbar-project-title': "toggleTitleEntryState",
            'blur #titleChanger': "toggleTitleEntryState",
            'change .titleChangerWidget input': "updateProjectTitle"
        },
        initialize: function(opts){
            this.project = null;
            this.user = null;
            this.titleIsEditable = false;

            if (!_.isUndefined(opts) && !_.isUndefined(opts.project)) this.setProject(opts.project);

            var that = this;
            $(document).ready(function(){
                that.fetchUser.call(that);
                that.render.call(that);
                that.initSearchbar('componentChooser');

                // When no project is open, you get an error when trying to add a component to the workspace.
                // That's counter-intuitive. Just open a new one at load time.
                // Defer, so the event listeners in app.js are ready
                _.defer(function(){that.newProject();}); 
            });
        },
        setUser: function(user){
            this.user = user;
        },
        setProject: function(project){
            this.stopListening(this.project);

            this.project = project;
            this.updateTitleDisplay(project);
            this.listenTo(this.project,"change:title",this.updateTitleDisplay);
        },
        saveProject: function(e){
            e.preventDefault();
            this.trigger("saveCurrentProject");
        },
        openProject: function(e){
            var projectId = $(e.target).attr('id');

            if (projectId.indexOf('.json') > -1) {
                this.trigger('openExampleProject',projectId);
            } else {
                this.trigger('openParseProject',projectId);
            }
        },
        newProject: function(e){
            this.trigger("openNewProject");
        },
        toggleTitleEntryState: function(e){
            var input = $('.titleChangerWidget'),
                text = $('.navbar-project-title'),
                curr = this.titleIsEditable;

            if (curr) {
                input.hide();
                text.show();
            } else {
                input.show();
                input.find('input').focus();
                text.hide();
            }

            // reverse for next time
            this.titleIsEditable = !curr;
        },
        updateProjectTitle: function(e){
            if (!_.isNull(this.project)) {
                this.project.set('title',$(e.target).val());
            } else {
                console.warn('Tried to set title of null project');
            }
        },
        updateTitleDisplay: function(proj){
            var displayText = proj.get('title');
            $('.titleChangerWidget').find('input').val(displayText); // so that the input has the right text when loaded from a new project
            displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
            $('.navbar-project-title').text(displayText === "" ? "Untitled Project" : displayText);
        },
        fetchUser: function(){
            var that = this;
            require(["dataFlow/user"],function(User){
                User.fetchProjects(function(currentUser){
                    // Will either return a user or a 'user stub' to be used for the demo
                    var model = currentUser.toJSON();
                    that.$el.find('#nav-loggedin-area').append(_.template($('#user_menu_template_logged_in').html(),model));

                });
            });
        },
        initSearchbar: function(inputId){
            // Set up the component searcher / typeahead in the main nav menu
            var that = this;
            this.searcher = new ComponentSearcher($('#'+inputId));
            $(this.searcher).on("selectedComponent",function(e,component){
                // the navbar knows nothing about the workspaces that are available.
                // All it can do is request a new component. "Component" objects will be in the form described
                // in componentRegistry.json, but the workspace context only needs the "function name" to create a new one
                // More properties will be added, however, as components are organized into namespaces, so I'm leaving
                // this as the full object for now
                //{
                //    "functionName": "PointComponent",
                //    "name": "Point(x,y,z)",
                //    "shortDescription": "Creates a Point Object from X, Y, and Z coordinate values"
                //}
                that.trigger('createNewComponent',component);
            });
        },
        render: function(){
            var userData = {username: ""}; // STUBBED OUT! The navbar should be templated with the logged in user's stuff.
            var navHTML = this.template(userData);
            this.$el.html(navHTML);
        }
    });

    return Nav;
});