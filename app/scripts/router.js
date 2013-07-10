define   (['jquery', 'underscore', 'backbone', 'qed',
    'views/topbar_view',
    'views/data_menu',
    'views/data_menu_modal',
    'views/sessions_view'
],
function ( $,        _,            Backbone,    QED,
           TopNavBar,
           DataMenuView,
           DataMenuModal,
           SessionsView) {

return Backbone.Router.extend({
    targetEl: "#mainDiv",
    routes:{
        "":"home_view",
        "v/*uri/:view_name":"viewsByUri",
        "s/*sessionId": "loadSessionById"
    },

    initialize: function(options) {
        if (options) _.extend(this, options);

        this.$el = $(this.targetEl);
    },

    views: {

    },

    initTopNavBar:function() {
        var topnavbar = new TopNavBar();
        $("#navigation-container").append(topnavbar.render().el);

        var section_ids = _.without(_.keys(qed.Datamodel.attributes), "url");
        _.each(section_ids, function(section_id) {
            var dataMenuView = new DataMenuView({ "section": qed.Datamodel.get(section_id) });
            $(".data-menu").append(dataMenuView.render().el);
            dataMenuView.on("select-data-item", function(selected) {
                var modalConfig = _.extend({ sectionId: section_id }, selected);
                var dataMenuModal = new DataMenuModal(modalConfig);
                $("body").append(dataMenuModal.render().el);
            });
        });

        var sessionsView = new SessionsView();
        this.$el.find(".sessions-container").html(sessionsView.render().el);
    },

    loadSessionById: function(sessionId) {
        if (!_.isEmpty(sessionId)) {
            var selectedSession = _.find(qed.Sessions.All.models, function(m) {
                return _.isEqual(m.get("id"), sessionId);
            });
            if (selectedSession) {
                qed.Sessions.Active = selectedSession;
                var route = selectedSession.get("route");
                if (!_.isEmpty(route)) {
                    qed.Router.navigate(route, {trigger: true});
                }
            }
        }
    },
    
    home_view:function () {
        // TODO
    },

    viewsByUri: function(uri, view_name, options) {
        var parts = uri.split("/");
        var data_root = parts[0];
        var analysis_id = parts[1];
        var dataset_id = parts[2];
        var model_unit = qed.Datamodel.get(data_root)[analysis_id];
        var catalog = model_unit.catalog;
        var catalog_unit = catalog[dataset_id];
        var modelName = catalog_unit.model;
        var serviceUri = catalog_unit.service || model_unit.service || "data/" + uri;
        var Model = qed.Models[modelName || "Default"];

        var model_optns = _.extend(options || {}, {
            "data_uri": "svc/" + serviceUri,
            "analysis_id": analysis_id,
            "dataset_id": dataset_id,
            "model_unit": model_unit,
            "catalog_unit": catalog_unit
        });
        qed.FetchAnnotations(dataset_id);

        var model = new Model(model_optns);
        _.defer(function() {
            model.fetch({
                success:function () {
                    if (model.make_copy) model.make_copy(Model, model_optns);
                    model.trigger("load");
                }
            });
        });

        var view_options = _.extend({"model":model}, (model_unit.view_options || {}), (options || {}));

        var ViewClass = qed.Views[view_name];
        var view = new ViewClass(view_options);
        this.$el.html(view.render().el);
        return view;
    }
});

// end define
});