define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/tab", "hbs!templates/workbooks/pane", "hbs!templates/workbooks/content"],
    function ($, _, Backbone, TabTpl, TabPaneTpl, TabContentTpl) {
        return Backbone.View.extend({
            "initialize": function () {
                this.model = this.options.model;
                this.model.on("load", this.__load_tab, this);
            },

            render: function () {
                if (!_isEmpty(this.shadow_DOM)) {
                    this.$el.html(this.shadow_DOM);
                    return this;
                }

                this.$("#workbook-tab-" + this.model.get("id")).html(TabContentTpl(this.model.toJSON()));
                return this;
            },

            shadow: function() {
                this.shadow_DOM = this.$el.html();
                this.$el.html("Shadowed");
                return this;
            },

            __load_tab: function() {
                this.$(".nav-tabs").append(TabTpl(this.model.toJSON()));
                this.$(".nav-content").append(TabPaneTpl((this.model.toJSON())));
            }
        });
    });
