define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/workbook", "hbs!templates/workbooks/worktabs", "hbs!templates/workbooks/bookinfo"],
    function ($, _, Backbone, Tpl, WorkTabsTpl, BookInfoTpl) {
        return Backbone.View.extend({
            "events": {
                "click a.select-worktab": function (e) {
                    var tab_id = $(e.target).data("id");
                    var payload = this.model.get("payload");
                    _.each(payload["worktabs"], function (tab) {
                        tab["active"] = _.isEqual(tab["id"], tab_id);
                    }, this);
                    this.set("payload", payload);
                },
                "click a.append-body": function (e) {
                    console.log("append-body=" + $(e.target).data("id"));
                    this.model.set("payload", {
                        "worktabs": [
                            {"id": "1", "label": "Title 1"},
                            {"id": "2", "label": "Title 2"},
                            {"id": "3", "label": "Title 3"}
                        ]
                    });
                },
                "click a.save-workbook": function () {
                    if (this.get("id")) {
                        _.defer(this.update);
                    } else {
                        this.once("inserted", function() {
                            WebApp.Router.navigate("#wb/" + this.get("id"), { "trigger": true });
                        }, this);
                        _.defer(this.insert);
                    }
                },
                "click a.open-workbook": function(e) {
                    var workbook_id = $(e.target).data("id");
                    if (workbook_id) WebApp.Router.navigate("#wb/" + workbook_id, { "trigger": true });
                }
            },

            "initialize": function () {
                this.model = this.options.model;
                this.model.on("change", this.__render_bookinfo, this);
                this.model.on("change:payload", this.__render_worktabs, this);
            },

            "render": function () {
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "__render_bookinfo": function () {
                this.$(".bookinfo").html(BookInfoTpl(_.omit(this.model.toJSON(), "payload")));
            },

            "__render_worktabs": function () {
                this.$(".worktabs").html(WorkTabsTpl(this.model.get("payload") || {}));
            },

            "__load_genelist": function () {
                console.log("views/workbook.__load_genelist");
                this.genelistControl = new GenelistControl({ "default_genelist": this.options.map_factory.get("default_genelist") });
                this.genelistControl.on("updated", function (current_list) {
                    this.set("genes", current_list);
                }, this);

                this.$(".genelist-container").html(this.genelistControl.render().el);
            }
        });
    });
