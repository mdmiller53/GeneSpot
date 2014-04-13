define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function(attributes, options) {
                this.options = options;
                this.set(attributes);
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend({}, options));
            },

            save: function(options) {
                console.log("workbook.save");
                var workbookId = this.options["workbookId"];
                return $.ajax(_.extend({
                    "url": "svc/auth/providers/google_apis/upload/drive/v2/files/" + workbookId + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(this.toJSON())
                }, options || {}));
            }
        });
    });