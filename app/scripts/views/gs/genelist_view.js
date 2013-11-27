define([
    "jquery", "underscore", "backbone",
    "views/menu_items", "views/gs/genelist_manage",
    "models/gs/genelist_profiled", "models/gs/genelist_custom"
],
    function ($, _, Backbone, MenuItemsView, ManageGLView, ProfiledModel, CustomModel) {
        return Backbone.View.extend({
            profiledModel: new ProfiledModel(),
            customModel: new CustomModel(),

            initialize: function () {
                _.extend(this, options);
                _.bindAll(this, "renderProfiled", "renderCustom", "genelistSelected");

                var profiledView = new MenuItemsView({ model: this.profiledModel, selectEvent: "genelist-selected" });
                profiledView.on("genelist-selected", this.genelistSelected);

                var customView = new MenuItemsView({ model: this.customModel, selectEvent: "genelist-selected" });
                customView.on("genelist-selected", this.genelistSelected);

                var manageGLView = new ManageGLView({ model: this.customModel });

                this.$el.find(".genelist-profiled").html(profiledView.render().el);
                this.$el.find(".genelist-custom").html(customView.render().el);
                this.$el.find(".genelist-modal").html(manageGLView.render().el);

                this.profiledModel.fetch({ success: this.renderProfiled });
                this.customModel.fetch({ success: this.renderCustom });
            },

            renderProfiled: function () {
                this.profiledModel.trigger("load");
            },

            renderCustom: function () {
                this.customModel.trigger("load");
            },

            genelistSelected: function (genelist) {
                this.trigger("genelist-selected", genelist);
            }
        });
    });