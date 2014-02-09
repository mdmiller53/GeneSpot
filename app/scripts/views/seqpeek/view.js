define([
    "jquery", "underscore", "backbone", "vq",
    "views/gs/gene_region_utils",
    "views/seqpeek/vis",
    "hbs!templates/seqpeek/mutations_map",
    "hbs!templates/seqpeek/mutations_map_table"
],
    function ($, _, Backbone, vq, GeneRegionUtils, SeqPeekFactory, MutationsMapTpl, MutationsMapTableTpl) {

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
                    var m = this.model["features"][tumor_type];
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
                _.each(mutations, function (mutation_data, tumor_type) {
                    if (_.isEmpty(mutation_data)) return;

                    var seqpeek_el = _.first(this.$("#seqpeek-row-" + tumor_type));
                    this.__render_track(mutation_data, region_data, seqpeek_el);
                }, this);
            },

            __render_track: function (all_variants, region_data, element) {
                console.debug("seqpeek/view.__render_track");
                var transcript_track = this.__process_track(all_variants, region_data);

                var data = {
                    protein: {
                        domains: [],
                        length: 100,
                        name: "TEST",
                        uniprot_id: "TEST"
                    },
                    tracks: [
                        _.extend(transcript_track, {
                            label: ""
                        })
                    ]
                };

                var options = {
                    location_tick_height: 25,
                    protein_scale: {
                        width: 1000,
                        vertical_padding: 10
                    },
                    protein_domains: {
                        padding: 10,
                        key: "dbname"
                    },
                    signature_height: 10,
                    enable_transitions: false,
                    enable_mutation_stems: true,
                    mutation_layout: "all_subtypes",
                    variant_layout: "all_subtypes",
                    mutation_groups: {
                        padding: 0,
                        stems: {
                            height: 20,
                            stroke_width: 1.0
                        }
                    },
                    mutation_shape_width: 5,
                    mutation_order: [
                        "SUBSTITUTION",
                        "POSSIBLE-SPLICE5/SUBSTITUTION"
                    ],
                    mutation_sample_id_field: "patient_id",
                    variant_color_field: "type",
                    variant_colors: {
                        SUBSTITUTION: "red",
                        "POSSIBLE-SPLICE5/SUBSTITUTION": "green",
                        Frame_Shift_Del: "gold",
                        Frame_Shift_Ins: "gold",
                        Missense_Mutation: "blue"
                    },
                    mutation_label_rows: [
                        {label: "ID", name: "mutation_id"},
                        {label: "Location", name: "location"}
                    ],
                    plot: {
                        horizontal_padding: 0,
                        vertical_padding: 0
                    },
                    band_label_width: 0,
                    tooltips: {
                        interpro: {
                            items: {
                                "DB": function (d) {
                                    return d.dbname;
                                },
                                "EVD": function (d) {
                                    return d.evd;
                                },
                                "ID": function (d) {
                                    return d.id;
                                },
                                "Name": function (d) {
                                    return d.name;
                                },
                                "Status": function (d) {
                                    return d.status;
                                },
                                "LOC": function (d) {
                                    return d.location.start + " - " + d.location.end;
                                }
                            }
                        }
                    }
                };

                var vis = SeqPeekFactory.create(element);
                vis.draw(data, options);
                console.debug("seqpeek/view.__render_track:vis:ready");
            },

            __process_track: function (param_variants, region_data) {
                console.debug("seqpeek/view.__process_track");
                var variant_hovercard_items = {
                    "Location": function (d) {
                        return d.location;
                    },
                    "Mutation Type": function (d) {
                        return d.mutation_type;
                    },
                    "Samples": function (d) {
                        return d.sample_ids.length;
                    }
                };

                var region_hovercard_items = {
                    "Type": function (d) {
                        return d.type;
                    },
                    "Coordinates": function (d) {
                        return d.start + ":" + d.end;
                    }
                };

                var proc_var = _.chain(param_variants)
                    .map(function (v) {
                        var sample_key = v.sample_id,
                            value = 1;

                        var obj = _.extend(v, {
                            mutation_id: v.protein_change,
                            source_id: v.sample_id,
                            value: value
                        });

                        return obj;
                    })
                    .value();

                var seqpeek_regions = GeneRegionUtils.buildRegionsFromArray(region_data);
                GeneRegionUtils.fillDataIntoRegions(seqpeek_regions, proc_var, "location");

                return {
                    type: "genomic",
                    label_mouseover_handler: function (label_data) {
                        console.debug("seqpeek/view.__process_track:mouseover:" + label_data);
                    },
                    variants: proc_var,
                    variant_coordinate_field: "location",
                    variant_id_field: "mutation_type",
                    variant_shape_width: 5,
                    tooltips: {
                        variants: {
                            items: variant_hovercard_items
                        },
                        regions: {
                            items: region_hovercard_items
                        }
                    },
                    region_data: seqpeek_regions
                };
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
                    var model = this.model["features"][tumor_type];
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
