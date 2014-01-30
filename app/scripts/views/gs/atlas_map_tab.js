define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone ) {
        return Backbone.View.extend({
            initialize: function(options) {
                _.extend(this, options);

                this["view"] = this["view"] || this["id"];
            }
        });
    });