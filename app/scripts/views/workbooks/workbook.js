define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/workbook"],
    function ($, _, Backbone, Tpl, TabTpl) {
        return Backbone.View.extend({
            "initialize": function () {
                this.model = this.options.model;
                this.model.on("load", function() {}, this);
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
                }
            },

            "render": function () {
//                if (!_isEmpty(this.shadow_DOM)) {
//                    this.$el.html(this.shadow_DOM);
//                    return this;
//                }

//                this.$(".worktabs").html(Tpl());
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "shadow": function() {
//                this.shadow_DOM = this.$el.html();
//                this.$el.html("Shadowed");
                return this;
            }
        });
    });
