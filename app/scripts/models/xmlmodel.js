define(["jquery", "underscore", "backbone", "xml2json"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            "x2js": new X2JS({ "escapeMode": false }),

            parse: function (data) {
                return this.x2js.xml2json(data);
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend({ "dataType": "xml" }, options));
            },

            save: function(options) {
                console.log("xmlmodel.save");
                return $.ajax(_.extend({
                    "url": this.url,
                    "method": "POST",
                    "contentType": "application/atom+xml",
                    "dataType": "xml",
                    "data": this.x2js.json2xml_str(this.toJSON())
                }, options || {}));
            }
        });

    });