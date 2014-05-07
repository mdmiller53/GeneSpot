define(["jquery", "underscore", "backbone", "backbone_gdrive",
        "views/workdesk/plots", "views/workdesk/datasets_list", "views/workdesk/dimensions_vis",
        "hbs!templates/workdesk/workdesk", "hbs!templates/line_item"],
    function ($, _, Backbone, BackboneGDrive, PlotsView, DatasetsListView, DimensionsVis, Tpl, LineItemTpl) {
        return Backbone.View.extend({
            "events": {
                "click a.open-workbook": function (e) {
                    var workbook_id = $(e.target).data("id");
                    if (workbook_id) WebApp.Router.navigate("#workbooks/" + workbook_id, { "trigger": true });
                },
                "click a.new-workbook": function () {
                    WebApp.Router.navigate("#workbooks/new", { "trigger": true });
                },
                "click a.open-dataset": function (e) {
                    var dataset_id = $(e.target).data("id");
                    if (dataset_id) WebApp.Router.navigate("#datasets/" + dataset_id, { "trigger": true });
                },
                "click a.new-dataset": function () {
                    WebApp.Router.navigate("#datasets/new", { "trigger": true });
                }
            },

            "initialize": function () {
                _.bindAll(this, "__render_plots");

                this.model = this.options.model;
                this.folder = this.model.childReferences();

                this.model.on("change", this.folder.list, this.folder);
                this.folder.on("change:items", this.__render_workbooks, this);

                _.defer(this.__render_plots);
                _.defer(this.__render_datasets_list);
                _.defer(this.__render_dimensions_vis);
            },

            "render": function () {
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "__render_workbooks": function () {
                var $wblEl = this.$(".workbooks-list").empty();
                _.each(this.folder.get("items"), function (item) {
                    var model = new BackboneGDrive.FileModel(item);
                    model.on("change", function () {
                        var id = model.get("id");
                        var title = model.get("title");
                        $wblEl.append(LineItemTpl({ "a_class": "open-workbook", "id": id, "label": title, "title": title }));
                    }, this);
                    _.defer(model.fetch);
                }, this);
            },

            "__render_plots": function() {
                this.plots_model = new Backbone.Model({}, { "url": "configurations/plots.json" });
                this.plots_view = new PlotsView({ "model": this.plots_model });
                this.plots_model.fetch();

                this.$(".plots-container").html(this.plots_view.render().el);
            },

            "__render_datasets_list": function() {
                this.datasets_list_view = new DatasetsListView({});
                this.$(".datasets-list-container").html(this.datasets_list_view.render().el);
            },

            "__render_dimensions_vis": function() {
                this.dimensions_model = new Backbone.Model({}, { "url": "configurations/dimensions_data.json" });
                this.dimensions_vis = new DimensionsVis({ "model": this.dimensions_model });
                this.$(".dimensions-container").html(this.dimensions_vis.render().el);
                this.dimensions_model.fetch();
            }
        });
    });