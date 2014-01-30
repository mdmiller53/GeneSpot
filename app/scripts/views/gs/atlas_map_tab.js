define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone ) {
        return Backbone.View.extend({
            "uid": Math.round(Math.random() * 10000),

            initialize: function(options) {
                _.extend(this, options);

                this["view"] = this["view"] || this["id"];
            }
        });
    });