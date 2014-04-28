define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/worktabs", "hbs!templates/workbooks/bookinfo"],
    function ($, _, Backbone, WorkTabsTpl, BookInfoTpl) {
        return Backbone.View.extend({
            "events": {
                "click a.select-worktab": function(e) {
                    var tab_id = $(e.target).data("id");
                    var payload = this.model.get("payload");
                    _.each(payload["worktabs"], function(tab) {
                        tab["active"] = _.isEqual(tab["id"], tab_id);
                    }, this);
                    this.model.update_payload();
                },
                "click a.append-body": function(e) {
                    console.log("append-body=" + $(e.target).data("id"));
                    this.model.set("payload", {
                        "worktabs": [
                            {"id": "1", "label": "Title 1"},
                            {"id": "2", "label": "Title 2"},
                            {"id": "3", "label": "Title 3"}
                        ]
                    });
                }
            },

            "initialize": function () {
                this.model = this.options.model;
                this.model.on("load", this.model.fetch_payload, this.model);
                this.model.on("change", this.__render_bookinfo, this);
                this.model.on("change:payload", this.__render_worktabs, this);
            },

            "render": function() {
                this.__render_bookinfo();
                this.__render_worktabs();
                return this;
            },

            "__render_bookinfo": function() {
                this.$(".bookinfo").html(BookInfoTpl(_.omit(this.model.toJSON(), "payload")));
            },

            "__render_worktabs": function() {
                this.$(".worktabs").html(WorkTabsTpl(this.model.get("payload")));
            }
        });
    });
