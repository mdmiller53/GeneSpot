define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/workdesk", "hbs!templates/line_item",
        "models/workbooks/workbook",
        "views/workbooks/control", "views/workbooks/workbook",
        "views/genes/control", "views/clinvarlist/control", "views/datamodel_collector/control"
],
    function ($, _, Backbone, Tpl, LineItemTpl,
              WorkbookModel, WorkbooksControl, WorkbookView,
              GenelistControl, ClinicalListControl, DatamodelControl) {
        return Backbone.View.extend({
            "initialize": function() {
                _.bindAll(this, "__initialize_workdesk");
//                this.options.active_workbook.on("load", this.__load_active_workbook, this);

                this.workbooksControl = new WorkbooksControl({ "active_workbook_id": this.options.active_workbook_id });

//                this.options.map_factory.on("load", this.__load_genelist, this);

                this.workdesk = new Backbone.Model(
                    {
                        "title": "GeneSpot Workdesk",
                        "parents": [ {"id": "root"} ],
                        "mimeType": "application/vnd.google-apps.folder"
                    },
                    {
                        "url": "svc/auth/providers/google_apis/drive/v2/files"
                    }
                );
                this.workdesk.on("load", this.__render, this);
                this.workdesk.fetch({ "success": function(m) { m.trigger("load"); }, "error": this.__initialize_workdesk });
            },

            "events": {
                "click a.select-workbook": function(e) {
                    WebApp.Router.navigate("wb/" + $(e.target).data("id"));
                }
            },

            "__initialize_workdesk": function(e, o) {
                console.debug("views/workbooks/workdesk.__initialize_workdesk");
//                this.workdesk.save();
            },

            "__render": function() {
                var genespot_workbooks = _.where(this.workdesk.get("items"), { "mimeType": "application/vnd.genespot.workbook" });
                var tpls = _.map(genespot_workbooks, function(item) {
                    var wbModel = new WorkbookModel({}, { "workbookId": item["id"] });
                    wbModel.on("change", wbModel.save, wbModel);

                    var wbView = new WorkbookView({
                        "model": wbModel,
                        "el": this.$(".workbook").el
                    });
                    wbModel.fetch({
                        "url": "svc/auth/providers/google_download?forwardUrl=" + this["downloadUrl"],
                        "contentType": "application/json",
                        "success": function() {
                            wbModel.trigger("load");
                        }
                    });

                    var isActive = _.isEqual(this.options.active_workbook_id, item["id"]);
                    return {
                        "a_class": "select-workbook",
                        "id": item["id"],
                        "label": item["title"],
                        "title": item["title"],
                        "li_class": isActive ? "active": "",
                        "isActive": isActive,
                        "view": wbView
                    };
                }, this);

                var active_workbook;
                _.each(tpls, function(tpl) {
                    this.$(".workbooks-list").append(LineItemTpl(tpl));
                    if (tpl["isActive"]) view = tpl["view"];
                }, this);
                if (active_workbook) _.defer(active_workbook.render); // TODO: race condition?
            },

            "render": function() {
                this.$el.html(Tpl({}));
                this.$("#tab-workbooks").html(this.workbooksControl.render().el);
                return this;
            },

            "__load_genelist": function() {
                console.log("workdesk.__load_genelist");
                this.genelistControl = new GenelistControl({ "default_genelist": this.options.map_factory.get("default_genelist") });
                this.genelistControl.on("updated", function (current_list) {
                    this.active_workbook_model.set("genes", current_list);
                }, this);

                this.$(".genelist-container").html(this.genelistControl.render().el);
            },

            "__load_active_workbook": function() {
                console.log("__load_active_workbook");

                var model = new WorkbookModel({}, { "workbookId": this.options.active_workbook.get("id") });
                model.on("change", function() {
                    model.save();
                });
                model.on("load", function() {
                    console.log("workbookmodel.load");
                });
                var view = new WorkbookView({ "model": model, "el": ".worktabs" });
                model.fetch({
                    "url": "svc/auth/providers/google_download",
                    "data": {
                        "forwardUrl": this.options.active_workbook.get("downloadUrl")
                    },
                    "contentType": "application/json",
                    "success": function() {
                        model.trigger("load");
                    }
                });
                this.active_workbook_model = model;
                if (_.isEmpty(this.active_workbook_model.get("items"))) {
                    this.active_workbook_model.set("items", [ {"id":"firstOne","title": "First One"}]);
                }
                view.render();
            }
        });
    });