define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "fetch", "save", "__after_fetch", "__after_saved");

                this.on({
                    "change:title": this.__save_filemeta,
                    "change:description": this.__save_filemeta,
                    "change:payload": this.__save_payload,
                    "load": this.__load_payload
                }, this);
            },

            fetch: function (options) {
                options = options || {};

                var id = this.get("id") || options["id"];
                var local_overrides = {
                    "contentType": "application/json",
                    "success": this.__after_fetch,
                    "url": options["url"] || "svc/auth/providers/google_apis/drive/v2/files/" + id
                };
                if (_.isFunction(options["success"])) {
                    local_overrides["success"] = _.wrap(options["success"], this.__after_fetch);
                }
                return Backbone.Model.prototype.fetch.call(this, _.extend({}, options, local_overrides));
            },

            save: function () {
                if (_.isEmpty(this.get("id"))) {
                    return Backbone.sync("create", this, {
                        "url": "svc/auth/providers/google_apis/drive/v2/files?uploadType=media",
                        "method": "POST",
                        "success": this.__after_saved
                    });
                }

                var successFn = _.after(2, this.__after_saved);
                _.defer(this.__save_filemeta, { "success": successFn });
                _.defer(this.__save_payload, { "success": successFn });
            },

            __after_fetch: function (callbackFn) {
                this.trigger("load");
                if (_.isFunction(callbackFn)) callbackFn();
            },

            __after_saved: function(callbackFn) {
                this.trigger("saved");
                if (_.isFunction(callbackFn)) callbackFn();
            },

            __load_payload: function (options) {
                if (_.isEmpty(this.get("downloadUrl"))) return;

                $.ajax(_.extend({}, options, {
                    "url": "svc/auth/providers/google_download",
                    "data": {
                        "forwardUrl": this.get("downloadUrl")
                    },
                    "traditional": true,
                    "method": "GET",
                    "dataType": "json",
                    "success": function (json) {
                        this.set("payload", json, {"silent": true});
                        this.trigger("load:payload");
                    },
                    "context": this
                }));
            },

            __save_filemeta: function (options) {
                return $.ajax(_.extend({}, options, {
                    "url": "svc/auth/providers/google_apis/drive/v2/files/" + this.get("id") + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(_.omit(this.toJSON(), "payload"))
                }));
            },

            __save_payload: function (options) {
                if (_.isEmpty(this.get("payload"))) return;

                return $.ajax(_.extend({}, options, {
                    "url": "svc/auth/providers/google_apis/upload/drive/v2/files/" + this.get("id") + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(this.get("payload"))
                }));
            }
        });
    });