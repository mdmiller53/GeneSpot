define(["jquery", "underscore", "backbone", "backbone_gdrive",
        "hbs!templates/workbooks/workdesk", "hbs!templates/line_item"],
    function ($, _, Backbone, BackboneGDrive, Tpl, LineItemTpl) {
        return Backbone.View.extend({
            "events": {
                "click a.open-workbook": function (e) {
                    var workbook_id = $(e.target).data("id");
                    if (workbook_id) WebApp.Router.navigate("#wb/" + workbook_id, { "trigger": true });
                },
                "click a.new-workbook": function () {
                    WebApp.Router.navigate("#wb/new", { "trigger": true });
                }
            },

            "initialize": function () {
                this.model = this.options.model;
                this.folder = this.model.childReferences();

                this.model.on("change", this.folder.list, this.folder);
                this.folder.on("change:items", this.__render_workbooks, this);
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
                        var keywords = _.flatten([title, model.get("description"), model.get("keywords")]);
                        WebApp.Search.add_callback("Workbooks", title, keywords, function () {
                            WebApp.Router.navigate("#wb/" + id, { "trigger": true });
                        });

                        $wblEl.append(LineItemTpl({ "a_class": "open-workbook", "id": id, "label": title, "title": title }));
                    }, this);
                    _.defer(model.fetch);
                }, this);
            }
        });
    });