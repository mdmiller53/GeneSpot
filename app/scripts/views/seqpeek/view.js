define([
    "jquery", "underscore", "backbone", "d3", "vq",
    "models/gs/protein_domain_model",
    "seqpeek/util/data_adapters",
    "seqpeek/builders/builder_for_existing_elements",
    "views/seqpeek/sample_list_operations_view",
    "hbs!templates/seqpeek/mutations_map",
    "hbs!templates/seqpeek/mutations_map_table",
    "hbs!templates/seqpeek/sample_list_dropdown_caption"
],
    function ($, _, Backbone, d3, vq,
              ProteinDomainModel, SeqPeekDataAdapters, SeqPeekBuilder,
              SampleListOperationsView,
              MutationsMapTpl, MutationsMapTableTpl,
              SampleListCaptionTpl
        ) {
        var VARIANT_TRACK_MAX_HEIGHT = 150;
        var TICK_TRACK_HEIGHT = 25;
        var REGION_TRACK_HEIGHT = 10;
        var PROTEIN_DOMAIN_TRACK_HEIGHT = 40;
        var VIEWPORT_WIDTH = 1000;

        var POSITION_FIELD_NAME = "amino_acid_position";
        var TYPE_FIELD_NAME = "mutation_type";
        var AMINO_ACID_MUTATION_FIELD_NAME = "amino_acid_mutation";
        var AMINO_ACID_WILDTYPE_FIELD_NAME = "amino_acid_wildtype";
        var DNA_CHANGE_FIELD_NAME = "dna_change";

        var GROUP_BY_CATEGORIES = {
            "Mutation Type": TYPE_FIELD_NAME,
            "DNA Change": DNA_CHANGE_FIELD_NAME,
            "Protein Change": function(data_row) {
                return data_row[AMINO_ACID_MUTATION_FIELD_NAME] + "-" + data_row[AMINO_ACID_WILDTYPE_FIELD_NAME];
            }
        };

        var MUTATION_TYPE_COLOR_MAP = {
            Nonsense_Mutation: "red",
            Silent: "green",
            Frame_Shift_Del: "gold",
            Frame_Shift_Ins: "gold",
            Missense_Mutation: "blue"
        };

        var LOLLIPOP_COLOR_SCALE = d3.scale.category20();

        var COLOR_BY_CATEGORIES = {
            "Mutation Type": function(data_point) {
                return MUTATION_TYPE_COLOR_MAP[data_point[TYPE_FIELD_NAME]];
            },
            "DNA Change": function(data_point) {
                return LOLLIPOP_COLOR_SCALE(data_point[DNA_CHANGE_FIELD_NAME]);
            },
            "Protein Change": function(data_point) {
                var id = data_point[AMINO_ACID_MUTATION_FIELD_NAME] + "-" + data_point[AMINO_ACID_WILDTYPE_FIELD_NAME];
                return LOLLIPOP_COLOR_SCALE(id);
            }
        };

        var COLOR_BY_CATEGORIES_FOR_BAR_PLOT = {
            "Mutation Type": function(category_name, type_name) {
                return MUTATION_TYPE_COLOR_MAP[type_name];
            },
            "DNA Change": function(category_name, type_name) {
                return LOLLIPOP_COLOR_SCALE(type_name);
            },
            "Protein Change": function(category_name, type_name) {
                return LOLLIPOP_COLOR_SCALE(type_name);
            }
        };

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
                },

                "click .dropdown-menu.group_by_selector a": function(e) {
                    var group_by = $(e.target).data("id");
                    this.selected_group_by = GROUP_BY_CATEGORIES[group_by];
                    this.selected_bar_plot_color_by = COLOR_BY_CATEGORIES_FOR_BAR_PLOT[group_by];

                    console.debug("seqpeek/group-by-selector:" + group_by);

                    this.$(".dropdown-menu.group_by_selector").find(".active").removeClass("active");
                    $(e.target).parent("li").addClass("active");

                    this.__render();
                },

                "click .dropdown-menu.color_by_selector a": function(e) {
                    var color_by = $(e.target).data("id");
                    this.selected_color_by = COLOR_BY_CATEGORIES[color_by];

                    console.debug("seqpeek/color-by-selector:" + color_by);

                    this.$(".dropdown-menu.color_by_selector").find(".active").removeClass("active");
                    $(e.target).parent("li").addClass("active");

                    this.__render();
                },

                "click .btn.seqpeek-zoom-enable": function(e) {
                    this.__enable_seqpeek_zoom();
                },

                "click .btn.seqpeek-selection-enable": function(e) {
                    this.__enable_seqpeek_selection();
                },

                "click .btn.seqpeek-toggle-bars": function(e) {
                    if (this.sample_track_type_user_setting == "bar_plot") {
                        this.sample_track_type_user_setting = "sample_plot";
                    }
                    else {
                        this.sample_track_type_user_setting = "bar_plot";
                    }
                    this.__render();
                },

                "click .add-new-list": function() {
                    this.__store_sample_list();
                }
            },

            initialize: function () {
                this.model = this.options["models"];

                this.selected_group_by = GROUP_BY_CATEGORIES["Mutation Type"];
                this.selected_color_by = COLOR_BY_CATEGORIES["Mutation Type"];
                this.selected_bar_plot_color_by = COLOR_BY_CATEGORIES_FOR_BAR_PLOT["Mutation Type"];

                this.sample_track_type = "sample_plot";
                this.sample_track_type_user_setting = null;

                this.selected_patient_ids = [];

                this.samplelists = WebApp.getItemSets();

                this.sample_list_op_view = new SampleListOperationsView({
                    collection: this.samplelists
                });

                this.sample_list_op_view.on("list:union", this.__sample_list_union, this);

                this.samplelists.on("add", this.__update_stored_samplelists, this);
                this.samplelists.on("remove", this.__update_stored_samplelists, this);
            },

            render: function() {
                console.debug("seqpeek/view.render");

                this.tumor_types = this.options["tumor_types"];
                this.genes = this.options["genes"] || [];
                if (!_.isEmpty(this.genes)) this.selected_gene = _.first(this.genes);

                var renderFn = _.after(1 + (2 * this.tumor_types.length), this.__load_protein_domains);

                this.model["mutsig"].on("load", renderFn, this);

                _.each(this.model["mutations"]["by_tumor_type"], function(model) {
                    model.on("load", renderFn, this);
                }, this);
                _.each(this.model["mutated_samples"]["by_tumor_type"], function(model) {
                    model.on("load", renderFn, this);
                }, this);

                this.$el.html(MutationsMapTpl({
                    "selected_gene": this.selected_gene,
                    "genes": this.genes,
                    "selected_group_by": "Mutation Type",
                    "group_by_categories": _.keys(GROUP_BY_CATEGORIES),
                    "color_by_categories": _.keys(COLOR_BY_CATEGORIES)
                }));

                this.$(".mutations_map_table").html(MutationsMapTableTpl({
                    "items": _.map(this.tumor_types, function (tumor_type) {
                        return { "tumor_type_label": tumor_type };
                    })
                }));

                this.__update_sample_list_dropdown();

                this.$el.find(".sample-list-operations").html(this.sample_list_op_view.render().el);

                // Stop the dropdown from being hidden when the text field is clicked
                this.$(".new-list-name").on("click", function(event) {
                    event.stopPropagation();
                });

                return this;
            },

            __render: function () {
                console.debug("seqpeek/view.__render");

                this.$(".mutations_map_table").html("");

                var mutations = this.__filter_data(this.__parse_mutations());
                var mutsig_ranks = this.__filter_mutsig_data(this.__parse_mutsig());

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
                        statistics.samples.numberOf = _.chain(mutations[tumor_type])
                            .pluck('patient_id')
                            .unique()
                            .value()
                            .length;
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
                                            percentOf: "NA"
                                        };
                                    }
                                }
                            }
                        }
                    }

                    var mutsig_rank;
                    var tumor_type_lower = tumor_type.toLowerCase();

                    if (_.has(mutsig_ranks, tumor_type_lower)) {
                        var mutsig_data = mutsig_ranks[tumor_type_lower];
                        if (!_.isEmpty(mutsig_data)) {
                            mutsig_rank = _.first(mutsig_data)["rank"];
                        }
                    }

                    return {
                        tumor_type_label: tumor_type,
                        tumor_type: tumor_type,
                        mutsig_rank: mutsig_rank,
                        statistics: statistics
                    };
                }, this);

                var seqpeek_data = [];

                var uniprot_id = this.gene_to_uniprot_mapping[this.selected_gene];
                var protein_data = this.found_protein_domains[uniprot_id];

                var region_data = [ { "type": "exon", "start": 0, "end": protein_data["length"] } ];

                _.each(this.tumor_types, function (tumor_type) {
                    var variants = mutations[tumor_type];
                    if (_.isEmpty(variants)) return;

                    seqpeek_data.push({
                        variants: variants,
                        tumor_type: tumor_type
                    });
                }, this);

                // Aggregate the data and create the element for the summary track
                var summary_track_info = this.__create_data_for_summary_track(seqpeek_data);
                var total_unique_samples = _.chain(summary_track_info.variants)
                    .pluck('patient_id')
                    .unique()
                    .value()
                    .length;

                this.$(".mutations_map_table").html(MutationsMapTableTpl({
                    "items": data_items,
                    "total": {
                        samples: total_unique_samples,
                        percentOf: "NA"
                    }}));

                _.each(seqpeek_data, function(track_obj) {
                    track_obj.target_element = _.first(this.$("#seqpeek-row-" + track_obj.tumor_type))
                }, this);

                summary_track_info.target_element = _.first(this.$("#seqpeek-all-row"));
                seqpeek_data.push(summary_track_info);

                var seqpeek_tick_track_element = _.first(this.$("#seqpeek-tick-element"));
                var seqpeek_domain_track_element = _.first(this.$("#seqpeek-protein-domain-element"));

                this.maximum_samples_in_location = this.__find_maximum_samples_in_location(seqpeek_data);
                if (this.maximum_samples_in_location >= this.options.bar_plot_threshold) {
                    this.sample_track_type = "bar_plot";
                }

                if (this.sample_track_type_user_setting === null) {
                    this.sample_track_type_user_setting = this.sample_track_type;
                }

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
                        stem_height: 30,
                        color_scheme: this.selected_bar_plot_color_by
                    },
                    sample_plot_tracks: {
                        height: VARIANT_TRACK_MAX_HEIGHT,
                        stem_height: 30,
                        color_scheme: this.selected_color_by
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
                    variant_data_location_field: POSITION_FIELD_NAME,
                    variant_data_type_field: this.selected_group_by,
                    variant_data_source_field: "patient_id",
                    selection_handler: _.bind(this.__seqpeek_selection_handler, this)
                });

                _.each(mutation_data, function(track_obj) {
                    var track_guid = "C" + vq.utils.VisUtils.guid();
                    var track_elements_svg = d3.select(track_obj.target_element)
                        .append("svg")
                        .attr("width", VIEWPORT_WIDTH)
                        .attr("height", VARIANT_TRACK_MAX_HEIGHT + REGION_TRACK_HEIGHT)
                        .attr("id", track_guid)
                        .style("pointer-events", "none");

                    var sample_plot_track_g = track_elements_svg
                        .append("g")
                        .style("pointer-events", "none");

                    var region_track_g = track_elements_svg
                        .append("g")
                        .style("pointer-events", "none");

                    track_obj.track_info = this.__add_data_track(track_obj, seqpeek, track_guid, sample_plot_track_g);
                    track_obj.variant_track_svg = track_elements_svg;

                    seqpeek.addRegionScaleTrackToElement(region_track_g, {
                        guid: track_guid,
                        hovercard_content: {
                            "Protein length": function () {
                                return protein_data["length"];
                            },
                            "Name": function () {
                                return protein_data["name"];
                            },
                            "UniProt ID": function () {
                                return protein_data["uniprot_id"];
                            }
                        },
                        hovercard_links: {
                            "UniProt": {
                                label: "UniProt",
                                url: '/',
                                href: "http://www.uniprot.org/uniprot/" + protein_data["uniprot_id"]
                            }
                        }
                    });

                    track_obj.region_track_svg = region_track_g;
                }, this);

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
                    },
                    hovercard_links: {
                        "InterPro Domain Entry": {
                            label: 'InterPro',
                            url: '/',
                            href: function(param) {
                                var ipr_id = param["ipr"]["id"];
                                return "http://www.ebi.ac.uk/interpro/entry/" + ipr_id;
                            }
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

                this.seqpeek = seqpeek;
            },

            __find_maximum_samples_in_location: function(mutation_data) {
                var track_maximums = [];
                _.each(mutation_data, function(track_obj) {
                    var grouped_data = SeqPeekDataAdapters.group_by_location(track_obj.variants, this.selected_group_by, POSITION_FIELD_NAME);
                    SeqPeekDataAdapters.apply_statistics(grouped_data, function() {return 'all';});

                    var max_number_of_samples_in_position = d3.max(grouped_data, function(data_by_location) {
                        return d3.max(data_by_location["types"], function(data_by_type) {
                            return data_by_type.statistics.total;
                        });
                    });

                    track_maximums.push(max_number_of_samples_in_position);
                }, this);

                return d3.max(track_maximums);
            },

            __add_data_track: function(track_obj, seqpeek_builder, track_guid, track_target_svg) {
                var track_type = track_obj.track_type || this.sample_track_type_user_setting;

                if (track_type == "sample_plot") {
                     return seqpeek_builder.addSamplePlotTrackWithArrayData(track_obj.variants, track_target_svg, {
                        guid: track_guid,
                        hovercard_content: {
                            "Location": function (d) {
                                return d[POSITION_FIELD_NAME];
                            },
                            "Amino Acid Mutation": function (d) {
                                return d[AMINO_ACID_MUTATION_FIELD_NAME];
                            },
                            "Amino Acid Wildtype": function (d) {
                                return d[AMINO_ACID_WILDTYPE_FIELD_NAME];
                            },
                            "DNA change": function (d) {
                                return d[DNA_CHANGE_FIELD_NAME];
                            },
                            "Type": function (d) {
                                return d[TYPE_FIELD_NAME];
                            },
                            "Patient ID": function (d) {
                                return d["patient_id"];
                            },
                            "UniProt ID": function (d) {
                                return d["uniprot_id"];
                            }
                        }
                    });
                }
                else {
                    return seqpeek_builder.addBarPlotTrackWithArrayData(track_obj.variants, track_target_svg, {
                        guid: track_guid,
                        hovercard_content: {
                            "Location": function (d) {
                                return d["coordinate"];
                            },
                            "Type": function (d) {
                                return d["type"];
                            },
                            "Number": function (d) {
                                return d["statistics"]["total"];
                            }
                        },
                        max_samples_in_location: this.maximum_samples_in_location
                    });
                }
            },

            __filter_data: function(data_by_tumor_type) {
                console.debug("seqpeek/view.__filter_data:" + this.selected_gene);

                var lowercase_gene = this.selected_gene.toLowerCase();
                var filtered = {};

                // Filter out rows that do not have the amino acid position field present,
                // as drawing variants based on chromosome coordinates is not currently supported.
                _.each(data_by_tumor_type, function(data, tumor_type) {
                    if (_.isArray(data)) {
                        filtered[tumor_type] = _.filter(data, function(item) {
                            return (_.has(item, "gene") &&
                                _.isEqual(item["gene"].toLowerCase(), lowercase_gene) &&
                                _.has(item, POSITION_FIELD_NAME));
                        }, this);
                    } else {
                        if (_.has(data, "gene") && _.isEqual(data["gene"], lowercase_gene)) {
                            filtered[tumor_type] = data;
                        }
                    }
                });
                return filtered;
            },

            __filter_mutsig_data: function(data_by_tumor_type) {
                console.debug("seqpeek/view.__filter_mutsig_data:" + this.selected_gene);

                var lowercase_gene = this.selected_gene.toLowerCase();
                var filtered = {};

                _.each(data_by_tumor_type, function(data, tumor_type) {
                    if (_.isArray(data)) {
                        filtered[tumor_type] = _.filter(data, function(item) {
                            return (_.has(item, "gene") && _.isEqual(item["gene"].toLowerCase(), lowercase_gene))
                        }, this);
                    } else {
                        if (_.has(data, "gene") && _.isEqual(data["gene"], lowercase_gene)) {
                            filtered[tumor_type] = data;
                        }
                    }
                });
                return filtered;
            },

            __create_data_for_summary_track: function(mutation_data) {
                var all_variants = [];

                _.each(mutation_data, function(track_obj) {
                    Array.prototype.push.apply(all_variants, track_obj.variants);
                }, this);

                return {
                    variants: all_variants,
                    tumor_type: "ALL",
                    track_type: "bar_plot"
                };
            },

            __parse_mutations: function () {
                console.debug("seqpeek/view.__parse_mutations");

                var data = {};
                _.each(this.model["mutations"]["by_tumor_type"], function(model, tumor_type) {
                    data[tumor_type] = model.get("items");
                }, this);
                return data;
            },

            __parse_mutsig: function () {
                console.debug("seqpeek/view.__parse_mutsig");
                return _.reduce(this.model["mutsig"].get("items"), function (memo, feature) {
                    if (!_.has(memo, feature.cancer.toLowerCase())) {
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
                var items = _.flatten(_.map(this.model["mutations"]["by_tumor_type"], function(model, tumor_type) {
                    return model.get("items");
                }));

                var gene_to_uniprot_mapping = _.reduce(items, function(memo, item) {
                    var gene_label = item["gene"];
                    if (!_.has(memo, gene_label)) {
                        memo[gene_label] = item["uniprot_id"];
                    }
                    return memo;
                }, {});

                return gene_to_uniprot_mapping;
            },

            __enable_seqpeek_zoom: function() {
                this.seqpeek.toggleZoomMode();
            },

            __enable_seqpeek_selection: function() {
                this.seqpeek.toggleSelectionMode();
            },

            __seqpeek_selection_handler: function(id_list) {
                this.selected_patient_ids = id_list;

                this.__update_sample_list_dropdown();
            },

            __update_sample_list_dropdown: function() {
                var num_selected = this.selected_patient_ids.length;
                var caption;

                if (num_selected == 0 || num_selected > 1) {
                    caption = num_selected + " Samples Selected";
                }
                else {
                    caption = "1 Sample Selected";
                }

                this.$el.find(".sample-list-dropdown").html(SampleListCaptionTpl({
                    caption: caption
                }));
            },

            __sample_list_union: function(target_list_model) {
                if (this.selected_patient_ids.length > 0) {
                    this.samplelists.updateSampleListByUnion(target_list_model["id"], this.selected_patient_ids);
                }
            },

            __store_sample_list: function() {
                var list_label = this.$el.find(".new-list-name").val();

                if (list_label.length == 0 || this.selected_patient_ids.length == 0) {
                    return;
                }

                this.$el.find(".new-list-name").val("");

                this.samplelists.addSampleList(label, this.selected_patient_ids);
            }
        });
    });
