define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.View.extend({
            initialize: function() {
                _.bindAll(this, "render");
            },

            render: function() {
                if (_.isFunction(this.options.callback)) this.options.callback(this.model.get("welcomes"));
                return this;
            }
        });
    });
