define(["jquery", "underscore", "backbone", "backbone_gdrive"],
    function ($, _, Backbone, BackboneGDrive) {
        return BackboneGDrive.FileModel.extend({
            "defaults": {
                "kind": "drive#file",
                "title": "GeneSpot Workdesk",
                "parents": [
                    { "id": "root" }
                ],
                "mimeType": "application/vnd.google-apps.folder"
            },

            "fileList": new BackboneGDrive.Collection({ "kind": "drive#fileList" }),

            "find": function() {
                if (!_.isEmpty(this.get("items"))) {
                    this.set("id", this.get("id"));
                    return this;
                }

                this.fileList.once("listed", this.__find_unique_workdesk, this);
                this.fileList.list();
                return this;
            },

            "__find_unique_workdesk": function(json) {
                if (_.isEmpty(json["items"])) {
                    this.trigger("error", "items_not_found");
                }

                var existing = _.findWhere(json["items"], { "title": this.get("title") });
                if (existing && _.has(existing, "id")) {
                    this.set(existing);
                } else {
                    _.defer(this.insert);
                }
            }
        });
    });
