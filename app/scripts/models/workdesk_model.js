define(["jquery", "underscore", "backbone", "backbone_gdrive"],
    function ($, _, Backbone, BackboneGDrive) {
        return BackboneGDrive.FolderModel.extend({
            "defaults": {
                "title": "GeneSpot Workdesk"
            },

            "initialize": function() {
                _.bindAll(this, "find");
                this.once("change:id", this.__register_search_items, this);
                this.defer(this.find);
            },

            "find": function() {
                if (!_.isEmpty(this.get("id"))) {
                    this.trigger("change"); // already found
                    return this;
                }

                if (_.isEmpty(this.files.get("items"))) {
                    // not yet located
                    this.files.once("change:items", this.__find_unique_workdesk, this);
                    this.files.list();
                    return this;
                }
            },

            "__register_search_items": function() {
                console.debug("models/workdesk_model.__register_search_items");

                var children = this.childReferences();
                children.on("change:items", function () {
                    this.workbooks = this.__register_search_by_section( "application/vnd.genespot.workbook", "Workbooks", "wb");
                    this.datasets = this.__register_search_by_section( "application/vnd.genespot.dataset", "Datasets", "datasets");
                }, this);
                _.defer(children.list);
            },

            "__register_search_by_section": function(mimeType, section_title, anchor) {
                var filtered = _.findWhere(this.childReferences().get("items"), { "mimeType": mimeType });
                return _.map(filtered, function(item) {
                    var model = new BackboneGDrive.FileModel(item);
                    model.once("change", function() {
                        var id = model.get("id");
                        var title = model.get("title");
                        var keywords = _.flatten([title, model.get("description"), model.get("keywords")]);

                        WebApp.Search.add_callback(section_title, title, keywords, function () {
                            WebApp.Router.navigate("#" + anchor + "/" + id, { "trigger": true });
                        });
                    }, this);
                    _.defer(model.fetch);
                }, this);
            },

            "__find_unique_workdesk": function() {
                if (_.isEmpty(this.files.get("items"))) {
                    return this.trigger("error", "items_not_found");
                }

                var existing = _.findWhere(this.files.get("items"), { "title": this.get("title") });
                if (existing && _.has(existing, "id")) {
                    // located
                    this.set(existing);
                } else {
                    // auto-create, triggers 'change'
                    _.defer(this.insert);
                }
            }
        });
    });
