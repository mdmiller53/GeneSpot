define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/worktabs", "hbs!templates/workbooks/bookinfo"],
    function ($, _, Backbone, Tpl, BookInfoTpl) {
        return Backbone.View.extend({
            "initialize": function () {
                this.model = this.options.model;
                this.model.on("load", function() {
                    this.$(".bookinfo").html(BookInfoTpl(this.model.toJSON()));
                }, this);
                this.model.on("load:payload", function() {
                    this.$(".worktabs").html(Tpl(this.model.get("payload")));
                }, this);
            },

            "events": {
                "click a.select-worktab": function(e) {
                    var activated_tab = this.workbook_tabs[$(e.target).data("id")];
                    _.defer(activated_tab.render);

                    if (this.previous_tab) _.defer(this.previous_tab.shadow);
                    this.previous_tab = activated_tab;
                },
                "shown a[data-toggle='tab']": function(e) {
                    console.log("shown data-toggle");
                    var activated_tab = this.workbook_tabs[$(e.target).data("id")];
                    _.defer(activated_tab.render);

                    if (e.relatedTarget) {
                        var previous_tab = this.workbook_tabs[$(e.relatedTarget).data("id")];
                        if (previous_tab && previous_tab.shadow) _.defer(previous_tab.shadow);
                    }
                },
                "click a.append-body": function(e) {
                    console.log("append-body=" + $(e.target).data("id"));
                    this.model.set("payload", {
                        "items": [
                            {"id": "1", "label": "Title 1"},
                            {"id": "2", "label": "Title 2"},
                            {"id": "3", "label": "Title 3"}
                        ]
                    });
                }
            },

            "shadow": function() {
//                this.shadow_DOM = this.$el.html();
//                this.$el.html("Shadowed");
                return this;
            }
        });
    });
