define(["jquery", "underscore", "backbone", "hbs!templates/workbooks/tab", "hbs!templates/workbooks/content"],
    function ($, _, Backbone, TabTpl, TabContentTpl) {
        return Backbone.View.extend({
            "initialize": function () {
                this.options.model.on("load", this.__render, this);
            },

            render: function () {
                this.$(".nav-tabs").append(TabTpl({ "items": [] }));
                this.$(".tab-content").append(TabContentTpl({ "items": [] }));
                return this;
            },

            __render: function () {
                console.debug("workbooks/contents.__render");
                this.$(".nav-tabs").append(TabTpl(this.options.model.toJSON()));
                this.$(".tab-content").append(TabContentTpl(this.options.model.toJSON()));
            }
        });
    });
