define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/workdesk", "hbs!templates/line_item"],
    function ($, _, Backbone, Tpl, LineItemTpl) {
        return Backbone.View.extend({
            "events": {
                "click a.open-workbook": function (e) {
                    var workbook_id = $(e.target).data("id");
                    if (workbook_id) WebApp.Router.navigate("#wb/" + workbook_id, { "trigger": true });
                },
                "click a.new-workbook": function () {
                    WebApp.Router.navigate("#wd/" + this.model.get("id") + "/new", { "trigger": true });
                }
            },

            "initialize": function () {
                _.bindAll(this, "__render_workbooks");

                this.model = this.options.model;
                this.model.on("load", this.__list_workbooks, this);
            },

            "render": function () {
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "__list_workbooks": function () {
                console.debug("views/workdesk:__list_workbooks");

                this.model.childReferences().list({
                    "query": { "q": "mimeType='application/vnd.genespot.workbook'" },
                    "success": this.__render_workbooks
                });
            },

            "__render_workbooks": function () {
                _.each(this.model.childReferences().get("items"), function (item) {
                    this.$(".workbooks-list").append(LineItemTpl({
                        "a_class": "open-workbook",
                        "id": item["id"],
                        "label": item["title"],
                        "title": item["title"]
                    }));
                }, this);
            }
        });
    });