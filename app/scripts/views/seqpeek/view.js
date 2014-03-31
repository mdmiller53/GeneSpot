define([
    "jquery", "underscore", "backbone", "d3",

    'seqpeek/builders/builder_for_existing_elements',

    "hbs!templates/seqpeek/mutations_map",
    "hbs!templates/seqpeek/mutations_map_table"
],
    function (
        $,
        _,
        Backbone,
        d3,

        SeqPeekBuilder,

        MutationsMapTpl,
        MutationsMapTableTpl
    ) {

        var VARIANT_TRACK_MAX_HEIGHT = 100,
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

                var seqpeek_data = [],
                    max_location = 0;

                // Find maximum protein location to create region data
                _.each(this.tumor_types, function (tumor_type) {
                    _.each(mutations[tumor_type], function(variant) {
                        if (variant['location'] > max_location) {
                            max_location = variant['location'];
                        }
                    });
                });

                var region_data = [ { "type": "exon", "start": 0, "end": max_location + 10 } ];

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
                this.__render_tracks(seqpeek_data, region_data, seqpeek_tick_track_element);
            },

            __render_tracks: function(mutation_data, region_array, seqpeek_tick_track_element) {
                console.debug("seqpeek/view.__render_tracks");

                var seqpeek = SeqPeekBuilder.create({
                    region_data: region_array,
                    viewport: {
                        width: VIEWPORT_WIDTH
                    },
                    bar_plot_tracks: {
                        bar_width: 5.0,
                        height: VARIANT_TRACK_MAX_HEIGHT,
                        stem_height: 30
                    },
                    sample_plot_tracks: {
                        height: VARIANT_TRACK_MAX_HEIGHT,
                        stem_height: 30,
                        color_scheme: {
                            Nonsense_Mutation: "red",
                            Silent: "green",
                            Frame_Shift_Del: "gold",
                            Frame_Shift_Ins: "gold",
                            Missense_Mutation: "blue"
                        }
                    },
                    region_track: {
                        height: REGION_TRACK_HEIGHT
                    },
                    tick_track: {
                        height: TICK_TRACK_HEIGHT
                    },
                    region_layout: {
                        intron_width: 5
                    },
                    variant_layout: {
                        variant_width: 5.0
                    },
                    variant_data_location_field: 'location',
                    variant_data_type_field: 'mutation_type'
                });

                _.each(mutation_data, function(track_obj) {
                    var current_y = 0;

                    var track_elements_svg = d3.select(track_obj.target_element)
                        .append("svg")
                        .attr("width", VIEWPORT_WIDTH)
                        .attr("height", VARIANT_TRACK_MAX_HEIGHT + REGION_TRACK_HEIGHT)
                        .style("pointer-events", "none");

                    var bar_plot_track_svg = track_elements_svg
                        .append("g")
                        .attr("transform", "translate(0," + current_y + ")")
                        .style("pointer-events", "none");

                    current_y = current_y + VARIANT_TRACK_MAX_HEIGHT;

                    var region_track_svg = track_elements_svg
                        .append("g")
                        .attr("transform", "translate(0," + (current_y) + ")")
                        .style("pointer-events", "none");

                    seqpeek.addSamplePlotTrackWithArrayData(track_obj.variants, bar_plot_track_svg);
                    seqpeek.addRegionScaleTrackToElement(region_track_svg);
                });

                var tick_track_svg = d3.select(seqpeek_tick_track_element)
                    .append("svg")
                    .attr("width", VIEWPORT_WIDTH)
                    .attr("height", TICK_TRACK_HEIGHT)
                    .style("pointer-events", "none");

                seqpeek.addTickTrackToElement(tick_track_svg);

                seqpeek.draw();
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
