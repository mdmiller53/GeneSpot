define([
    "jquery", "underscore", "backbone",
    "models/workbooks/workbook",
    "hbs!templates/workdesks/container",
    "views/genes/control",
    "views/clinvarlist/control",
    "views/datamodel_collector/control",
    "views/workbooks/control", "views/workbooks/contents"
],
    function ($, _, Backbone, WorkbookModel, Tpl,
              GenelistControl, ClinicalListControl, DatamodelControl, WorkbooksControl, WorkbookContentsView) {
        return Backbone.View.extend({
            "initialize": function() {
                this.options.active_workbook.on("load", this.__load_active_workbook, this);

                this.workbooksControl = new WorkbooksControl({ "active_workbook": this.options.active_workbook });

                this.options.map_factory.on("load", this.__load_genelist, this);
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
                var view = new WorkbookContentsView({ "model": model, "el": ".worktabs" });
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