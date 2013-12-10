define([
    "jquery", "underscore", "backbone",
    "hbs!templates/gs/atlas",
    "hbs!templates/gs/atlasmap",
    "hbs!templates/line_item",
    "hbs!templates/open_link",
    "views/gs/atlas_quick_tutorial",
    "views/gs/atlas_maptext_view",
    "views/gs/seqpeek_view",
    "views/gs/minigraph",
    "views/gs/mutsig_grid_view",
    "views/gs/mutsig_top_genes_view",
    "models/gs/mutations_interpro",
    "models/gs/minigraph"
],
    function ($, _, Backbone,
              AtlasTpl, AtlasMapTpl, LineItemTpl, OpenLinkTpl,
              QuickTutorialView, MapTextView, SeqPeekView, MiniGraphView, MutsigGridView, MutsigTopGenesView,
              MutationsModel, MiniGraphModel) {

        return Backbone.View.extend({
            "last-z-index": 10,
            "currentZoomLevel": 1.0,
            "lastPosition": {
                "top": 0, "left": 0
            },
            "viewsByUid": {},

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
                _.bindAll(this, "initMaps", "appendAtlasMap", "loadMapData", "loadMapContents", "viewsByUri", "closeMap", "zoom");
                _.bindAll(this, "initGeneTypeahead", "nextZindex", "nextPosition", "currentState");

                this.$el.html(AtlasTpl());
                this.$el.find(".atlas-zoom").draggable({ "scroll": true, "cancel": "div.atlas-map" });

                $.ajax({ url: "svc/data/lookups/genes", type: "GET", dataType: "text", success: this.initGeneTypeahead });

                this.options.router.Sessions.Producers["atlas_maps"] = this;
                this.options.model.on("load", this.initMaps);

                WebApp.Events.on("tumor-types-selector-change", function() {
                    _.each(this.$el.find(".atlas-map"), this.loadMapData);
                }, this);

                this.registerViews();
                this.registerModels();
            },

            registerViews: function () {
                var viewRegistry = this.options.router.Views;
                viewRegistry["atlas_quick_tutorial"] = QuickTutorialView;
                viewRegistry["atlas_maptext"] = MapTextView;
                viewRegistry["seqpeek"] = SeqPeekView;
                viewRegistry["minigraph"] = MiniGraphView;
                viewRegistry["mutsig_grid"] = MutsigGridView;
                viewRegistry["mutsig_top_genes"] = MutsigTopGenesView;
            },

            registerModels: function() {
                var modelRegistry = this.options.router.Models;
                modelRegistry["Mutations"] = MutationsModel;
                modelRegistry["MiniGraph"] = MiniGraphModel;
            },

            initMaps: function () {
                var maps = this.options.model.get("maps");
                _.each(_.sortBy(maps, "label"), function (map) {
                    var lit = { "a_class": "open-map", "id": map.id, "label": map.label };
                    if (map.disabled) {
                        lit = { "li_class": "disabled", "id": map.id, "label": map.label };
                    }
                    this.$el.find(".maps-selector").append(LineItemTpl(lit));
                }, this);

                if (this.options.router.Sessions.Active) {
                    var session_atlas = this.options.router.Sessions.Active.get("atlas_maps");
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

                    this.viewsByUid[uid] = view;
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

                    var tumor_type_list = _.map($(".tumor-types-selector").dropdownCheckbox("checked"), function(i) { return i["id"]; });
                    var geneList = _.map(this.$el.find(".gene-selector .item-remover"), afn);

                    var v_options = _.extend({ "genes": geneList, "cancers": tumor_type_list, "hideSelector": true }, view_options || {});
                    var q_options = _.extend({ "gene": geneList, "cancer": tumor_type_list }, query_options || {});

                    return this.viewsByUri($target, $target.data("source"), view_name, v_options, q_options);
                }
                return null;
            },

            viewsByUri: function (targetEl, uri, view_name, options, query) {
                var ViewClass = this.options.router.Views[view_name];
                if (ViewClass) {
                    var Model = this.options.router.Models["Default"];
                    var serviceUri;
                    var analysis_id;
                    var dataset_id;
                    var model_unit;
                    var catalog_unit;
                    if (uri) {
                        var parts = uri.split("/");
                        var data_root = parts[0];
                        analysis_id = parts[1];
                        dataset_id = parts[2];
                        if (analysis_id && dataset_id) {
                            model_unit = this.options.router.Datamodel.get(data_root)[analysis_id];
                            if (model_unit && model_unit.catalog) {
                                catalog_unit = model_unit.catalog[dataset_id];
                                if (catalog_unit) {
                                    serviceUri = catalog_unit.service || model_unit.service || "data/" + uri;
                                    Model = this.options.router.Models[model_unit.model || catalog_unit.model || "Default"];
                                }
                            }
                        }
                    }

                    var atlas_view_options = this.viewsByUid[$(targetEl).data("uid")] || {};
                    var model_optns = _.extend(options, atlas_view_options, {
                        "data_uri": "svc/" + serviceUri,
                        "analysis_id": analysis_id,
                        "dataset_id": dataset_id,
                        "model_unit": model_unit,
                        "catalog_unit": catalog_unit
                    });

                    //var model = new Model(model_optns);

                    var model;

                    if (_.has(catalog_unit, "new_options") && catalog_unit["new_options"] == true) {
                        model = new Model({}, model_optns);
                    }
                    else {
                        model = new Model(model_optns);
                    }

                    if (serviceUri) {
                        _.defer(function () {
                            model.fetch({
                                "data": query,
                                "traditional": true,
                                success: function () {
                                    model.trigger("load");
                                }
                            });
                        });
                    } else {
                        _.defer(function () {
                            model.trigger("load");
                        });
                    }

                    var model_unit_view_options = (model_unit && model_unit.view_options) ? model_unit.view_options : {};
                    var view_options = _.extend({"model": model}, model_unit_view_options, atlas_view_options, (options || {}));

                    console.log("viewsByUri(" + uri + "," + view_name + "):loading view");
                    var view = new ViewClass(view_options);
                    $(targetEl).html(view.render().el);

                    if (serviceUri) return "svc/" + serviceUri + "?" + this.outputTsvQuery(query);
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

            initGeneTypeahead: function (txt) {
                var genelist = txt.trim().split("\n");

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

                var tumor_type_list = _.map($(".tumor-types-selector").dropdownCheckbox("checked"), function(i) { return i["id"]; });
                return {
                    "genes": _.map(this.$el.find(".gene-selector .item-remover"), afn),
                    "tumor_types": tumor_type_list,
                    "maps": openMaps
                }
            }
        });
    });