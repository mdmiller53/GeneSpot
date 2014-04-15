define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/workdesk", "hbs!templates/line_item",
        "models/workbooks/drive_api", "views/workbooks/workbook",
        "views/genes/control", "views/clinvarlist/control", "views/datamodel_collector/control"
    ],
    function ($, _, Backbone, Tpl, LineItemTpl, DriveApiModel, WorkbookView, GenelistControl, ClinicalListControl, DatamodelControl) {
        return Backbone.View.extend({
            "events": {
                "click a.select-workbook": function (e) {
                    WebApp.Router.navigate("wb/" + $(e.target).data("id"));
                },
                "click a.create-workbook": "__create_workbook"
            },

            "initialize": function () {
                this.__load_workdesk();
            },

            "render": function () {
                this.$el.html(Tpl({}));
                return this;
            },

            "__load_workdesk": function () {
                var files = new DriveApiModel();
                files.on("load", function () {
                    var folderInfo = _.findWhere(files.get("items"), { "title": "GeneSpot Workdesk" });
                    if (folderInfo) {
                        console.debug("views/workbooks/workdesk.__load_workdesk:existing:" + folderInfo["id"]);
                        this.model = new DriveApiModel(folderInfo);
                        this.model.fetch({
                            "url": "svc/auth/providers/google_apis/drive/v2/files/" + this.model.get("id") + "/children"
                        });
                        this.model.on("load", this.__render_workbooks, this);
                    } else {
                        console.debug("views/workbooks/workdesk.__load_workdesk:create");
                        this.model = new DriveApiModel({
                            "title": "GeneSpot Workdesk",
                            "parents": [
                                {"id": "root"}
                            ],
                            "mimeType": "application/vnd.google-apps.folder"
                        });
                        this.model.on("saved", this.__render_workbooks, this);
                        this.model.save();
                    }
                }, this);
                files.fetch({ "url": "svc/auth/providers/google_apis/drive/v2/files" });
            },

            "__render_workbooks": function () {
                _.each(this.model.get("items"), function (item) {
                    var wbModel = new DriveApiModel(item);
                    var wbView = new WorkbookView({
                        "model": wbModel,
                        "el": this.$(".workbook")
                    });

                    var isActive = _.isEqual(this.options.active_workbook_id, wbModel.get("id"));

                    wbModel.on("load", function() {
                        this.$(".workbooks-list").append(LineItemTpl({
                            "a_class": "select-workbook",
                            "id": wbModel.get("id"),
                            "label": wbModel.get("title"),
                            "title": wbModel.get("title"),
                            "li_class": isActive ? "active" : ""
                        }));

                        if (isActive) wbView.render();
                    }, this);
                    wbModel.fetch();
                }, this);
            },

            "__create_workbook": function() {
                var new_workbook = new DriveApiModel({
                    "title": "Untitled Workbook",
                    "parents": [
                        {
                            "id": this.model.get("id"),
                            "kind": "drive#fileLink"
                        }
                    ],
                    "mimeType": "application/vnd.genespot.workbook"
                });
                new_workbook.save();
                new_workbook.on("saved", this.model.fetch, this);
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