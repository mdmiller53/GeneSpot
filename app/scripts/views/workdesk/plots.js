define(["jquery", "underscore", "backbone",
        "hbs!templates/workdesk/plot_list"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            "initialize": function() {
                this.model = this.options.model;
                this.model.on("change", this.render, this);
            },

            "render": function() {
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            }
        })
    });