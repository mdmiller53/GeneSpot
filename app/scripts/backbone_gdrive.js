define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {

        var __is_kind = function (m, targetKind) {
            return _.contains(_.flatten([targetKind]), m.get("kind"));
        };

        /**
         * This library follows the semantics in https://developers.google.com/drive/v2/reference/
         *
         * Not Implemented:
         * - Channels
         * - Realtime
         * - File.watch
         * - Changes.watch (todo: integrate web sockets)
         *
         * Renamed:
         * - 'get' -> use 'fetch' (to avoid conflict with Backbone.Model.get)
         * - 'list' same as 'fetch'
         *
         * GDrive API Functions:
         * - Model: "insert", "fetch", "update", "patch", "delete"
         * - Collection: "list", "fetch"
         *
         * - Subclasses
         *   - FileModel: "copy", "insert", "update", "touch", "trash", "untrash"
         *      - extensions: "childReferences", "parentReferences", "permissions", "revisions",
         *                    "comments", "replies"
         *   - JsonPayloadModel: "upload", "download"
         *   - Comment: "replies"
         *
         * Events:
         * - Model
         *    - deleted
         *    - patched
         *    - updated
         *    - error
         * - Collection
         *    - listed
         *    - error
         * - File
         *    - copied
         *    - inserted
         *    - updated
         *    - touched
         *    - trashed
         *    - untrashed
         * - JsonPayloadModel
         *    - change:payload
         */
        var BackboneGDrive = {
            "DRIVE_API_BASE_URL": "svc/auth/providers/google_apis/drive/v2"
        };

        /**
         * Provides support for local storage
         * listens to CRUD events to update localStorage
         * loadLocal loads from localStorage and triggers events
         */
        var BGLocal = {
            "initLocal": function() {
                _.bindAll(this, "removeLocal", "setLocal", "loadLocal");

                this.on("destroy", this.removeLocal, this);
                this.on("remove", this.removeLocal, this);
                this.on("change", this.setLocal, this);
                this.on("reset", this.setLocal, this);
                this.on("sync", this.setLocal, this);
            },

            "removeLocal": function () {
                localStorage.removeItem("backbone_gdrive:" + this.url());
            },

            "setLocal": function (options) {
                if (options["is_change_from_load"]) return;
                localStorage.setItem("backbone_gdrive:" + this.url(), JSON.stringify(this.toJSON()));
            },

            "loadLocal": function () {
                return false;
//                        var strjson = localStorage.getItem("backbone_gdrive:" + this.url());
//                        if (_.isEmpty(strjson) || !_.isString(strjson)) return false;
//
//                        var local = JSON.parse(strjson);
//                        if (local) {
//                            this.set(local, { "silent": true });
//                            this.trigger("change", { "is_change_from_load": true });
//                        }
//                        return local;
            }
        };

        BackboneGDrive.Model = Backbone.Model.extend(_.extend(BGLocal, {
            "initialize": function () {
                _.bindAll(this, "initialize", "url", "fetch", "delete", "insert", "patch", "update");
                _.defer(_.bind(this.initLocal, this));
            },

            "url": function () {
                var kind = this.get("kind");
                if (_.isEmpty(kind)) return BackboneGDrive.DRIVE_API_BASE_URL + "/files";

                if (kind === "drive#about") return BackboneGDrive.DRIVE_API_BASE_URL + "/about";

                var id = this.get("id");
                if (kind === "drive#app") return BackboneGDrive.DRIVE_API_BASE_URL + "/apps/" + id;
                if (kind === "drive#change") return BackboneGDrive.DRIVE_API_BASE_URL + "/changes/" + id;


                var baseUrl = BackboneGDrive.DRIVE_API_BASE_URL + "/files/" + this.get("fileId");
                if (kind === "drive#childReference") return baseUrl + "/children/" + id;
                if (kind === "drive#parentReference") return baseUrl + "/parents/" + id;
                if (kind === "drive#permission") return baseUrl + "/permissions/" + id;
                if (kind === "drive#revision") return baseUrl + "/revisions/" + id;
                if (kind === "drive#property") {
                    var propertyKey = this.get("propertyKey");
                    return baseUrl + "/properties/" + propertyKey;
                }

                if (kind === "drive#comment") return baseUrl + "/comments/" + id;
                if (kind === "drive#commentReply") {
                    var cId = this.get("commentId");
                    return baseUrl + "/comments/" + cId + "/replies/" + id;
                }
                return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
            },

            "fetch": function (options) {
                options = options || {};

                if (this.loadLocal()) return this;

                return Backbone.Model.prototype.fetch.call(this, _.extend({
                    "url": this.url(),
                    "dataType": "json",
                    "contentType": "application/json"
                }, options));
            },

            "delete": function (options) {
                options = options || {};

                this.once("deleted", this.clear, this);
                return $.ajax(_.extend({
                    "url": this.url(),
                    "dataType": "json",
                    "method": "DELETE",
                    "success": function () {
                        this.trigger("deleted");
                    },
                    "error": function () {
                        this.trigger("error");
                    },
                    "context": this
                }, options));
            },

            "insert": function (options) {
                options = options || {};

                if (__is_kind(this, ["drive#permission", "drive#comment", "drive#commentReply"])) {
                    return Backbone.sync("create", this, {
                        "url": this.url(),
                        "method": "POST",
                        "data": options["arguments"],
                        "traditional": true
                    });
                }

                if (__is_kind(this, ["drive#childReference", "drive#parentReference", "drive#property"])) {
                    return Backbone.sync("create", this, { "url": this.url(), "method": "POST" });
                }
            },

            "patch": function (options) {
                var url = this.url();
                if (__is_kind(this, "drive#permission")) {
                    url += "?transferOwnership=" + (options["transferOwnership"] || false);
                } else if (_.has(options, "visibility") && __is_kind(this, "drive#property")) {
                    url += "?visibility=" + options["visibility"];
                } else if (__is_kind(this, ["drive#file", "drive#revision", "drive#comment", "drive#commentReply"])) {
                    // other supported types
                } else {
                    return null;
                }

                return $.ajax({
                    "url": url,
                    "method": "PATCH",
                    "data": JSON.stringify(this.toJSON()),
                    "dataType": "json",
                    "success": function () {
                        this.trigger("patched");
                    },
                    "error": function () {
                        this.trigger("error");
                    },
                    "context": this
                });
            },

            "update": function (options) {
                var url = this.url();
                if (__is_kind(this, "drive#permission")) {
                    url += "?transferOwnership=" + (options["transferOwnership"] || false);

                } else if (_.has(options, "visibility") && __is_kind(this, "drive#property")) {
                    url += "?visibility=" + options["visibility"];

                } else if (__is_kind(this, ["drive#revision", "drive#comment", "drive#commentReply"])) {
                    // other supported basic types

                } else {
                    // do nothing for non-supported types
                    return null;
                }

                return $.ajax({
                    "url": url,
                    "method": "PUT",
                    "data": JSON.stringify(this.toJSON()),
                    "dataType": "json",
                    "success": function (json) {
                        this.trigger("updated", json);
                    },
                    "error": function () {
                        this.trigger("error");
                    },
                    "context": this
                });
            },

            "replies": function () {
                if (_.isEmpty(this.get("id"))) return null;

                if (this.loadLocal()) return this;

                if (!this.comment_replies) {
                    this.comment_replies = new BackboneGDrive.Collection({
                        "fileId": this.get("id"),
                        "kind": "drive#commentReplyList"
                    });
                }
                return this.comment_replies;
            }
        }));

        BackboneGDrive.FileModel = BackboneGDrive.Model.extend({
            "initialize": function (attributes, options) {
                _.bindAll(this, "initialize", "url", "copy", "insert", "update");
                _.bindAll(this, "touch", "trash", "untrash", "__simple_post");
                _.bindAll(this, "childReferences", "parentReferences");
                _.bindAll(this, "permissions", "revisions", "comments");

                BackboneGDrive.Model.prototype.initialize.call(this, attributes, options);
            },

            "url": function () {
                if (_.isEmpty(this.get("id"))) return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
                return BackboneGDrive.DRIVE_API_BASE_URL + "/files/" + this.get("id");
            },

            "copy": function (new_copy, options) {
                options = options || {};
                if (_.isEmpty(this.get("id"))) return null;
                return $.ajax(_.extend({
                    "method": "POST",
                    "data": new_copy,
                    "dataType": "json",
                    "url": this.url() + "/copy",
                    "success": function (new_json) {
                        this.trigger("copied", new_json);
                    },
                    "error": function () {
                        this.trigger("error");
                    },
                    "context": this
                }, options));
            },

            "insert": function (options) {
                options = options || {};

                this.once("sync", function () {
                    console.debug("INSERTED!");
                    this.trigger("inserted");
                }, this);

                return Backbone.sync("create", this, {
                    "url": this.url(),
                    "method": "POST",
                    "data": _.extend({ "uploadType": "media" }, options["arguments"]),
                    "traditional": true,
                    "error": this.__error_handler(options)
                });
            },

            "update": function (options) {
                options = options || {};
                if (_.isEmpty(this.get("id"))) return null;

                return $.ajax(_.extend({
                    "url": this.url() + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(_.omit(this.toJSON(), "payload")),
                    "success": function (json) {
                        this.trigger("updated", json);
                    },
                    "error": function () {
                        this.trigger("error");
                    },
                    "context": this
                }, options));
            },

            "touch": function (options) {
                this.__simple_post(options, "touch");
            },

            "trash": function (options) {
                this.__simple_post(options, "trash");
            },

            "untrash": function (options) {
                this.__simple_post(options, "untrash");
            },

            "childReferences": function () {
                return this.__collections_by_kind("drive#childList");
            },

            "parentReferences": function () {
                return this.__collections_by_kind("drive#parentList");
            },

            "permissions": function () {
                return this.__collections_by_kind("drive#permissionList");
            },

            "revisions": function () {
                return this.__collections_by_kind("drive#revisionList");
            },

            "comments": function () {
                return this.__collections_by_kind("drive#commentList");
            },

            "__simple_post": function (options, verb) {
                return $.ajax({
                    "method": "POST",
                    "url": this.url() + "/" + verb,
                    "dataType": "json",
                    "success": function (json) {
                        this.trigger(verb + "ed", json);
                    },
                    "error": function () {
                        this.trigger("error");
                    }
                });
            },

            "__collected_by_kind": {},

            "__collections_by_kind": function (kind) {
                if (!_.isEmpty(this.get("id"))) {
                    var collection = this.__collected_by_kind[kind];
                    if (!collection) {
                        collection = new BackboneGDrive.Collection({ "fileId": this.get("id"), "kind": kind });
                        this.__collected_by_kind[kind] = collection;
                    }
                    return collection;
                }
                return null;
            }
        });

        BackboneGDrive.JsonPayloadModel = BackboneGDrive.FileModel.extend({
            "initialize": function (attributes, options) {
                _.bindAll(this, "initialize", "upload", "download");
                this.on("change:payload", this.upload, this);
                this.on("change:fileSize", this.download, this);
                _.defer(this.download);

                BackboneGDrive.Model.prototype.initialize.call(this, attributes, options);
            },

            "upload": function (options) {
                options = options || {};
                if (options["is_change_from_download"]) return false;

                if (!__is_kind(this, "drive#file")) return false;
                if (_.isEmpty(this.get("payload"))) return false;

                return $.ajax(_.extend({}, {
                    "url": this.url() + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(this.get("payload")),
                    "success": this.set,
                    "context": this
                }));
            },

            "download": function () {
                if (_.isEmpty(this.get("downloadUrl"))) return false;

                return $.ajax(_.extend({}, {
                    "method": "GET",
                    "url": "svc/auth/providers/google_download",
                    "data": {
                        "forwardUrl": this.get("downloadUrl")
                    },
                    "traditional": true,
                    "dataType": "json",
                    "contentType": "application/json",
                    "success": function (json) {
                        this.set("payload", json, { "silent": true });  // avoid triggering upload again
                        this.trigger("change:payload", { "is_change_from_download": true });
                    },
                    "context": this
                }));
            }
        });

        BackboneGDrive.Collection = Backbone.Collection.extend(_.extend(BGLocal, {
            "initialize": function () {
                _.bindAll(this, "initialize", "list", "fetch", "url");
                _.defer(_.bind(this.initLocal, this));
            },

            "fetch": function () {
                return this.list();
            },

            "list": function (options) {
                options = options || {};

                if (this.loadLocal()) return this;

                this.once("listed", function (json) {
                    if (_.has(json, "items")) {
                        this.add(_.map(json["items"], function(item) {
                            if (_.isEqual(item["kind"], "drive#file")) return new BackboneGDrive.FileModel(item);
                            return new BackboneGDrive.Model(item);
                        }, this));
                    }
                }, this);

                var payload = {
                    "url": this.url(),
                    "method": "GET",
                    "dataType": "json",
                    "success": function (json) {
                        this.trigger("listed", json);
                    },
                    "context": this
                };

                if (_.has(options, "query")) {
                    var queryable = [
                        "drive#changeList",
                        "drive#childList",
                        "drive#parentList",
                        "drive#permissionList"
                    ];
                    if (__is_kind(this, queryable)) {
                        _.extend(payload, {
                            "data": _.extend({}, options["query"]),
                            "traditional": true
                        });
                    }
                }

                return $.ajax(payload);
            },

            "url": function () {
                if (_.isEmpty(this.get("kind"))) return BackboneGDrive.DRIVE_API_BASE_URL + "/files";

                var kind = this.get("kind");
                if (kind === "drive#appList") return BackboneGDrive.DRIVE_API_BASE_URL + "/apps";

                if (kind === "drive#changeList") {
                    var largestChangeId = parseInt(this.get("largestChangeId"));
                    if (!_.isNaN(largestChangeId)) {
                        return this.DRIVE_API_BASE_URL + "/changes?startChangeId=" + (largestChangeId + 1);
                    }
                    return this.DRIVE_API_BASE_URL + "/changes";
                }

                if (kind === "drive#fileList") return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
                if (kind === "drive#appList") return BackboneGDrive.DRIVE_API_BASE_URL + "/apps";

                var baseUrl = BackboneGDrive.DRIVE_API_BASE_URL + "/files/" + this.get("fileId");
                if (kind === "drive#childList") return baseUrl + "/children";
                if (kind === "drive#parentList") return baseUrl + "/parents";
                if (kind === "drive#permissionList") return baseUrl + "/permissions";
                if (kind === "drive#revisionList") return baseUrl + "/revisions";
                if (kind === "drive#propertyList") return baseUrl + "/properties";

                if (kind === "drive#commentList") return baseUrl + "/comments";
                if (kind === "drive#commentReplyList") {
                    var cId = this.get("commentId");
                    return baseUrl + "/comments/" + cId + "/replies";
                }

                return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
            }
        }));

        return BackboneGDrive;
    });