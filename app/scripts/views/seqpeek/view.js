define([
    "jquery", "underscore", "backbone", "d3", "vq",
    "views/seqpeek/vis",

    'seqpeek/util/data_adapters',
    'seqpeek/util/gene_region_utils',
    'seqpeek/util/region_layouts',
    'seqpeek/seqpeek_viewport',
    'seqpeek/seqpeek_svg_context',
    'seqpeek/variant_layout',
    'seqpeek/tracks/bar_plot_track',
    'seqpeek/tracks/region_scale_track',
    'seqpeek/tracks/horizontal_tick_track',

    "hbs!templates/seqpeek/mutations_map",
    "hbs!templates/seqpeek/mutations_map_table"
],
    function (
        $,
        _,
        Backbone,
        d3,
        vq,
        SeqPeekFactory,

        DataAdapters,
        GeneRegionUtils,
        RegionLayouts,
        ViewportFactory,
        SeqPeekSVGContextFactory,
        VariantLayoutFactory,
        BarPlotTrackFactory,
        RegionTrackFactory,
        TickTrackFactory,

        MutationsMapTpl,
        MutationsMapTableTpl
    ) {

        var VERTICAL_PADDING = 10,
            BAR_PLOT_TRACK_MAX_HEIGHT = 100,
            TICK_TRACK_HEIGHT = 25,
            REGION_TRACK_HEIGHT = 10,
            VIEWPORT_WIDTH = 1000;

        return Backbone.View.extend({
            "genes": [],
            "tumor_types": [],
            "model": {},

            events: {
                "click .seqpeek-gene-selector li a": function(e) {
                    console.debug("seqpeek/gene-selector:" + $(e.target).data("id"));
                    this.selected_gene = $(e.target).data("id");
                    this.$el.find(".selected-gene").html(this.selected_gene);
                    this.__render();
                }
            },

            initialize: function () {
                this.model = this.options["models"];
            },

            render: function() {
                console.debug("seqpeek/view.render");

                this.tumor_types = this.options["tumor_types"];
                this.genes = this.options["genes"] || [];
                if (!_.isEmpty(this.genes)) this.selected_gene = _.first(this.genes);

                var renderFn = _.after(this.tumor_types.length + 2, this.__render);

                this.model["mutations"].on("load", renderFn, this);
                this.model["mutsig"].on("load", renderFn, this);
                _.each(this.tumor_types, function(tumor_type) {
                    var m = this.model["features"]["by_tumor_type"][tumor_type];
                    m.on("load", renderFn, this);
                }, this);

                this.$el.html(MutationsMapTpl({ "selected_gene": this.selected_gene, "genes": this.genes }));
                this.$(".mutations_map_table").html(MutationsMapTableTpl({
                    "items": _.map(this.tumor_types, function (tumor_type) {
                        return { "tumor_type_label": tumor_type };
                    })
                }));

                return this;
            },

            __render: function () {
                console.debug("seqpeek/view.__render");

                var mutations = this.__filter_data(this.__parse_mutations());
                var features = this.__filter_features();
                var mutsig_ranks = this.__filter_data(this.__parse_mutsig());

                var formatter = function (value) {
                    return parseInt(value) + "%";
                };
                var data_items = _.map(this.tumor_types, function (tumor_type) {
                    var statistics = {
                        samples: {
                            numberOf: 0,
                            totals: {
                                percentOf: "NA"
                            }
                        }
                    };

                    if (_.has(mutations, tumor_type)) {
                        statistics.samples.numberOf = mutations[tumor_type].length;
                    }

                    if (_.has(features, tumor_type)) {
                        var first_feature = _.first(features[tumor_type]);
                        if (first_feature && _.has(first_feature, "values")) {
                            var grouped = _.groupBy(first_feature.values, function (v) {
                                return v;
                            });

                            statistics.samples.totals = _.extend({
                                percentOf: formatter(100 * statistics.samples.numberOf / grouped["1"].length)
                            }, grouped);
                        }
                    }

                    var mutsig_rank;
                    if (_.has(mutsig_ranks, tumor_type)) {
                        var mutsig_data = mutsig_ranks[tumor_type];
                        if (!_.isEmpty(mutsig_data)) {
                            mutsig_rank = _.first(mutsig_data)["rank"];
                        }
                    }

                    return {
                        tumor_type_label: tumor_type.toUpperCase(),
                        tumor_type: tumor_type,
                        mutsig_rank: mutsig_rank,
                        statistics: statistics
                    };
                });

                this.$(".mutations_map_table").html(MutationsMapTableTpl({ "items": data_items }));

                var $table_el = this.$(".mutations_map_table");
                var region_data = [ { "type": "exon", "start": 0, "end": 1000 } ];
                var seqpeek_data = [];

                _.each(this.tumor_types, function (tumor_type) {
                    var variants = mutations[tumor_type];
                    if (_.isEmpty(variants)) return;

                    seqpeek_data.push({
                        variants: variants,
                        tumor_type: tumor_type,
                        target_element: _.first(this.$("#seqpeek-row-" + tumor_type))
                    });
                }, this);

                var seqpeek_tick_track_element = _.first(this.$("#seqpeek-tick-row"))
                this.__build_all(seqpeek_data, region_data, seqpeek_tick_track_element);
            },

            __build_all: function(mutation_data, region_array, seqpeek_tick_track_element) {
                console.log(mutation_data);
                var region_data = GeneRegionUtils.buildRegionsFromArray(region_array);
                var region_layout = RegionLayouts.BasicLayoutFactory
                    .create({})
                    .intron_width(5);

                region_layout.process(region_data);
                var region_metadata = region_layout.getMetadata();

                var variant_layout = VariantLayoutFactory.create({});
                console.log(mutation_data);

                _.each(mutation_data, function(track_obj) {
                    variant_layout.add_track_data(track_obj.variants);
                });

                variant_layout
                    .location_field('location')
                    .variant_type_field('mutation_id')
                    .variant_width(5.0)
                    .regions(region_data)
                    .processFlatArray('location');

                var bar_plot_tracks = _.map(mutation_data, function(track_obj) {
                    var track_data = DataAdapters.group_by_location(track_obj.variants, 'mutation_id', 'location');
                    DataAdapters.apply_statistics(track_data, function() {return 'all';});
                    console.log(track_data);

                    return BarPlotTrackFactory
                        .create()
                        .color_scheme({
                            'all': '#fd8f42'
                        })
                        .data(track_data, function(d) {return d;})
                        .regions(region_data, 'location')
                        .variant_layout(variant_layout)
                        .bar_width(5.0)
                        .stem_height(30)
                        .height(BAR_PLOT_TRACK_MAX_HEIGHT)
                        .category_totals({ })
                        .scaling({
                            type: 'log2nabs',
                            min_height: 10,
                            max_height: BAR_PLOT_TRACK_MAX_HEIGHT - 30,
                            scaling_factor: 200
                        });
                });

                //////////////
                // Viewport //
                //////////////
                var common_viewport = ViewportFactory.createFromRegionData(region_data, region_metadata, 1300);
                common_viewport.setViewportPosition({
                    x: 0,
                    y: 0
                });

                ////////////////////////////////////////
                // Create SVG element for both tracks //
                ////////////////////////////////////////
                var total_height = _.reduce(bar_plot_tracks, function(memo, track, index) {
                    return memo + track.getHeight() + REGION_TRACK_HEIGHT + (index > 0 ? VERTICAL_PADDING : 0);
                }, 0);

                total_height = total_height + TICK_TRACK_HEIGHT;

                ////////////////////////////////////////////
                // Create context for each bar plot track //
                ////////////////////////////////////////////
                var bar_plot_SVG_contexts = [],
                    region_scale_SVG_contexts = [];

                _.each(bar_plot_tracks, function(track_instance, index, array) {
                    var current_y = 0;
                    var target_el = mutation_data[index].target_element;

                    var track_elements_svg = d3.select(target_el)
                        .append("svg")
                        .attr("width", VIEWPORT_WIDTH)
                        .attr("height", BAR_PLOT_TRACK_MAX_HEIGHT + REGION_TRACK_HEIGHT)
                        .style("pointer-events", "none");

                    var bar_plot_track_svg = track_elements_svg
                        .append("g")
                        .attr("transform", "translate(0," + current_y + ")")
                        .style("pointer-events", "none");

                    current_y = current_y + track_instance.getHeight();

                    bar_plot_SVG_contexts.push(SeqPeekSVGContextFactory.createIntoSVG(bar_plot_track_svg));

                    // Create context for region track below each bar plot track
                    var region_track = RegionTrackFactory
                        .create()
                        .height(REGION_TRACK_HEIGHT)
                        .data(region_data);

                    var region_track_svg = track_elements_svg
                        .append("g")
                        .attr("transform", "translate(0," + (current_y) + ")")
                        .style("pointer-events", "none");

                    var region_scale_ctx = SeqPeekSVGContextFactory.createIntoSVG(region_track_svg)
                        .track(region_track);

                    region_scale_SVG_contexts.push(region_scale_ctx);

                    current_y = current_y + region_track.getHeight() + (index < array.length - 1 ? VERTICAL_PADDING : 0);
                });

                var tick_track = TickTrackFactory
                    .create()
                    .height(TICK_TRACK_HEIGHT)
                    .tick_height(10)
                    .tick_text_y(22)
                    .data(region_data);

                var tick_track_svg = d3.select(seqpeek_tick_track_element)
                    .append("svg")
                    .attr("width", VIEWPORT_WIDTH)
                    .attr("height", TICK_TRACK_HEIGHT)
                    .style("pointer-events", "none");

                var tick_ctx = SeqPeekSVGContextFactory.createIntoSVG(tick_track_svg)
                    .track(tick_track);

                var scroll_handler = function(event) {
                    common_viewport.setViewportPosition({
                        x: event.translate[0],
                        y: 0
                    });

                    var visible_coordinates = common_viewport._getVisibleCoordinates();
                    variant_layout.doLayoutForViewport(visible_coordinates, 'coordinate');

                    // Update viewport for each bar plot context
                    _.each(bar_plot_SVG_contexts, function(context) {
                        _.bind(context._updateViewportTranslation, context)();
                    });

                    // Scroll the region scale track context
                    _.each(region_scale_SVG_contexts, function(context) {
                        _.bind(context._updateViewportTranslation, context)();
                    });

                    // Scroll the tick track context
                    _.bind(tick_ctx._updateViewportTranslation, tick_ctx)();
                };

                _.chain(_.zip(bar_plot_tracks, bar_plot_SVG_contexts))
                    .each(function(bar_plot_info) {
                        var track = bar_plot_info[0],
                            context = bar_plot_info[1];

                        context
                            .width(VIEWPORT_WIDTH)
                            .scroll_handler(scroll_handler)
                            .track(track)
                            .viewport(common_viewport);
                    });

                var initial_viewport = bar_plot_SVG_contexts[0].getCurrentViewport();
                variant_layout.doLayoutForViewport(initial_viewport.getVisibleCoordinates(), 'coordinate');

                _.each(bar_plot_SVG_contexts, function(context) {
                    context.draw();
                });

                _.each(region_scale_SVG_contexts, function(context) {
                    context
                        .width(VIEWPORT_WIDTH)
                        .scroll_handler(scroll_handler)
                        .viewport(common_viewport)
                        .draw();
                });

                tick_ctx
                    .width(VIEWPORT_WIDTH)
                    .scroll_handler(scroll_handler)
                    .viewport(common_viewport)
                    .draw();
            },

            __filter_data: function(data_by_tumor_type) {
                console.debug("seqpeek/view.__filter_data:" + this.selected_gene);

                var lowercase_gene = this.selected_gene.toLowerCase();
                var filtered = {};
                _.each(data_by_tumor_type, function(data, tumor_type) {
                    if (_.isArray(data)) {
                        filtered[tumor_type.toUpperCase()] = _.filter(data, function(item) {
                            return (_.has(item, "gene") && _.isEqual(item["gene"], lowercase_gene));
                        }, this);
                    } else {
                        if (_.has(data, "gene") && _.isEqual(data["gene"], lowercase_gene)) {
                            filtered[tumor_type.toUpperCase()] = data;
                        }
                    }
                });
                return filtered;
            },

            __filter_features: function() {
                console.debug("seqpeek/view.__filter_features:" + this.selected_gene);

                var filtered = _.map(this.tumor_types, function(tumor_type) {
                    var model = this.model["features"]["by_tumor_type"][tumor_type];
                    var items = _.where(model.get("items"), { "gene": this.selected_gene });
                    return _.map(items, function(item) {
                        return _.extend({ "cancer": tumor_type }, item);
                    })
                }, this);

                return _.reduce(_.flatten(filtered), function (memo, feature) {
                        if (!_.has(memo, feature.cancer)) {
                            memo[feature.cancer] = [];
                        }
                        memo[feature.cancer].push(feature);
                        return memo;
                    }, {});
            },

            __parse_mutations: function () {
                console.debug("seqpeek/view.__parse_mutations");
                var items = this.model["mutations"].get("items");
                var data = {};
                _.each(_.groupBy(items, "cancer"), function (items, tumor_type) {
                    data[tumor_type.toLowerCase()] = items;
                }, this);
                return data;
            },

            __parse_mutsig: function () {
                console.debug("seqpeek/view.__parse_mutsig");
                return _.reduce(this.model["mutsig"].get("items"), function (memo, feature) {
                    if (!_.has(memo, feature.cancer)) {
                        memo[feature.cancer] = [];
                    }
                    memo[feature.cancer].push(feature);
                    return memo;
                }, {});
            }
        });
    });
