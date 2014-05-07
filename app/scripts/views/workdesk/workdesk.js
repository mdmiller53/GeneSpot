define(["jquery", "underscore", "backbone", "backbone_gdrive",
        "views/workdesk/plots", "views/workdesk/datasets_list",
        "hbs!templates/workdesk/workdesk", "hbs!templates/line_item"],
    function ($, _, Backbone, BackboneGDrive, PlotsView, DatasetsListView, Tpl, LineItemTpl) {
        return Backbone.View.extend({
            "workbook_models": {},

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
                _.bindAll(this, "__render_plots", "__init_check_for_changes");

                this.model = this.options.model;
                this.folder = this.model.childReferences();

                this.model.on("change", this.folder.list, this.folder);
                this.folder.on("change:items", this.__render_workbooks, this);

                _.defer(this.__render_plots);
                _.defer(this.__render_datasets_list);
                _.defer(this.__init_check_for_changes);
            },

            "render": function () {
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "__render_workbooks": function () {
                var $wblEl = this.$(".workbooks-list").empty();
                _.each(this.folder.get("items"), function (item) {
                    var model = new BackboneGDrive.FileModel(item);
                    this.workbook_models[item["id"]] = model;

                    model.on("change", function () {
                        var id = model.get("id");
                        var title = model.get("title");
                        var lineitem = LineItemTpl({ "a_class": "open-workbook", "id": id, "label": title, "title": title });
                        var replacementNotFound = true;
                        _.each($wblEl.find(".open-workbook"), function(ahref) {
                            if (_.isEqual(id, $(ahref).data("id"))) {
                                $(ahref).parent().replaceWith(lineitem);
                                replacementNotFound = false;
                            }
                        }, this);
                        if (replacementNotFound) $wblEl.append(lineitem);
                    }, this);
                    _.defer(model.fetch);
                }, this);
            },

            "__init_check_for_changes": function() {
                var WGC = WebApp.GDrive.Changes;
                WGC.on("change:items", function () {
                    _.each(WGC.get("items"), function (item) {
                        var checkForChange = function(fileId, file, model) {
                            if (!model) return false;

                            if (_.isEqual(fileId, model.get("id"))) {
                                if (file) {
                                    model.set(file);
                                } else {
                                    _.defer(model.fetch);
                                }
                                return true;
                            }
                            return false;
                        };

                        var fileId = item["fileId"];
                        var file = item["file"];

                        // check is workdesk
                        if (checkForChange(fileId, file, this.model)) return;

                        // check is workbook
                        checkForChange(fileId, file, this.workbook_models[fileId]);

                    }, this);
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
            }
        });
    });