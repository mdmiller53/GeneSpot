define([
    "jquery", "underscore", "backbone",
    "hbs!templates/gs/atlas",
    "hbs!templates/gs/atlasmap",
    "hbs!templates/line_item",
    "hbs!templates/open_link",
    "views/gs/atlas_quick_tutorial",
    "views/gs/atlas_maptext_view",
    "views/gs/seqpeek_view",
    "views/gs/mutsig_grid_view",
    "views/gs/mutsig_top_genes_view",
    "views/gs/stacksvis",
    "views/gs/feature_matrix_distributions"
],
    function ($, _, Backbone, AtlasTpl, AtlasMapTpl, LineItemTpl, OpenLinkTpl, QuickTutorialView, MapTextView, SeqPeekView, MutsigGridView, MutsigTopGenesView, StacksVisView, FeatureMatrixDistributionsView) {

        return Backbone.View.extend({
            "last-z-index": 10,
            "currentZoomLevel": 1.0,
            "lastPosition": {
                "top": 0, "left": 0
            },
            "view_specs_by_uid": {},

            events: {
                "click a.refresh-loaded": function () {
                    _.each(this.$el.find(".atlas-map"), this.loadMapData);
                },
                "click a.zoom-in": function () {
                    this.currentZoomLevel = this.currentZoomLevel * 1.15;
                    this.zoom(this.currentZoomLevel);
                },
                "click a.zoom-out": function () {
                    this.currentZoomLevel = this.currentZoomLevel * 0.85;
                    this.zoom(this.currentZoomLevel);
                },
                "click a.zoom-home": function () {
                    this.currentZoomLevel = 1.0;
                    this.zoom(this.currentZoomLevel);
                },
                "click a.resize-item": function (e) {
                    var li = $(e.target).parents("li");
                    if (li.hasClass("active")) {
                        this.$el.find(".atlas-map").resizable("destroy");
                    } else {
                        this.$el.find(".atlas-map").resizable({ "ghost": true});
                    }
                    li.toggleClass("active");
                },
                "click a.minimize-me": function (e) {
                    this.closeMap($(e.target).parents(".atlas-map"));
                },
                "click a.refresh-me": function (e) {
                    this.loadMapData($(e.target).parents(".atlas-map"));
                },
                "click a.open-map": function (e) {
                    var mapId = $(e.target).data("id");
                    _.each(this.options.model.get("maps"), function (map) {
                        if (_.isEqual(map.id, mapId)) {
                            map.isOpen = true;
                            this.appendAtlasMap(map);
                        }
                    }, this);
                },
                "click div.atlas-map": function (e) {
                    var $target = $(e.target);
                    if (!$target.hasClass("atlas-map")) {
                        $target = $(e.target).parents(".atlas-map");
                    }

                    $target.css("z-index", this.nextZindex());
                }
            },

            initialize: function (options) {
                _.bindAll(this, "loadView", "initMaps", "appendAtlasMap", "loadMapData", "loadMapContents", "closeMap");
                _.bindAll(this, "zoom", "init_genelist_typeahead", "nextZindex", "nextPosition", "currentState");

                this.$el.html(AtlasTpl());
                this.$el.find(".atlas-zoom").draggable({ "scroll": true, "cancel": "div.atlas-map" });

                _.defer(this.init_genelist_typeahead);

                WebApp.Sessions.Producers["atlas_maps"] = this;
                this.options.model.on("load", this.initMaps);

                WebApp.Events.on("webapp:tumor-types:selector:change", function() {
                    _.each(this.$el.find(".atlas-map"), this.loadMapData);
                }, this);

                WebApp.Views["atlas_quick_tutorial"] = QuickTutorialView;
                WebApp.Views["atlas_maptext"] = MapTextView;
                WebApp.Views["seqpeek"] = SeqPeekView;
                WebApp.Views["mutsig_grid"] = MutsigGridView;
                WebApp.Views["mutsig_top_genes"] = MutsigTopGenesView;
                WebApp.Views["stacksvis"] = StacksVisView;
                WebApp.Views["feature_matrix_distributions"] = FeatureMatrixDistributionsView;

                console.log("atlas:registered views")
            },

            initMaps: function () {
                var maps = this.options.model.get("maps");
                _.each(_.sortBy(maps, "label"), function (map) {
                    if (!map.id) map.id = Math.round(Math.random() * 10000);
                    var lit = { "a_class": "open-map", "id": map.id, "label": map.label };
                    if (map.disabled) {
                        lit = { "li_class": "disabled", "id": map.id, "label": map.label };
                    }
                    this.$el.find(".maps-selector").append(LineItemTpl(lit));
                }, this);

                if (WebApp.Sessions.Active) {
                    var session_atlas = WebApp.Sessions.Active.get("atlas_maps");
                    if (session_atlas) {
                        if (session_atlas.genes) {
                            var UL = this.$el.find(".gene-selector");
                            UL.empty();
                            _.each(session_atlas.genes, function (gene) {
                                UL.append(LineItemTpl({ "label": gene, "id": gene, "a_class": "item-remover", "i_class": "icon-trash" }));
                                UL.find(".item-remover").click(function (e) {
                                    $(e.target).parent().remove();
                                });
                            });
                        }

                        // TODO : Restore selected tumor types from session

                        if (session_atlas.maps) {
                            maps = _.compact(_.map(session_atlas.maps, function (mapFromSession) {
                                var matchedMap = _.find(maps, function (m) {
                                    return _.isEqual(m.id, mapFromSession.id);
                                });
                                if (matchedMap) {
                                    return _.extend(_.clone(matchedMap), _.clone(mapFromSession));
                                }
                                return null;
                            }));
                        }
                    }
                }
                _.each(maps, function (map) {
                    if (map.isOpen) this.appendAtlasMap(map);
                }, this);
            },

            appendAtlasMap: function (map) {
                map = _.clone(map);

                var uid = Math.round(Math.random() * 10000);
                _.each(map.views, function (view, idx) {
                    if (!_.has(view, "view")) view["view"] = view["id"];

                    if (idx == 0) view["li_class"] = "active";
                    view["uid"] = ++uid;

                    this.view_specs_by_uid[uid] = view;
                }, this);

                map.assignedPosition = map.position || this.nextPosition();
                map.assignedZindex = map.zindex || this.nextZindex();

                this.$el.find(".atlas-zoom").append(AtlasMapTpl(map));
                var $atlasMap = this.$el.find(".atlas-zoom").children().last();

                $atlasMap.find(".info-me").popover({
                    "title": "Description",
                    "trigger": "hover",
                    "content": map.description
                });

                var _this = this;
                this.$el.find(".maps-btn").effect("transfer", {
                    "to": $atlasMap,
                    complete: function () {
                        _this.loadMapData($atlasMap);
                        $atlasMap.draggable({ "handle": ".icon-move", "scroll": true });
                    }
                }, 750);
            },

            loadMapData: function (atlasMap) {
                var UL = $(atlasMap).find(".download-links");
                UL.empty();
                _.each($(atlasMap).find(".map-contents"), function (mc) {
                    _.defer(function (_this) {
                        var downloadUrl = _this.loadMapContents(mc);
                        if (downloadUrl) {
                            _.defer(function () {
                                UL.append(OpenLinkTpl({ "label": $(mc).data("label"), "url": downloadUrl }))
                            });
                        }
                    }, this);
                }, this);
            },

            loadMapContents: function (contentContainer, view_options, query_options) {
                var $target = $(contentContainer);
                var view_name = $target.data("view");
                if (view_name) {
                    var afn = function (link) {
                        return $(link).data("id")
                    };

                    var tumor_type_list = _.pluck(WebApp.UserPreferences.get("selected_tumor_types"), "id");
                    var geneList = _.map(this.$el.find(".gene-selector .item-remover"), afn);

                    var v_options = _.extend({ "genes": geneList, "cancers": tumor_type_list, "hideSelector": true }, view_options || {});
                    var q_options = _.extend({ "gene": geneList, "cancer": tumor_type_list }, query_options || {});

                    return this.loadView($target, view_name, v_options, q_options);
                }
                return null;
            },

            loadView: function (targetEl, view_name, options, query) {
                console.log("atlas:loadView:view=" + view_name);
                var ViewClass = WebApp.Views[view_name];
                if (ViewClass) {
                    var query_options = { "query": query };

                    var view_spec = this.view_specs_by_uid[$(targetEl).data("uid")];
                    if (view_spec["by_tumor_type"]) query_options = { "query": _.omit(query, "cancer") };

                    var map_optns = _.extend(options, view_spec, query_options);
                    var models = {};

                    if (view_spec["datamodels"]) {
                        // Load multiple datamodels for the view
                        var callbackFn = _.after(_.keys(view_spec["datamodels"]).length, function () {
                            var view = new ViewClass(_.extend(options, map_optns, { "model": models }));
                            $(targetEl).html(view.render().el);
                            _.each(_.values(models), function(model) {
                                if (model.get("_is_loaded")) model.trigger("load");
                            });
                        });

                        _.each(view_spec["datamodels"], function (datamodel, datamodel_key) {
                            WebApp.Datamodel.fetch_by_datamodel_uri(datamodel, _.extend(map_optns, {
                                "model_key": datamodel_key,
                                "callback": function(model) {
                                    models[model.get("model_key")] = model;
                                    model.on("load", function() {
                                        model.set("_is_loaded", true);
                                    });
                                    callbackFn();
                                }
                            }));
                        });

                    } else if (view_spec["datamodel"]) {
                        // Load single datamodel for the view

                        var datamodel = view_spec["datamodel"];
                        WebApp.Datamodel.fetch_by_datamodel_uri(datamodel, _.extend(map_optns, {
                            "callback": function (model) {
                                var view = new ViewClass(_.extend(options, map_optns, { "model": model }));
                                $(targetEl).html(view.render().el);
                            }
                        }));
                    }

                    // TODO : Specify download links
//                    if (map_optns["url"]) return map_optns["url"] + "?" + this.outputTsvQuery(query);
                }
                return null;
            },

            outputTsvQuery: function (query) {
                var qsarray = [];
                _.each(query, function (values, key) {
                    if (_.isArray(values)) {
                        _.each(values, function (value) {
                            qsarray.push(key + "=" + value);
                        })
                    } else {
                        qsarray.push(key + "=" + values);
                    }
                });
                qsarray.push("output=tsv");
                return qsarray.join("&");
            },

            closeMap: function (atlasMap) {
                $(atlasMap).effect("transfer", {
                    "to": this.$el.find(".maps-btn"),
                    complete: function () {
                        $(atlasMap).remove();
                    }
                }, 750);
            },

            zoom: function (zoomLevel) {
                this.$el.find(".atlas-zoom").zoomTo({
                    "duration": 1000,
                    "scalemode": "both",
                    "easing": "ease",
                    "nativeanimation": true,
                    "root": this.$el.find(".atlas-canvas"),
                    "closeclick": false,
                    "targetsize": zoomLevel
                });
            },

            init_genelist_typeahead: function () {
                var genelist = WebApp.Lookups.get("genes").get("keys");

                var UL = this.$el.find(".gene-selector");
                this.$el.find(".genes-typeahead").typeahead({
                    source: function (q, p) {
                        p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                            return _.map(genelist, function (geneitem) {
                                if (geneitem.toLowerCase().indexOf(qi) >= 0) return geneitem;
                            });
                        }))));
                    },

                    updater: function (gene) {
                        UL.append(LineItemTpl({ "label": gene, "id": gene, "a_class": "item-remover", "i_class": "icon-trash" }));
                        UL.find(".item-remover").click(function (e) {
                            $(e.target).parent().remove();
                        });
                        return "";
                    }
                });

                UL.find(".item-remover").click(function (e) {
                    $(e.target).parent().remove();
                });

                UL.sortable();
            },

            nextZindex: function () {
                var nextZindex = 1 + this["last-z-index"];
                this["last-z-index"] = nextZindex;
                return nextZindex;
            },

            nextPosition: function () {
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

                var afn = function (link) {
                    return $(link).data("id")
                };

                var tumor_type_list = _.pluck(WebApp.UserPreferences.get("selected_tumor_types"), "id");
                return {
                    "genes": _.map(this.$el.find(".gene-selector .item-remover"), afn),
                    "tumor_types": tumor_type_list,
                    "maps": openMaps
                }
            }
        });
    });