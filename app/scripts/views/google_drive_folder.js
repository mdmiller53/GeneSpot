define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return function () {
            var obj = _.extend(Backbone.Events, {
                folder: new Backbone.Model(),
                files: new Backbone.Model({}, { "url": "svc/auth/providers/google_apis/drive/v2/files" }),

                sync_up: function () {
                    console.debug("views/google_drive_folder.sync_up");
                    this.files.fetch({ "success": this.__load });
                },

                __load: function (model) {
                    console.debug("views/google_drive_folder.__load");
                    var folderInfo = _.findWhere(model.get("items"), { "title": "GeneSpot | Data Sheets" });
                    if (folderInfo) {
                        this.folder.set(folderInfo);
                        _.defer(this.__ready);
                    } else {
                        _.defer(this.__create_folder);
                    }
                },

                __create_folder: function () {
                    console.debug("views/google_drive_folder.__create_folder");
                    this.folder.save(
                        {
                            "title": "GeneSpot | Data Sheets",
                            "parents": [
                                {"id": "root"}
                            ],
                            "mimeType": "application/vnd.google-apps.folder"
                        },
                        {
                            "url": "svc/auth/providers/google_apis/drive/v2/files",
                            "method": "POST",
                            "success": this.__ready
                        });
                },

                __ready: function () {
                    console.debug("views/google_drive_folder.__ready");
                    this.trigger("folder-ready");
                }
            });
            _.bindAll(obj, "sync_up", "__load", "__create_folder", "__ready");
            return obj;
        }
    });
