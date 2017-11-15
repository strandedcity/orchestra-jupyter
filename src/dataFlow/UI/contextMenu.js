define([
    "jquery",
    "underscore",
    "backbone",
    "dataFlow/dataFlow_loader"
],function($,_,Backbone,DataFlow){

    var contextMenuTemplate = '<div class="context-menu">'+
        '        <ul class="dropdown-menu" role="menu">'+
        '        <li class="comp_Name"><span><%= componentName %></span></li>'+
        '        <li><a tabindex="-1"><input type="text" placeholder="Component Name" value="<%= componentPrettyName %>"/></a></li>'+
        '        <li class="divider"></li>'+
        '            <li><a class="previewToggle" tabindex="-1"><span class="glyphicon glyphicon-eye-<% if (preview === true) {print(\'open\');} else {print(\'close\');} %> icongutter"></span>Preview</a></li>'+
        '            <li><a class="deleteComponent" tabindex="-1"><span class="glyphicon glyphicon-trash icongutter"></span>Delete</a></li>'+
        '            <li><a class="exportSVG" tabindex="-1"><span class="glyphicon glyphicon-save icongutter"></span>Export SVG</a></li>'+
        '        </ul>'+
        '        </div>';


    // prevent multiple context menus by keeping a "singleton" of sorts:
    var singleContextMenu = null,
        template = _.template(contextMenuTemplate); // precompile once


    var ContextMenu = Backbone.View.extend({
        events: {
            'click input': "keepMenu",
            'contextmenu input': "keepMenu",
            'click a.previewToggle': "togglePreview",
            'click a.deleteComponent': "deleteComponent",
            'click a.exportSVG': "exportSVG",
            'keyup input': "editComponentPrettyName"
        },
        template: template,
        initialize: function(opts){
            // Keep track of the one active context menu
            if (!_.isNull(singleContextMenu)) {singleContextMenu.destroy();}
            singleContextMenu = this;

            var x = opts.x,
                y = opts.y;

            // prepare to remove the context menu when necessary
            this.registerCleanup();

            this.render(x,y);
        },
        registerCleanup: function(){
            _.bindAll(this,"destroy");
            this.hideEventHandlers = {click: this.destroy,contextmenu: this.destroy,mousewheel: this.destroy};
            $(document).on(this.hideEventHandlers);
        },
        keepMenu: function(e){
            e.stopPropagation();
        },
        editComponentPrettyName: function(e){
            this.model.set('componentPrettyName',$(e.target).val());
        },
        togglePreview: function(){
            this.model.set('preview',!this.model.get('preview'));
        },
        deleteComponent: function(){
            this.model.destroy();
        },
        exportSVG: function(){
            this.model.exportGeometry("SVG");
        },
        render: function(x,y){
            var html = this.template(this.model.toJSON());
            $('body').append(this.$el);

            this.$el.append($(html)).find('div.context-menu').css({
                display: 'block',
                top: y+'px',
                left: x +'px'
            });
        },
        destroy: function(){
            $(document).off(this.hideEventHandlers);
            this.$el.empty();
            this.remove();
            singleContextMenu = null;
        }
    });

    return ContextMenu;
});
