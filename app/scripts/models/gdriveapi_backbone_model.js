define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        var GDriveApiBackboneModel = Backbone.Model.extend({
            "driveApiBaseUrl": "svc/auth/providers/google_apis/drive/v2",
            "payload_mimeTypes": ["application/json", "application/vnd.genespot.workbook"],

            "initialize": function () {
                _.bindAll(this, "fetch", "fetch_payload", "__after_fetch");
                _.bindAll(this, "get", "set");
                _.bindAll(this, "__local_set", "__local_rm");

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
                _.defer(this.__local_rm, this.url() + "/" + this.get("id"));

                if (this.__is_kind("drive#file")) {
                    return $.ajax({
                        "method": "POST",
                        "data": new_copy,
                        "dataType": "json",
                        "url": this.url() + "/" + this.get("id") + "/copy",
                        "success": this.__success_handler(options),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "delete": function (options) {
                var url = this.url() + "/" + this.get("id");
                _.defer(this.__local_rm, url);
                return $.ajax({
                    "url": url,
                    "dataType": "json",
                    "method": "DELETE",
                    "success": this.__success_handler(options),
                    "error": this.__error_handler(options)
                });
            },

            "drive_get": function (options) {
                if (this.__is_kind("drive#change")) {
                    return this.fetch(_.extend({}, options, {
                        "url": this.url() + "?startChangeId=" + (parseInt(this.get("largestChangeId")) + 1)
                    }));
                }

                var url = this.url();
                if (!this.__is_kind("drive#about")) url += "/" + this.get("id");
                if (this.__local_load(url)) {
                    _.defer(this.__after_fetch);
                    return this.__success_handler(options)();
                }

                return this.fetch(_.extend({ "url": url }, options));
            },

            "insert": function (options) {
                if (this.__is_kind("drive#file")) {
                    return Backbone.sync("create", this, {
                        "url": this.url(),
                        "method": "POST",
                        "data": _.extend({ "uploadType": "media" }, options["arguments"]),
                        "traditional": true,
                        "success": this.__payload_handler(options),
                        "error": this.__error_handler(options)
                    });
                }

                if (this.__is_kind(["drive#permission", "drive#comment", "drive#commentReply"])) {
                    return Backbone.sync("create", this, {
                        "url": this.url(),
                        "method": "POST",
                        "data": options["arguments"],
                        "traditional": true,
                        "success": this.__updating_handler(options, this.url()),
                        "error": this.__error_handler(options)
                    });
                }

                if (this.__is_kind(["drive#childReference", "drive#parentReference", "drive#property"])) {
                    return Backbone.sync("create", this, {
                        "url": this.url(),
                        "method": "POST",
                        "success": this.__updating_handler(options, this.url()),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "list": function (options) {
                if (this.__local_load()) {
                    return this.__success_handler(options)();
                }

                if (this.__is_kind(["drive#file", "drive#change", "drive#childReference", "drive#parentReference", "drive#permission"])) {
                    return $.ajax({
                        "url": this.url(),
                        "method": "GET",
                        "data": _.extend({}, options["query"]),
                        "dataType": "json",
                        "traditional": true,
                        "success": this.__list_handler(options),
                        "error": this.__error_handler(options)
                    });
                }

                if (this.__is_kind(["drive#revision", "drive#app", "drive#comment", "drive#commentReply", "drive#property"])) {
                    return $.ajax({
                        "url": this.url(),
                        "method": "GET",
                        "dataType": "json",
                        "success": this.__list_handler(options),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "patch": function (options) {
                var url = this.url() + "/" + this.get("id");
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
                    "dataType": "json",
                    "success": this.__updating_handler(options, url),
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
                var successFn = _.bind(function () {
                    if (_.isEmpty(listModel.get("items"))) return;
                    var existing = _.findWhere(listModel.get("items"), _.extend({}, uniqueness));
                    if (existing && _.has(existing, "id")) {
                        this.set(existing);
                        this.__success_handler(options)();
                    } else {
                        this.insert(options);
                    }
                }, this);
                listModel.list({ "success": successFn });
            },

            "update": function (options) {
                if (this.__is_kind("drive#file")) {
                    $.ajax({
                        "url": this.url() + "?uploadType=media",
                        "method": "PUT",
                        "contentType": "application/json",
                        "dataType": "json",
                        "data": JSON.stringify(_.omit(this.toJSON(), "payload")),
                        "success": this.__payload_handler(options),
                        "error": this.__error_handler(options)
                    });
                    return null;
                }

                var url = this.url() + "/" + this.get("id");
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

                return $.ajax({ "url": url, "method": "PUT", "data": this.toJSON(), "dataType": "json",
                    "success": this.__updating_handler(options, url),
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
                    "url": this.url() + "?uploadType=media",
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

                var successFn = _.bind(function(json) {
                    // setting payload, now accessible by application
                    this.set("payload", json, {"silent": true});
                }, this);

                return $.ajax(_.extend({}, options, {
                    "url": "svc/auth/providers/google_download",
                    "data": {
                        "forwardUrl": this.get("downloadUrl")
                    },
                    "traditional": true,
                    "method": "GET",
                    "dataType": "json",
                    "success": successFn,
                    "error": this.__error_handler(options)
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

                var url = options["url"] || this.driveApiBaseUrl + "/files/" + (this.get("id") || options["id"]);
                var successFn = function (json) {
                    this.__updating_handler(options, url)(json);
                    this.__after_fetch();
                };

                return Backbone.Model.prototype.fetch.call(this, _.extend({
                    "url": url,
                    "contentType": "application/json",
                    "success": _.bind(successFn, this),
                    "error": this.__error_handler(options)
                }, options));
            },

            "url": function () {
                if (_.isEmpty(this.get("kind"))) return;

                var kind = this.get("kind");
                var fId = this.get("fileId");

                if (kind === "drive#file") {
                    return this.driveApiBaseUrl + "/files";

                } else if (kind === "drive#about") {
                    return this.driveApiBaseUrl + "/about";

                } else if (kind === "drive#app") {
                    return this.driveApiBaseUrl + "/apps";

                } else if (kind === "drive#change") {
                    return this.driveApiBaseUrl + "/changes";

                } else if (kind === "drive#childReference") {
                    return this.driveApiBaseUrl + "/files/" + fId + "/children";

                } else if (kind === "drive#parentReference") {
                    return this.driveApiBaseUrl + "/files/" + fId + "/parents";

                } else if (kind === "drive#permission") {
                    return this.driveApiBaseUrl + "/files/" + fId + "/permissions";

                } else if (kind === "drive#revision") {
                    return this.driveApiBaseUrl + "/files/" + fId + "/revisions";

                } else if (kind === "drive#comment") {
                    return this.driveApiBaseUrl + "/files/" + fId + "/comments";

                } else if (kind === "drive#commentReply") {
                    var cId = this.get("commentId");
                    return this.driveApiBaseUrl + "/files/" + fId + "/comments/" + cId + "/replies";

                } else if (kind === "drive#property") {
                    return this.driveApiBaseUrl + "/files/" + fId + "/properties";
                }
                return this.driveApiBaseUrl + "/files";
            },

            /*
             * These functions return fully-fledged models for the sub-references of a file (children, parent, permissions, etc)
             * only apply to files
             * only work after file is loaded, "id" is assigned
             */
            "childReferences": function() {
                return this.__lookup_file_references("#drive/childReference");
            },

            "parentReferences": function() {
                return this.__lookup_file_references("#drive/parentReference");
            },

            "permissions": function() {
                return this.__lookup_file_references("#drive/permission");
            },

            "revisions": function() {
                return this.__lookup_file_references("#drive/revision");
            },

            "comments": function() {
                return this.__lookup_file_references("#drive/comments");
            },

            /*
             * These functions are internal to this model, and not meant to be accessed externally
             */
            "__after_fetch": function () {
                _.defer(this.__local_set, this.url(), this.toJSON());
                this.trigger("load");
            },

            "file_references": {},
            "__lookup_file_references": function(kind) {
                if (this.__is_kind(["drive#file"]) && !_.isEmpty(this.get("id"))) {
                    var model = this.file_references[kind];
                    if (!model) {
                        model = new GDriveApiBackboneModel({ "fileId": this.get("id"), "kind": kind });
                        this.file_references[kind] = model;
                    }
                    return model;
                }
                return null;
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
                var url = this.url() + "/" + this.get("id");
                _.defer(this.__local_rm, url);

                if (this.__is_kind("drive#file")) {
                    return $.ajax({
                        "method": "POST",
                        "url": url + "/" + verb,
                        "dataType": "json",
                        "success": this.__updating_handler(options, url),
                        "error": this.__error_handler(options)
                    });
                }
            },

            "__payload_handler": function (options) {
                options = options || {};

                var payloadFn = _.bind(function (json) {
                    if (this.update_payload(options)) {
                        this.set(json);
                    }
                }, this);
                var successFn = this.__success_handler(options);
                return function (json) {
                    _.defer(payloadFn, json);
                    _.defer(successFn);
                };
            },

            "__list_handler": function (options) {
                options = options || {};

                var _this = this;
                var url = _this.url();
                var successFn = this.__success_handler(options);

                return function (json) {
                    _this.set(json);
                    _this.__local_set(url, json);
                    _.defer(successFn, json);
                };
            },

            "__updating_handler": function (options, url) {
                options = options || {};
                url = url || this.url();

                var updateFn = this.set;
                var updateLocalFn = this.__local_set;
                var successFn = this.__success_handler(options);
                return function (json) {
                    _.defer(updateFn, json);
                    _.defer(updateLocalFn, url, json);
                    _.defer(successFn);
                };
            },

            "__success_handler": function (options) {
                options = options || {};
                if (_.isFunction(options["success"])) {
                    return options["success"];
                }
                return function () {};
            },

            "__error_handler": function (options) {
                options = options || {};
                if (_.isFunction(options["error"])) return options["error"];
                return function () {
                };
            },

            "__local_get": function (url) {
                var serialized = localStorage.getItem("gdriveapi:" + (url || this.url()));
                if (_.isEmpty(serialized) || !_.isString(serialized)) return false;
                return JSON.parse(serialized);
            },

            "__local_rm": function (url) {
                localStorage.removeItem("gdriveapi:" + (url || this.url()));
            },

            "__local_set": function (url, json) {
                if (_.isObject(json)) {
                    localStorage.setItem("gdriveapi:" + url, JSON.stringify(json));
                }
            },

            "__local_load": function(url) {
                var local = this.__local_get(url);
                if (local) {
                    this.set(local);
                }
                return local;
            }
        });
        return GDriveApiBackboneModel;
    });