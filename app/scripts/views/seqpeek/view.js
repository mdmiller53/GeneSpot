define([
    "jquery", "underscore", "backbone", "vq",
    "views/gs/gene_region_utils",
    "views/seqpeek/vis",
    "hbs!templates/seqpeek/mutations_map",
    "hbs!templates/seqpeek/mutations_map_table"
],
    function ($, _, Backbone, vq, GeneRegionUtils, SeqPeekFactory, MutationsMapTpl, MutationsMapTableTpl) {

        return Backbone.View.extend({
            genes: [],
            cancers: [],
            selected_cancers: [],
            model: {},

            events: {
                "click .seqpeek-gene-selector li a": function(e) {
                    console.debug("seqpeek/gene-selector:" + $(e.target).data("id"));
                    this.selected_gene = $(e.target).data("id");
                    this.$el.find(".selected-gene").html(this.selected_gene);
                    this.__render();
                }
            },

            initialize: function () {
//                _.bindAll(this, "__render_features");

                this.model = this.options["models"];
                this.cancers = this.options["cancers"];
                this.genes = this.options["genes"];

                if (this.genes !== undefined && _.isArray(this.genes)) {
                    if (this.genes.length > 0) {
                        this.selected_gene = this.genes[0];
                    }
                    else {
                        this.genes = [this.options["default_gene"]];
                        this.selected_gene = this.genes[0];
                    }
                }
                else if (this.genes !== undefined && _.isString(this.genes)) {
                    this.selected_gene = this.genes;
                }
                else {
                    this.genes = [this.options["default_gene"]];
                    this.selected_gene = this.genes[0];
                }

                if (!_.isEmpty(this.genes)) {
                    this.selected_gene = this.genes[0];
                }

                this.model["mutations_map"].on("change", this.__render, this);
                _.each(this.model["features"], function(m, key) {
                    m.on("load", function() {
                        this.__render_features(key);
                    }, this);
                }, this);
            },

            render: function() {
                console.debug("seqpeek/view.render");

                this.$el.html(MutationsMapTpl({
                    "selected_gene": this.selected_gene,
                    "genes": this.genes
                }));

                this.$el.find(".mutations_map_table").html(MutationsMapTableTpl({
                    "items": _.map(this.cancers, function (tumor_type) {
                        return { "tumor_type_label": tumor_type };
                    })
                }));

                return this;
            },

            __render: function () {
                console.debug("seqpeek/view.__render");

                var mutations = this.__filter_data(this.model["mutations_map"], "mutations");
                var features = this.__filter_data(this.model["features"]);
                var mutsig_ranks = this.__filter_data(this.model["mutations_map"], "mutsig");

                var formatter = function (value) {
                    return parseInt(value) + "%";
                };
                var data_items = _.map(mutsig_ranks, function (mutsig_data, tumor_type) {
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

                    return {
                        tumor_type_label: tumor_type.toUpperCase(),
                        tumor_type: tumor_type,
                        mutsig_rank: _.first(mutsig_data).rank,
                        statistics: statistics
                    };
                });

                this.$el.find(".mutations_map_table").html(MutationsMapTableTpl({ "items": data_items }));

                var $table_el = this.$el.find(".mutations_map_table");
                var region_data = [ { "type": "exon", "start": 0, "end": 1000 } ];
                _.each(mutations, function (mutation_data, tumor_type) {
                    var seqpeek_el = _.first($table_el.find("#seqpeek-row-" + tumor_type));
                    this.__render_track(mutation_data, region_data, seqpeek_el);
                }, this);
            },

            __render_features: function(tumor_type) {
                console.debug("seqpeek/view.__render_features:" + tumor_type + "," + this.selected_gene);

                var tt_model = this.model["features"][tumor_type];
                if (tt_model) {
                    var features = _.where(tt_model.get("items"), { "gene": this.selected_gene });
                    console.debug("seqpeek/view.__render_features:" + tumor_type + "," + this.selected_gene + ":" + features.length);
                }

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

                try {
                    var vis = SeqPeekFactory.create(element);
                    vis.draw(data, options);
                    console.debug("seqpeek/view.__render_track:vis:ready");
                } catch (e) {
                    console.error("seqpeek/view.__render_track:vis:" + e);
                }
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
                        console.log("mouseover");
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

            __filter_data: function(model, model_id) {
                console.debug("seqpeek/view.__filter_data:" + model_id + "," + this.selected_gene);

                var data_by_tumor_type = (model_id) ? model.get(model_id) : model;
                var lowercase_gene = this.selected_gene.toLowerCase();
                var filtered = {};
                _.each(data_by_tumor_type, function(data, tumor_type) {
                    if (_.isArray(data)) {
                        filtered[tumor_type] = _.filter(data, function(item) {
                            return (_.has(item, "gene") && _.isEqual(item["gene"], lowercase_gene));
                        }, this);
                    } else {
                        if (_.has(data, "gene") && _.isEqual(data["gene"], lowercase_gene)) {
                            filtered[tumor_type] = data;
                        }
                    }
                });
                return filtered;
            }
        });
    });
