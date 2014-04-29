define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/workdesk", "hbs!templates/line_item",
        "models/gdriveapi_backbone_model", "views/workbooks/workbook",
        "views/genes/control"
    ],
    function ($, _, Backbone, Tpl, LineItemTpl, GDriveApiBackboneModel, WorkbookView, GenelistControl) {
        return Backbone.View.extend({
            "events": {
                "click a.select-workbook": function (e) {
                    WebApp.Router.navigate("wb/" + $(e.target).data("id"));
                },
                "click a.create-workbook": function () {
                    this.active_workbook = new GDriveApiBackboneModel({
                        "title": "Untitled Workbook",
                        "parents": [
                            {
                                "id": this.workdesk_model.get("id"),
                                "kind": "drive#fileLink"
                            }
                        ],
                        "mimeType": "application/vnd.genespot.workbook"
                    });

                    var view = new WorkbookView({ "model": this.active_workbook });
                    this.$(".container.workbook").html(view.render().el);
                },
                "click a.save-workbook": function () {
                    if (this.active_workbook.get("id")) {
                        this.active_workbook.update();
                    } else {
                        var actwbk = this.active_workbook;
                        this.active_workbook.insert({
                            "success": function () {
                                WebApp.Router.navigate("wb/" + actwbk.get("id"));
                            }
                        });
                    }
                }
            },

            "initialize": function () {
                _.bindAll(this, "render", "__render_workbooks");

                this.workdesk_model = this.options.model;
                this.workdesk_model.on("load", this.__list_workbooks, this);

                this.changes_model = new GDriveApiBackboneModel({ "kind": "drive#change"});
                this.changes_model.on("change", function (file) {
                    if (_.isEqual(file["id"], this.workdesk_model.get("id"))) {
                        this.workdesk_model.set(file);
                    }
                }, this);
                this.changes_model.monitor();
            },

            "render": function () {
                this.$el.html(Tpl(this.workdesk_model.toJSON()));
                return this;
            },

            "render_workbook": function (workbook_id) {
                var model = new GDriveApiBackboneModel({ "id": workbook_id, "kind": "drive#file" });
                this.active_workbook = new WorkbookView({ "model": model });

                var successFn = _.bind(function() {
                    this.$(".container.workbook").html(this.active_workbook.render().el);
                }, this);
                var errorFn = _.bind(function() {
                    this.$(".alert.workbook-not-found").show();
                }, this);
                model.drive_get({ "success": successFn, "error": errorFn });

                this.changes_model.on("change", function (file) {
                    if (_.isEqual(file["id"], workbook_id)) {
                        model.set(file);
                        model.fetch_payload();
                    }
                }, this);

                return this;
            },

            "__list_workbooks": function () {
                console.debug("views/workdesk:__list_workbooks");

                this.workdesk_model.childReferences().list({
                    "query": { "q": "mimeType='application/vnd.genespot.workbook'" },
                    "success": this.__render_workbooks
                });
            },

            "__render_workbooks": function() {
                var active_workbook_id = null;
                if (this.active_workbook && this.active_workbook.get("id")) {
                    active_workbook_id = this.active_workbook.get("id");
                }

                _.each(this.workdesk_model.childReferences().get("items"), function (item) {
                    var isActive = _.isEqual(active_workbook_id, item["id"]);

                    this.$(".workbooks-list").append(LineItemTpl({
                        "a_class": "select-workbook",
                        "id": item["id"],
                        "label": item["title"],
                        "title": item["title"],
                        "li_class": isActive ? "active" : ""
                    }));
                }, this);
            },

            "__load_genelist": function () {
                console.log("workdesk.__load_genelist");
                this.genelistControl = new GenelistControl({ "default_genelist": this.options.map_factory.get("default_genelist") });
                this.genelistControl.on("updated", function (current_list) {
                    this.active_workbook_model.set("genes", current_list);
                }, this);

                this.$(".genelist-container").html(this.genelistControl.render().el);
            }
        });
    });