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
         *      - extensions: "childReferences", "parentReferences", "permissions", "revisions", "comments"
         *          - "payload": "upload", "download"
         *   - CommentModel: "replies"
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
         *    - updated
         *    - touched
         *    - trashed
         *    - untrashed
         *    - change:payload
         */
        var BackboneGDrive = {
            "DRIVE_API_BASE_URL": "svc/auth/providers/google_apis/drive/v2"
        };

        /**
         * Provides support for local storage
         * listens to CRUD events to update localStorage
         * init_from_local loads from localStorage and triggers events
         */
        var BGLocal = {
            "init_from_local": function () {
                _.bindAll(this, "__remove_local", "__set_local", "load_from_local");

                if (__is_kind(this, ["drive#change", "drive#changeList"])) return;

                if (!this.hasLocalListeners) {
                    this.on("destroy", this.__remove_local, this);
                    this.on("remove", this.__remove_local, this);
                    this.on("change", this.__set_local, this);
//                this.on("reset", this.__set_local, this);
//                this.on("sync", this.__set_local, this);
                    this.hasLocalListeners = true;
                }
            },

            "load_from_local": function() {
                if (__is_kind(this, ["drive#change", "drive#changeList"])) return false;

                var url = this.url();
                if (!_.isEmpty(url)) {
//                    console.debug("BbGd.BGLocal.load_from_local:>>>" + this.url() + "<<<");

                    var strjson = localStorage.getItem("backbone_gdrive:" + url);
                    if (_.isEmpty(strjson) || !_.isString(strjson)) return false;

                    var local = JSON.parse(strjson);
                    if (local) {
                        this.set(local, { "ignore_this_change": true });
                    }
//                    console.debug("BbGd.BGLocal.load_from_local:>>>" + url + "<<<:" + _.isObject(local));
                    return local;
                }
                return false;
            },

            "__remove_local": function () {
                localStorage.removeItem("backbone_gdrive:" + this.url());
            },

            "__set_local": function (model, options) {
                options = options || {};

                if (options["ignore_this_change"]) return;
                if (__is_kind(this, ["drive#change", "drive#changeList"])) return;

                var url = this.url();
                var json = this.toJSON();
                console.debug("BbGd.BGLocal.__set_local:>>>" + url + "<<<:" + _.isObject(json));
                localStorage.setItem("backbone_gdrive:" + url, JSON.stringify(json, undefined, 2));
            }
        };

        BackboneGDrive.Model = Backbone.Model.extend(_.extend(BGLocal, {
            "initialize": function () {
                _.bindAll(this, "initialize", "url", "fetch", "delete", "insert", "patch", "update");
                _.defer(_.bind(this.init_from_local, this));
            },

            "url": function () {
                if (_.isEmpty(this.get("kind"))) return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
                if (__is_kind(this, "drive#about")) return BackboneGDrive.DRIVE_API_BASE_URL + "/about";

                var id = this.get("id");
                if (__is_kind(this, "drive#app")) return BackboneGDrive.DRIVE_API_BASE_URL + "/apps/" + id;
                if (__is_kind(this, "drive#change")) return BackboneGDrive.DRIVE_API_BASE_URL + "/changes/" + id;

                var baseUrl = BackboneGDrive.DRIVE_API_BASE_URL + "/files/" + this.get("fileId");
                if (__is_kind(this, "drive#childReference")) return baseUrl + "/children/" + id;
                if (__is_kind(this, "drive#parentReference")) return baseUrl + "/parents/" + id;
                if (__is_kind(this, "drive#permission")) return baseUrl + "/permissions/" + id;
                if (__is_kind(this, "drive#revision")) return baseUrl + "/revisions/" + id;
                if (__is_kind(this, "drive#property")) {
                    var propertyKey = this.get("propertyKey");
                    return baseUrl + "/properties/" + propertyKey;
                }

                if (__is_kind(this, "drive#comment")) return baseUrl + "/comments/" + id;
                if (__is_kind(this, "drive#commentReply")) {
                    var cId = this.get("commentId");
                    return baseUrl + "/comments/" + cId + "/replies/" + id;
                }
                return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
            },

            "fetch": function (options) {
                options = options || {};

                if (this.load_from_local()) return this;

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

                if (__is_kind(this, this, ["drive#permission", "drive#comment", "drive#commentReply"])) {
                    return Backbone.sync("create", this, {
                        "url": this.url(),
                        "method": "POST",
                        "data": options["arguments"],
                        "traditional": true
                    });
                }

                if (__is_kind(this, this, ["drive#childReference", "drive#parentReference", "drive#property"])) {
                    return Backbone.sync("create", this, { "url": this.url(), "method": "POST" });
                }
            },

            "patch": function (options) {
                var url = this.url();
                if (__is_kind(this, this, "drive#permission")) {
                    url += "?transferOwnership=" + (options["transferOwnership"] || false);
                } else if (_.has(options, "visibility") && __is_kind(this, this, "drive#property")) {
                    url += "?visibility=" + options["visibility"];
                } else if (__is_kind(this, this, ["drive#file", "drive#revision", "drive#comment", "drive#commentReply"])) {
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
                if (__is_kind(this, this, "drive#permission")) {
                    url += "?transferOwnership=" + (options["transferOwnership"] || false);

                } else if (_.has(options, "visibility") && __is_kind(this, this, "drive#property")) {
                    url += "?visibility=" + options["visibility"];

                } else if (__is_kind(this, this, ["drive#revision", "drive#comment", "drive#commentReply"])) {
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
            }
        }));

        BackboneGDrive.CommentModel = BackboneGDrive.Model.extend({
            "defaults": {
                "kind": "drive#comment"
            },

            "url": function () {
                var id = this.get("id");
                var fileId = this.get("fileId");
                return BackboneGDrive.DRIVE_API_BASE_URL + "/files/" + fileId + "/comments/" + id;
            },

            "replies": function () {
                if (_.isEmpty(this.get("id"))) return null;

                if (this.load_from_local()) return this;

                if (!this.comment_replies) {
                    this.comment_replies = new BackboneGDrive.List({
                        "fileId": this.get("fileId"),
                        "commentId": this.get("id"),
                        "kind": "drive#commentReplyList"
                    });
                }
                return this.comment_replies;
            }
        });

        BackboneGDrive.FileModel = BackboneGDrive.Model.extend({
            "initialize": function (attributes, options) {
                _.bindAll(this, "initialize", "url", "copy", "insert", "update");
                _.bindAll(this, "touch", "trash", "untrash", "__simple_post");
                _.bindAll(this, "childReferences", "parentReferences");
                _.bindAll(this, "permissions", "revisions", "comments");
                _.bindAll(this, "payload", "upload", "download");

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

                this.__remove_local();

                return $.ajax({
                    "method": "POST",
                    "url": "svc/auth/providers/google_apis/drive/v2/files?uploadType=media",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(this.toJSON(), undefined, 2),
                    "success": function(json) {
                        this.set(json);
                    },
                    "context": this
                });
            },

            "update": function (options) {
                options = options || {};
                if (_.isEmpty(this.get("id"))) return null;

                this.__remove_local();

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
                return this.__list_references_by_kind("drive#childList");
            },

            "parentReferences": function () {
                return this.__list_references_by_kind("drive#parentList");
            },

            "permissions": function () {
                return this.__list_references_by_kind("drive#permissionList");
            },

            "revisions": function () {
                return this.__list_references_by_kind("drive#revisionList");
            },

            "comments": function () {
                return this.__list_references_by_kind("drive#commentList");
            },

            "__simple_post": function (options, verb) {
                this.__remove_local();

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

            "__references_by_kind": {},

            "__list_references_by_kind": function (kind) {
                if (!_.isEmpty(this.get("id"))) {
                    var ref_list = this.__references_by_kind[kind] || [];
                    if (_.isEmpty(ref_list)) {
                        ref_list = new BackboneGDrive.List({ "fileId": this.get("id"), "kind": kind });
                        this.__references_by_kind[kind] = ref_list;
                    }
                    return ref_list;
                }
                return null;
            },

            "payload": function () {
                if (!this.payloadEnabled) {
                    this.on("change:payload", this.upload, this);
                    this.on("change:fileSize", this.download, this);
                    _.defer(this.download);
                    this.payloadEnabled = true;
                }
                return this;
            },

            "upload": function (options) {
                options = options || {};
                if (options["is_change_from_download"]) return false;

                if (!__is_kind(this, this, "drive#file")) return false;
                if (_.isEmpty(this.get("payload"))) return false;

                return $.ajax(_.extend({}, {
                    "url": this.url() + "?uploadType=media",
                    "method": "PUT",
                    "contentType": "application/json",
                    "dataType": "json",
                    "data": JSON.stringify(this.get("payload"), undefined, 2),
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

        BackboneGDrive.FolderModel = BackboneGDrive.FileModel.extend({
            "defaults": {
                "kind": "drive#file",
                "parents": [
                    { "id": "root" }
                ],
                "mimeType": "application/vnd.google-apps.folder"
            },

            "initialize": function(attributes, options) {
                BackboneGDrive.FileModel.prototype.initialize.call(this, attributes, options);

                this.files = new BackboneGDrive.List({ "kind": "drive#fileList" });
            }
        });

        BackboneGDrive.List = Backbone.Model.extend(_.extend(BGLocal, {
            "initialize": function () {
                _.bindAll(this, "initialize", "list", "fetch", "url");
                _.defer(_.bind(this.init_from_local, this));
            },

            "fetch": function () {
                return this.list();
            },

            "list": function (options) {
                options = options || {};

                if (this.load_from_local()) return this;

                var payload = {
                    "url": this.url(),
                    "method": "GET",
                    "contentType": "application/json",
                    "dataType": "json",
                    "success": function(json) {
                        this.set(json);
                        this.trigger("complete");
                    },
                    "error": function() {
                        this.trigger("complete");
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
                    if (__is_kind(this, this, queryable)) {
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
                if (__is_kind(this, "drive#appList")) return BackboneGDrive.DRIVE_API_BASE_URL + "/apps";
                if (__is_kind(this, "drive#changeList")) {
                    var largestChangeId = parseInt(this.get("largestChangeId"));
                    if (!_.isNaN(largestChangeId)) {
                        return BackboneGDrive.DRIVE_API_BASE_URL + "/changes?startChangeId=" + (largestChangeId + 1);
                    }
                    return BackboneGDrive.DRIVE_API_BASE_URL + "/changes";
                }

                if (__is_kind(this, "drive#fileList")) return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
                if (__is_kind(this, "drive#appList")) return BackboneGDrive.DRIVE_API_BASE_URL + "/apps";

                var baseUrl = BackboneGDrive.DRIVE_API_BASE_URL + "/files/" + this.get("fileId");
                if (__is_kind(this, "drive#childList")) return baseUrl + "/children";
                if (__is_kind(this, "drive#parentList")) return baseUrl + "/parents";
                if (__is_kind(this, "drive#permissionList")) return baseUrl + "/permissions";
                if (__is_kind(this, "drive#revisionList")) return baseUrl + "/revisions";
                if (__is_kind(this, "drive#propertyList")) return baseUrl + "/properties";

                if (__is_kind(this, "drive#commentList")) return baseUrl + "/comments";
                if (__is_kind(this, "drive#commentReplyList")) {
                    var cId = this.get("commentId");
                    return baseUrl + "/comments/" + cId + "/replies";
                }

                return BackboneGDrive.DRIVE_API_BASE_URL + "/files";
            }
        }));

        return BackboneGDrive;
    });