define(["jquery", "underscore", "backbone", "xml2json"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            "x2js": new X2JS(),

            parse: function (data) {
                return this.x2js.xml2json(data);
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend({ "dataType": "xml" }, options));
            }
        });

    });