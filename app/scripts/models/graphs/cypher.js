define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function () {
                console.debug("models/graphs/cypher.initialize");
            },

            fetch: function (options) {
                console.debug("models/graphs/cypher.fetch");
                return Backbone.Model.prototype.fetch.call(this, _.extend({}, options));
            }
        });
    });