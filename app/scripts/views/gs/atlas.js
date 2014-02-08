define([
    "jquery", "underscore", "backbone",
    "hbs!templates/gs/atlas",
    "hbs!templates/gs/maps_list_container",
    "views/gs/atlas_map",
    "views/gs/atlas_quick_tutorial",
    "views/gs/atlas_maptext_view",
    "views/stacksvis/view",
    "views/fmx_distributions/view",
    "views/seqpeek/view",
    "views/genes/control",
    "views/clinvarlist/control",
    "views/gs/tumor_types_control",
    "views/datamodel_collector/control"
],
    function ($, _, Backbone, AtlasTpl, MapsListContainerTpl, AtlasMapView,
              QuickTutorialView, MapTextView, StacksVisView, FeatureMatrixDistributionsView, SeqPeekViewV2,
              GenelistControl, ClinicalListControl, TumorTypesControl, DatamodelCollectorControl) {

        return Backbone.View.extend({
            "atlasMapViews": [],
            "last-z-index": 10,
            "lastPosition": {
                "top": 0, "left": 0
            },

            events: {
                "click .refresh-loaded": "__reload_all_maps",
                "click .list-controls li a": function(e) {
                    this.$el.find(".list-container.collapse.in").collapse("hide");
                },
                "click .open-map": function (e) {
                    this.$el.find(".list-container.collapse.in").collapse("hide");

                    var map_id = $(e.target).data("id");
                    var map_template = this.model.get(map_id);
                    this.__append_atlasmap(map_template);
                },
                "click div.atlas-map": function (e) {
                    this.$el.find(".list-container.collapse.in").collapse("hide");

                    var $target = $(e.target);
                    if (!$target.hasClass("atlas-map")) {
                        $target = $(e.target).parents(".atlas-map");
                    }

                    $target.css("z-index", this.__next_z_index());
                }
            },

            initialize: function () {
                _.bindAll(this, "__append_atlasmap", "__reload_all_maps", "__load_mapview");

                this.model = this.options.model;
                this.model.on("load", this.__init_genelist_control, this);
                this.model.on("load", this.__init_clinicallist_control, this);
                this.model.on("load", this.__init_tumortypes_control, this);
                this.model.on("load", this.__init_datamodel_collector, this);

                WebApp.Sessions.Producers["atlas_maps"] = this;

                WebApp.Views["atlas_quick_tutorial"] = QuickTutorialView;
                WebApp.Views["atlas_maptext"] = MapTextView;
                WebApp.Views["stacksvis"] = StacksVisView;
                WebApp.Views["feature_matrix_distributions"] = FeatureMatrixDistributionsView;
                WebApp.Views["seqpeekv2"] = SeqPeekViewV2;

                console.log("atlas:registered views");
            },

            render: function() {
                this.$el.html(AtlasTpl());
                return this;
            },

            __init_genelist_control: function() {
                this.genelistControl = new GenelistControl({ "default_genelist": this.model.get("default_genelist") });
                this.genelistControl.on("ready", this.__init_maps, this);
                this.genelistControl.on("updated", function (ev) {
                    console.log("atlas:genelistControl:updated:" + JSON.stringify(ev));
                    if (ev["reorder"]) {
                        console.log("atlas:genelistControl:updated:reorder:ignore");
                        return;
                    }

                    this.__reload_all_maps();
                }, this);

                this.$el.find(".genelist-container").html(this.genelistControl.render().el);
            },

            __init_clinicallist_control: function() {
                this.clinicalListControl = new ClinicalListControl({});
                this.clinicalListControl.on("updated", function (ev) {
                    console.log("atlas:clinicalListControl:updated:" + JSON.stringify(ev));
                    if (ev["reorder"]) {
                        console.log("atlas:clinicalListControl:updated:reorder:ignore");
                        return;
                    }

                    this.__reload_all_maps();
                }, this);

                this.$el.find(".clinvarlist-container").html(this.clinicalListControl.render().el);
            },

            __init_tumortypes_control: function() {
                this.tumorTypesControl = new TumorTypesControl({});

                var reloadFn = _.debounce(this.__reload_all_maps, 1000);
                this.tumorTypesControl.on("updated", reloadFn, this);
                this.$el.find(".tumor-types-container").html(this.tumorTypesControl.render().el);
            },

            __init_datamodel_collector: function() {
                this.datamodelCollectorControl = new DatamodelCollectorControl({});

                var reloadFn = _.debounce(this.__reload_all_maps, 1000);
                this.datamodelCollectorControl.on("updated", reloadFn, this);
                this.$el.find(".datamodel-collector-container").html(this.datamodelCollectorControl.render().el);
            },

            __init_maps: function () {
                var maps = this.model.get("maps");
                _.each(_.pluck(maps, "id"), function (map_id) {
                    var map_template = this.get(map_id);
                    if (map_template.get("isOpen")) _.defer(this.__append_atlasmap, map_template);
                }, this);

                this.$el.find(".maps-list-container").html(MapsListContainerTpl({ "maps": _.sortBy(maps, "label") }));
            },

            __append_atlasmap: function (map_template) {
                var atlasMapView = new AtlasMapView({
                    "assignedPosition": map_template.get("position") || this.__next_position(),
                    "assignedZindex": map_template.get("zindex") || this.__next_z_index(),
                    "map_template": map_template
                });
                atlasMapView.on("refresh", function() {
                    this.__load_mapview(atlasMapView);
                }, this);
                if (map_template.get("isOpen")) {
                    this.$el.find(".atlas-canvas").append(atlasMapView.render().el);
                }

                this.atlasMapViews.push(atlasMapView);
                this.__load_mapview(atlasMapView);
            },

            __reload_all_maps: function() {
                console.log("atlas:__reload_all_maps");
                _.each(this.atlasMapViews, this.__load_mapview, this);
            },

            __load_mapview: function (atlasMapView) {
                var gene_list = this.genelistControl.get_current();
                var tumor_type_list = _.pluck(WebApp.UserPreferences.get("selected_tumor_types"), "id");
                var clinvar_list = this.clinicalListControl.get_current() || [];

                var map_template = atlasMapView["map_template"];
                map_template.each("view_templates", function(view_template) {
                    var vt_id = view_template.get("id");
                    var $targetEl = $(atlasMapView["targetEl_by_id"][vt_id]).empty();
                    this.__load_view($targetEl, view_template, gene_list, tumor_type_list, clinvar_list);
                }, this);
                return null;
            },

            __load_view: function ($targetEl, view_template, gene_list, tumor_type_list, clinvar_list) {
                console.log("atlas:__load_view:" + $targetEl.id + "," + view_template.get("view"));

                var view = view_template.spin({
                    "genes": gene_list,
                    "cancers": tumor_type_list,
                    "tumor_types": tumor_type_list,
                    "clinical_variables": clinvar_list
                });
                $targetEl.html(view.render().el);

                if (_.has(view, "all_models")) {
                    _.each(view["all_models"], function(model) {
                        var data = model.get("base_query") || {};
                        if (!model.get("by_tumor_type")) data["cancer"] = tumor_type_list;
                        if (!model.get("query_all_genes")) data["gene"] = gene_list;
                        if (model.get("query_clinical_variables") && !_.isEmpty(clinvar_list)) {
                            data["id"] = _.pluck(clinvar_list, "id");
                        }

                        _.defer(function () {
                            model.fetch({
                                "url": model.get("url"),
                                "data": data,
                                "traditional": true,
                                "success": function () {
                                    model.trigger("load");
                                }
                            });
                        });
                    });
                }
            },

            __next_z_index: function () {
                var nextOne = 1 + this["last-z-index"];
                this["last-z-index"] = nextOne;
                return nextOne;
            },

            __next_position: function () {
                var lastPos = {
                    "left": this.lastPosition.left + 50,
                    "top": this.lastPosition.top + 50
                };
                this.lastPosition = lastPos;
                return lastPos;
            },

            currentState: function () {
                var openMaps = _.map(this.$el.find(".atlas-map"), function (map) {
                    var mapid = $(map).data("mapid");
                    var top = map.style["top"].replace("px", "");
                    var left = map.style["left"].replace("px", "");
                    var zindex = map.style["z-index"];
                    return { "id": mapid, "isOpen": true, "position": { "top": top, "left": left }, "zindex": zindex };
                });

                var tumor_type_list = _.pluck(WebApp.UserPreferences.get("selected_tumor_types"), "id");
                return {
                    "genes": this.genelistControl.get_current(),
                    "tumor_types": tumor_type_list,
                    "maps": openMaps
                }
            }
        });
    });