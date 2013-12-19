define   ([
    'backbone',
    'views/gs/gene_region_utils',
    'views/gs/region_seqpeek',
    'hbs!templates/gs/mutations_map',
    'hbs!templates/gs/mutations_map_table',
    'hbs!templates/line_item',
    'vq'
],
function (
    Backbone,
    GeneRegionUtils,
    SeqPeekFactory,
    MutationsMapTemplate,
    MutationsMapTableTemplate,
    LineItemTemplate,
    vq
) {

return Backbone.View.extend({
    genes: [],
    cancers: [],
    selected_cancers: [],

    initialize: function (options) {
        _.bindAll(this, "renderUI", "initGeneSelector", "initTable", "initSeqPeekTracks", "renderSeqPeek", "processData");

        this.cancers = this.options.cancers;
        this.genes = this.options.genes;

        if (this.genes !== undefined && _.isArray(this.genes)) {
            if (this.genes.length > 0) {
                this.current_gene = this.genes[0];
            }
            else {
                this.genes = [this.options.default_gene];
                this.current_gene = this.genes[0];
            }
        }
        else if (this.genes !== undefined && _.isString(this.genes)) {
            this.current_gene = this.genes;
        }
        else {
            this.genes = [this.options.default_gene];
            this.current_gene = this.genes[0];
        }

        if (!_.isEmpty(this.genes)) {
            this.current_gene = this.genes[0];
        }

        this.model.on("change", this.renderUI);
    },

    renderUI: function() {
        this.$el.html("");

        this.$el.html(MutationsMapTemplate({
            selected_gene: this.current_gene
        }));

        this.initGeneSelector();
        this.initTable();
        this.initSeqPeekTracks();
    },

    initGeneSelector: function () {
        var _this = this,
            UL = this.$el.find(".seqpeek-gene-selector").empty();

        _.chain(this.genes)
            .without(this.current_gene)
            .each(function(gene) {
                UL.append(LineItemTemplate({ "label":gene, "id":gene }));
            }, this);

        UL.find("li a").click(function(e) {
            _this.current_gene = $(e.target).data("id");
            _this.model.fetch({
                data: {
                    gene: _this.current_gene,
                    cancer: _this.cancers
                }
            });
        });
    },

    initTable: function(changed) {
        var $table_el = this.$el.find(".mutations_map_table");

        var mutations = this.model.get("mutations"),
            features = this.model.get("features"),
            formatter = function(value) {
                return parseInt(value) + " %";
            },
            template_data = {
                items: []
            };

        _.each(this.model.get("mutsig"), function(mutsig_data, tumor_type) {
            var statistics = {
                samples: {
                    numberOf: 0,
                    totals: {
                        percentOf: 'NA'
                    }
                }
            };

            if (_.has(mutations, tumor_type)) {
                statistics.samples.numberOf = mutations[tumor_type].length;
            }

            if (_.has(features, tumor_type)) {
                var values = features[tumor_type][0].values;

                var grouped = _.groupBy(values, function(v) {
                    return v;
                });

                statistics.samples.totals = _.extend({
                    percentOf: formatter(100 * statistics.samples.numberOf / grouped['1'].length)
                }, grouped);

            }

            template_data.items.push({
                tumor_type_label: tumor_type.toUpperCase(),
                tumor_type: tumor_type,
                mutsig_rank: mutsig_data.rank,
                statistics: statistics
            });
        });

        $table_el.html(MutationsMapTableTemplate(template_data));
    },

    initSeqPeekTracks: function() {
        var that = this,
            $table_el = this.$el.find(".mutations_map_table"),
            mutations = this.model.get("mutations");

        var region_data = [
            {
                type: 'exon',
                start: 0,
                end: 1000
            }
        ];

        _.each(this.model.get("mutsig"), function(mutsig_data, tumor_type) {
            if (_.has(mutations, tumor_type)) {
                var seqpeek_el = $table_el.find("#seqpeek-row-" + tumor_type);
                that.renderSeqPeek(mutations[tumor_type], region_data, seqpeek_el[0]);
            }
        });
    },

    renderSeqPeek: function(all_variants, region_data, element) {
        var transcript_track = this.processData(all_variants, region_data);

        var data = {
            protein: {
                domains: [],
                length: 100,
                name: 'TEST',
                uniprot_id: 'TEST'
            },
            tracks: [
                _.extend(transcript_track, {
                    label: 'GENOMIC TRACK'
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
                key: 'dbname'
            },
            signature_height: 10,
            enable_transitions: false,
            enable_mutation_stems: true,
            mutation_layout: 'all_subtypes',
            variant_layout: 'all_subtypes',
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
            mutation_sample_id_field: 'patient_id',
            variant_color_field: 'type',
            variant_colors: {
                SUBSTITUTION: 'red',
                "POSSIBLE-SPLICE5/SUBSTITUTION": 'green',
                Frame_Shift_Del: 'gold',
                Frame_Shift_Ins: 'gold',
                Missense_Mutation: 'blue'
            },
            mutation_label_rows: [
                {label: 'ID', name: 'mutation_id'},
                {label: 'Location', name: 'location'}
            ],
            plot: {
                horizontal_padding: 0,
                vertical_padding: 0
            },
            band_label_width: 180,
            tooltips: {
                interpro: {
                    items: {
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
                            return d.location.start + " - " + d.location.end;
                        }
                    }
                }
            }
        };

        var vis = SeqPeekFactory.create(element);
        vis.draw(data, options);
    },

    processData: function(param_variants, region_data) {
        var variant_hovercard_items = {
            "Location": function(d) {
                return d.location;
            },
            "Mutation Type": function(d) {
                return d.mutation_type;
            },
            "Samples": function(d) {
                return d.sample_ids.length;
            }
        };

        var region_hovercard_items = {
            "Type": function(d) {
                return d.type;
            },
            "Coordinates": function(d) {
                return d.start + ":" + d.end;
            }
        };

        var proc_var = _.chain(param_variants)
            .map(function(v) {
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
        GeneRegionUtils.fillDataIntoRegions(seqpeek_regions, proc_var, 'location');

        return {
            type: 'genomic',
            label_mouseover_handler: function(label_data) {
                console.log("mouseover");
            },
            variants: proc_var,
            variant_coordinate_field: 'location',
            variant_id_field: 'mutation_type',
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
    }
});

// end define
});
