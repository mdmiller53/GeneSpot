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
                        this.active_workbook.insert({
                            "success": function () {
                                WebApp.Router.navigate("wb/" + this.active_workbook.get("id"));
                            },
                            "context": this
                        });
                    }
                }
            },

            "initialize": function () {
                _.bindAll(this, "render");

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
                model.drive_get({
                    "success": function () {
                        this.$(".container.workbook").html(this.active_workbook.render().el);
                    },
                    "error": function () {
                        this.$(".alert.workbook-not-found").show();
                    },
                    "context": this
                });

                this.changes_model.on("change", function (file) {
                    if (_.isEqual(file["id"], workbook_id)) {
                        model.set(file);
                        model.fetch_payload();
                    }
                }, this);

                return this;
            },

            "__list_workbooks": function () {
                this.workdesk_model.childReferences.list({
                    "query": { "q": "mimeType='application/vnd.genespot.workbook'" },
                    "success": function () {
                        var active_workbook_id = null;
                        if (this.active_workbook && this.active_workbook.get("id")) {
                            active_workbook_id = this.active_workbook.get("id");
                        }

                        _.each(this.workdesk_model.childReferences.listed, function (model) {
                            var isActive = _.isEqual(active_workbook_id, model.get("id"));

                            this.$(".workbooks-list").append(LineItemTpl({
                                "a_class": "select-workbook",
                                "id": model.get("id"),
                                "label": model.get("title"),
                                "title": model.get("title"),
                                "li_class": isActive ? "active" : ""
                            }));
                        }, this);
                    },
                    "context": this
                });
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