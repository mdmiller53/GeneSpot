define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        var GDriveApiBackboneModel = Backbone.Model.extend({
            "driveApiBaseUrl": "svc/auth/providers/google_apis/drive/v2",
            "payload_mimeTypes": ["application/json", "application/vnd.genespot.workbook"],

            "initialize": function () {
                _.bindAll(this, "fetch", "payload", "get", "set", "__after_fetch");

                if (this.__is_kind("drive#file")) {
                    this.url = this.driveApiBaseUrl + "/files";
                }

                this.on("change:id", this.__init_url_by_kind, this);
                this.on("change:largestChangeId", this.__trigger_file_changes, this);
            },

            /*
             * These functions follow the semantics in https://developers.google.com/drive/v2/reference/
             * https://developers.google.com/drive/v2/reference
             * not implemented: Channels, Realtime, File.watch, Changes.watch (todo: integrate web sockets)
             * renamed: get -> drive_get (to avoid conflict with Backbone.Model.get)
             * added: fetch_payload, update_payload, find_insert, monitor
             */
            "copy": function (new_copy, options) {
                if (this.__is_kind("drive#file")) {
                    return $.ajax({
                        "method": "POST",
                        "data": new_copy,
                        "url": this.url + "/" + this.get("id") + "/copy",
                        "success": this.__success_handler(options),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "delete": function (options) {
                var url = this.url + "/" + this.get("id");
                return $.ajax({
                    "url": url,
                    "method": "DELETE",
                    "success": this.__success_handler(options),
                    "error": this.__error_handler(options)
                });
            },

            "drive_get": function (options) {
                if (this.__is_kind("drive#about")) {
                    return this.fetch(_.extend({}, options, { "url": this.url }));
                }

                if (this.__is_kind("drive#change")) {
                    var url = this.url + "?startChangeId=" + parseInt(this.get("largestChangeId")) + 1;
                    return this.fetch(_.extend({}, options, { "url": url }));
                }

                return this.fetch(_.extend({}, options, { "url": this.url + "/" + this.get("id") }));
            },

            "insert": function (options) {
                if (this.__is_kind("drive#file")) {
                    return Backbone.sync("create", this, {
                        "url": this.url,
                        "method": "POST",
                        "data": _.extend({ "uploadType": "media" }, options["arguments"]),
                        "traditional": true,
                        "success": this.__payload_handler(options),
                        "error": this.__error_handler(options)
                    });
                }

                if (this.__is_kind(["drive#permission", "drive#comment", "drive#commentReply"])) {
                    return Backbone.sync("create", this, {
                        "url": this.url,
                        "method": "POST",
                        "data": options["arguments"],
                        "traditional": true,
                        "success": this.__updating_handler(options),
                        "error": this.__error_handler(options)
                    });
                }

                if (this.__is_kind(["drive#childReference", "drive#parentReference", "drive#property"])) {
                    return Backbone.sync("create", this, {
                        "url": this.url,
                        "method": "POST",
                        "success": this.__updating_handler(options),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "list": function (options) {
                if (this.__is_kind(["drive#file", "drive#change", "drive#childReference", "drive#parentReference", "drive#permission"])) {
                    return $.ajax({
                        "url": this.url,
                        "method": "GET",
                        "data": _.extend({}, options["query"]),
                        "traditional": true,
                        "success": this.__list_handler(options),
                        "error": this.__error_handler(options)
                    });
                }

                if (this.__is_kind(["drive#revision", "drive#app", "drive#comment", "drive#commentReply", "drive#property"])) {
                    return $.ajax({
                        "url": this.url,
                        "method": "GET",
                        "success": this.__list_handler(options),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "patch": function (options) {
                var url = this.url + "/" + this.get("id");
                if (this.__is_kind("drive#permission")) {
                    url += "?transferOwnership=" + (options["transferOwnership"] || false);

                } else if (_.has(options, "visibility") && this.__is_kind("drive#property")) {
                    url += "?visibility=" + options["visibility"];

                } else if (this.__is_kind(["drive#file", "drive#revision", "drive#comment", "drive#commentReply"])) {
                    // other supported types
                } else {
                    return null;
                }

                return $.ajax({ "url": url, "method": "PATCH", "data": this.toJSON(),
                    "success": this.__updating_handler(options),
                    "error": this.__error_handler(options)
                });
            },

            "touch": function (options) {
                this.__simple_file_post(options, "touch");
            },

            "trash": function (options) {
                this.__simple_file_post(options, "trash");
            },

            "untrash": function (options) {
                this.__simple_file_post(options, "untrash");
            },

            "find_insert": function (uniqueness, options) {
                var listModel = new GDriveApiBackboneModel({ "kind": "drive#file" });
                listModel.list({
                    "success": function () {
                        var existing = _.findWhere(listModel.get("items"), _.extend({}, uniqueness));
                        if (existing && existing.get("id")) {
                            this.set(existing);
                            this.__success_handler(options)();
                        } else {
                            this.insert(options);
                        }
                    },
                    "context": this
                });
            },

            "update": function (options) {
                if (this.__is_kind("drive#file")) {
                    $.ajax({
                        "url": this.url + "?uploadType=media",
                        "method": "PUT",
                        "contentType": "application/json",
                        "dataType": "json",
                        "data": JSON.stringify(_.omit(this.toJSON(), "payload")),
                        "success": this.__payload_handler(options),
                        "error": this.__error_handler(options)
                    });
                    return null;
                }

                var url = this.url + "/" + this.get("id");
                if (this.__is_kind("drive#permission")) {
                    url += "?transferOwnership=" + (options["transferOwnership"] || false);

                } else if (_.has(options, "visibility") && this.__is_kind("drive#property")) {
                    url += "?visibility=" + options["visibility"];

                } else if (this.__is_kind(["drive#revision", "drive#comment", "drive#commentReply"])) {
                    // other supported basic types

                } else {
                    // do nothing for non-supported types
                    return null;
                }

                return $.ajax({ "url": url, "method": "PUT", "data": this.toJSON(),
                    "success": this.__updating_handler(options),
                    "error": this.__error_handler(options)
                });
            },

            /**
             * This function loads JSON contained within file contents into a Backbone.Model attribute
             *   >>> model.get("payload")["customProperty"]
             */
            "update_payload": function (options) {
                if (!this.__is_kind("drive#file")) return false;
                if (!_.contains(this.payload_mimeTypes, this.get("mimeType"))) return false;
                if (_.isEmpty(this.get("payload"))) return false;

                return $.ajax(_.extend({}, options, {
                    "url": this.url + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "success": this.__success_handler(options),
                    "error": this.__error_handler(options),
                    "data": JSON.stringify(this.get("payload"))
                }));
            },

            /*
             * This function downloads the internals of the file as JSON payload
             */
            "fetch_payload": function (options) {
                if (_.isEmpty(this.get("downloadUrl"))) return false;
                if (!_.contains(this.payload_mimeTypes, this.get("mimeType"))) return false;

                return $.ajax(_.extend({}, options, {
                    "url": "svc/auth/providers/google_download",
                    "data": {
                        "forwardUrl": this.get("downloadUrl")
                    },
                    "traditional": true,
                    "method": "GET",
                    "dataType": "json",
                    "success": function (json) {
                        // setting payload, now accessible by application
                        this.set("payload", json, {"silent": true});
                    },
                    "error": this.__error_handler(options),
                    "context": this
                }));
            },

            /**
             * Starts process of monitoring for changes
             */
            "monitor": function () {
                if (this.__is_kind("drive#change")) {
                    // checking the feed for changes
                    var getFn = this.get;
                    var fn = function () {
                        // execute then delay future execution
                        getFn();
                        _.delay(fn, 5000);
                    };
                    _.defer(fn); // initialize loop
                }
            },

            /*
             * Overrides Backbone fetch function
             */
            "fetch": function (options) {
                options = options || {};

                var successFn = function (json) {
                    this.__updating_handler(options)(json);
                    this.__after_fetch();
                };

                return Backbone.Model.prototype.fetch.call(this, _.extend({
                    "url": options["url"] || this.driveApiBaseUrl + "/files/" + (this.get("id") || options["id"]),
                    "contentType": "application/json",
                    "success": _.bind(this, successFn),
                    "error": this.__error_handler(options)
                }, options));
            },

            /*
             * These functions are internal to this model, and not meant to be accessed externally
             */
            "__after_fetch": function (options) {
                if (this.__is_kind("drive#file")) {
                    // initializes service models
                    this.parentReferences = new GDriveApiBackboneModel({ "fileId": this.get("id"), "kind": "#drive/parentReference" });
                    this.childReferences = new GDriveApiBackboneModel({ "fileId": this.get("id"), "kind": "#drive/childReference" });
                    this.permissions = new GDriveApiBackboneModel({ "fileId": this.get("id"), "kind": "#drive/permission" });
                    this.revisions = new GDriveApiBackboneModel({ "fileId": this.get("id"), "kind": "#drive/revision" });
                    this.comments = new GDriveApiBackboneModel({ "fileId": this.get("id"), "kind": "#drive/comments" });
                }

                this.trigger("load");
            },

            "__init_url_by_kind": function () {
                if (_.isEmpty(this.get("kind"))) return;

                var fId = this.get("fileId");

                if (kind === "drive#file") {
                    this.url = this.driveApiBaseUrl + "/files";

                } else if (kind === "drive#about") {
                    this.url = this.driveApiBaseUrl + "/about";

                } else if (kind === "drive#app") {
                    this.url = this.driveApiBaseUrl + "/apps";

                } else if (kind === "drive#change") {
                    this.url = this.driveApiBaseUrl + "/changes";

                } else if (kind === "drive#childReference") {
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/children";

                } else if (kind === "drive#parentReference") {
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/parents";

                } else if (kind === "drive#permission") {
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/permissions";

                } else if (kind === "drive#revision") {
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/revisions";

                } else if (kind === "drive#comment") {
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/comments";

                } else if (kind === "drive#commentReply") {
                    var cId = this.get("commentId");
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/comments/" + cId + "/replies";

                } else if (kind === "drive#property") {
                    this.url = this.driveApiBaseUrl + "/files/" + fId + "/properties";

                } else {
                    log.debug("GDriveApiBackboneModel:unknown kind:" + kind);
                }
            },

            "__trigger_file_changes": function () {
                if (this.__is_kind("drive#change")) {
                    _.each(this.get("items"), function (item) {
                        this.trigger("change", item["file"]);
                    }, this);
                }
            },

            "__is_kind": function (targetKind) {
                return _.contains(_.flatten([targetKind]), this.get("kind"));
            },

            "__simple_file_post": function (options, verb) {
                if (this.__is_kind("drive#file")) {
                    return $.ajax({
                        "method": "POST",
                        "url": this.url + "/" + this.get("id") + "/" + verb,
                        "success": this.__updating_handler(options),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "__payload_handler": function (options) {
                var payloadFn = _.bind(this, function(json) {
                    if (this.update_payload(options)) {
                        this.set(json);
                    }
                });
                var successFn = this.__success_handler(options);
                return function (json) {
                    _.defer(payloadFn, json);
                    _.defer(successFn);
                };
            },

            "__list_handler": function (options) {
                var listedFn = _.bind(this, function(json) {
                    if (_.has(json, "items")) {
                        this.listed = _.map(json["items"], function (item) {
                            return new GDriveApiBackboneModel(item);
                        });
                    }
                });
                var successFn = this.__success_handler(options);
                return function (json) {
                    _.defer(listedFn, json);
                    _.defer(successFn);
                };
            },

            "__updating_handler": function (options) {
                var updateFn = this.set;
                var successFn = this.__success_handler(options);
                return function (json) {
                    _.defer(updateFn, json);
                    _.defer(successFn);
                };
            },

            "__success_handler": function (options) {
                if (_.isFunction(options["success"])) {
                    var callbackFn = options["success"];
                    if (_.isObject(options["context"])) _.bind(options["context"], callbackFn);
                    return callbackFn;
                }
                return function () {
                };
            },

            "__error_handler": function (options) {
                if (_.isFunction(options["error"])) return options["error"];
                return function () {
                };
            }
        });
        return GDriveApiBackboneModel;
    });