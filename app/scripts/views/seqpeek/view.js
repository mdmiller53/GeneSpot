define([
    "jquery", "underscore", "backbone", "d3", "vq",
    "models/gs/protein_domain_model",
    "seqpeek/util/data_apapters",
    "seqpeek/builders/builder_for_existing_elements",
    "hbs!templates/seqpeek/mutations_map",
    "hbs!templates/seqpeek/mutations_map_table"
],
    function ($, _, Backbone, d3, vq,
              ProteinDomainModel, SeqPeekDataAdapters, SeqPeekBuilder, MutationsMapTpl, MutationsMapTableTpl) {
        var VARIANT_TRACK_MAX_HEIGHT = 150;
        var TICK_TRACK_HEIGHT = 25;
        var REGION_TRACK_HEIGHT = 10;
        var PROTEIN_DOMAIN_TRACK_HEIGHT = 40;
        var VIEWPORT_WIDTH = 1000;

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

                var renderFn = _.after(this.tumor_types.length + 2, this.__load_protein_domains);

                this.model["mutations"].on("load", renderFn, this);
                this.model["mutsig"].on("load", renderFn, this);

                _.each(this.model["mutated_samples"]["by_tumor_type"], function(model) {
                    model.on("load", renderFn, this);
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

                    var by_tumor_type = this.model["mutated_samples"]["by_tumor_type"];
                    if (by_tumor_type) {
                        var tt_model = by_tumor_type[tumor_type];
                        if (tt_model) {
                            var totals_per_gene_array = tt_model.get("items");
                            if (!_.isEmpty(totals_per_gene_array)) {
                                var stats_for_gene = _.findWhere(totals_per_gene_array, { "gene": this.selected_gene });
                                if (stats_for_gene && _.has(stats_for_gene, "numberOf")) {
                                    var total = stats_for_gene["numberOf"];
                                    if (_.isNumber(total)) {
                                        statistics.samples.totals = {
                                            percentOf: formatter(100 * statistics.samples.numberOf / total)
                                        };
                                    }
                                }
                            }
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
                }, this);

                this.$(".mutations_map_table").html(MutationsMapTableTpl({ "items": data_items }));

                var seqpeek_data = [];

                var uniprot_id = this.gene_to_uniprot_mapping[this.selected_gene.toLowerCase()];
                var protein_data = this.found_protein_domains[uniprot_id];

                var region_data = [ { "type": "exon", "start": 0, "end": protein_data["length"] } ];

                _.each(this.tumor_types, function (tumor_type) {
                    var variants = mutations[tumor_type];
                    if (_.isEmpty(variants)) return;

                    seqpeek_data.push({
                        variants: variants,
                        tumor_type: tumor_type,
                        target_element: _.first(this.$("#seqpeek-row-" + tumor_type))
                    });
                }, this);

                var seqpeek_tick_track_element = _.first(this.$("#seqpeek-tick-element"));
                var seqpeek_domain_track_element = _.first(this.$("#seqpeek-protein-domain-element"));

                this.__render_tracks(seqpeek_data, region_data, protein_data, seqpeek_tick_track_element, seqpeek_domain_track_element);
            },

            __render_tracks: function(mutation_data, region_array, protein_data, seqpeek_tick_track_element, seqpeek_domain_track_element) {
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
                    protein_domain_tracks: {
                        source_key: "dbname",
                        source_order: ["PFAM", "SMART", "PROFILE"],
                        color_scheme: {
                            "PFAM": "lightgray",
                            "SMART": "darkgray",
                            "PROFILE": "gray"
                        }
                    },
                    tick_track: {
                        height: TICK_TRACK_HEIGHT
                    },
                    region_layout: {
                        intron_width: 5,
                        exon_width: VIEWPORT_WIDTH
                    },
                    variant_layout: {
                        variant_width: 5.0
                    },
                    variant_data_location_field: "location",
                    variant_data_type_field: "mutation_type"
                });

                _.each(mutation_data, function(track_obj) {
                    var grouped_data = SeqPeekDataAdapters.group_by_location(track_obj.variants, "mutation_type", "location");
                    DataAdapters.apply_statistics(grouped_data, function() {return 'all';});

                    var track_guid = "C" + vq.utils.VisUtils.guid();
                    var track_elements_svg = d3.select(track_obj.target_element)
                        .append("svg")
                        .attr("width", VIEWPORT_WIDTH)
                        .attr("height", VARIANT_TRACK_MAX_HEIGHT + REGION_TRACK_HEIGHT)
                        .attr("id", track_guid)
                        .style("pointer-events", "none");

                    var sample_plot_track_svg = track_elements_svg
                        .append("g")
                        .attr("transform", "translate(0," + current_y + ")")
                        .style("pointer-events", "none");

                    var region_track_svg = track_elements_svg
                        .append("g")
                        .style("pointer-events", "none");

                    track_obj.track_info = seqpeek.addSamplePlotTrackWithArrayData(track_obj.variants, sample_plot_track_svg, {
                        guid: track_guid,
                        hovercard_content: {
                            "Location": function(d) {
                                return d.location;
                            },
                            "Protein change": function(d) {
                                return d.mutation_id;
                            },
                            "Type": function(d) {
                                return d.mutation_type;
                            },
                            "Patient ID": function(d) {
                                return d.patient_id;
                            },
                            "UniProt ID": function(d) {
                                return d.uniprot_id;
                            }
                        }
                    });
                    seqpeek.addRegionScaleTrackToElement(region_track_svg);

                    track_obj.variant_track_svg = track_elements_svg;
                    track_obj.region_track_svg = region_track_svg;
                });

                var tick_track_svg = d3.select(seqpeek_tick_track_element)
                    .append("svg")
                    .attr("width", VIEWPORT_WIDTH)
                    .attr("height", TICK_TRACK_HEIGHT)
                    .style("pointer-events", "none");

                seqpeek.addTickTrackToElement(tick_track_svg);

                var protein_domain_track_guid = "C" + vq.utils.VisUtils.guid();
                var protein_domain_track_svg = d3.select(seqpeek_domain_track_element)
                    .append("svg")
                    .attr("width", VIEWPORT_WIDTH)
                    .attr("height", PROTEIN_DOMAIN_TRACK_HEIGHT)
                    .attr("id", protein_domain_track_guid)
                    .style("pointer-events", "none");

                seqpeek.addProteinDomainTrackToElement(protein_data["matches"], protein_domain_track_svg, {
                    guid: protein_domain_track_guid,
                    hovercard_content: {
                        "DB": function(d) {
                            return d.dbname;
                        },
                        "EVD": function(d) {
                            return d.evd;
                        },
                        "ID": function(d) {
                            return d.id;
                        },
                        "Name": function(d) {
                            return d.name;
                        },
                        "Status": function(d) {
                            return d.status;
                        },
                        "LOC": function(d) {
                            return d.start + " - " + d.end;
                        }
                    }
                });

                seqpeek.createInstances();

                _.each(mutation_data, function(track_obj) {
                    var track_info = track_obj.track_info;
                    var track_instance = track_info.track_instance;

                    track_instance.setHeightFromStatistics();
                    var variant_track_height = track_instance.getHeight();
                    var total_track_height = variant_track_height + REGION_TRACK_HEIGHT;

                    track_obj.variant_track_svg.attr("height", total_track_height);
                    track_obj.region_track_svg
                        .attr("transform", "translate(0," + (variant_track_height) + ")")
                });

                seqpeek.render();
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
            },

            __load_protein_domains: function() {
                console.debug("seqpeek/view.__load_protein_domains");
                this.gene_to_uniprot_mapping = this.__find_protein_identifiers();
                var protein_ids = _.values(this.gene_to_uniprot_mapping);

                var protein_domain_model = new ProteinDomainModel({}, {
                    data_source: {
                        uri: this.options.protein_domains
                    }
                });

                protein_domain_model.on("change", function(changed) {
                    this.found_protein_domains = changed.toJSON();
                    this.__render();
                }, this);

                protein_domain_model.fetch({
                    protein_ids: protein_ids,
                    error: function(xhr, textStatus, errorThrown){
                        console.log([xhr, textStatus, errorThrown]);
                    }
                });
            },

            __find_protein_identifiers: function() {
                console.debug("seqpeek/view.__find_protein_identifiers");
                var items = this.model["mutations"].get("items");

                var gene_to_uniprot_mapping = _.reduce(items, function(memo, item) {
                    var gene_label = item["gene"];
                    if (!_.has(memo, gene_label)) {
                        memo[gene_label] = item["uniprot_id"];
                    }
                    return memo;
                }, {});

                return gene_to_uniprot_mapping;
            }
        });
    });
