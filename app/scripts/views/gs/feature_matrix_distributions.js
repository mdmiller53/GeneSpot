define(["jquery", "underscore", "backbone", "hbs!templates/gs/scatterplot"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            initialize: function (options) {
                var _id = Math.round(Math.random() * 100000);
                this.$el.html(Tpl({"id":_id }));

                _.each(this.options.models.source, function(model, tumor_type) {
                    console.log("waiting for model for " + tumor_type)
                }, this);
            }
        });
    });
