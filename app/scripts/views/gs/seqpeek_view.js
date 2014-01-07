define   ([
    'backbone',
    'views/gs/seqpeek',
    'hbs!templates/gs/seqpeek',
    'hbs!templates/line_item',
    'vq'
],
function
(
    Backbone,
    jQuerySeqpeek,
    Template,
    LineItemTemplate,
    vq
) {

    return Backbone.View.extend({
        genes: [],
        cancers: [],
        current_subtypes: [],
        hideSelector: false,

        initialize: function (options) {
            //_.extend(this, options);
            _.bindAll(this, "initGeneSelector", "initGraph", "initCancerSelector", "reloadModel", "setContainerSize");

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

            this.reloadModel = _.throttle(this.reloadModel, 1000);

            if (!this.hideSelector) {
                this.initCancerSelector();
            }

            if (!_.isEmpty(this.genes)) {
                this.current_gene = this.genes[0];
            }

            this.initGeneSelector();

            this.model.on("load", this.initGraph);
            this.model.on("load", this.setContainerSize);
        },

        initGeneSelector: function () {
            this.$el.html(Template({ "selected_gene": this.current_gene }));

            var UL = this.$el.find(".seqpeek-gene-selector").empty();
            _.each(_.without(this.genes, this.current_gene), function(gene) {
                UL.append(LineItemTemplate({ "label":gene, "id":gene }));
            }, this);

            var _this = this;
            UL.find("li a").click(function(e) {
                _this.current_gene = $(e.target).data("id");
                _.defer(_this.reloadModel);
                _.defer(_this.initGeneSelector);
            });
        },

        initCancerSelector: function(txt) {
            var cancers = this.cancers,
                selected_cancers = this.cancers;

            _.each(cancers, function(cancer) {
                cancer = cancer.trim();
                if (selected_cancers.indexOf(cancer)) {
                    $(".cancer-selector").append(LineItemTemplate({"li_class":"active","a_class":"toggle-active","id":cancer,"label":cancer}));
                } else {
                    $(".cancer-selector").append(LineItemTemplate({"a_class":"toggle-active","id":cancer,"label":cancer}));
                }
            });
            $(".cancer-selector").sortable();

            var _this = this;
            $(".cancer-selector").find(".toggle-active").click(function(e) {
                $(e.target).parent().toggleClass("active");
                _this.current_subtypes = $(this).find("li.active a").data("id");
                _.defer(_this.reloadModel);
            });
        },

        reloadModel: function() {
            if (_.isEmpty(this.current_gene)) return;

            if (_.isEmpty(this.current_subtypes)) {
                this.current_subtypes = _.compact(_.map(this.$el.find(".cancer-selector li.active a"), function(lia) {
                    return $(lia).data("id");
                }));
            }

            if (_.isEmpty(this.current_subtypes)) {
                this.current_subtypes = this.options.cancers;
            }

            var mutModel = this.model;
            mutModel.fetch({
                "data": {
                    "gene": this.current_gene,
                    "cancer": this.current_subtypes
                },
                "traditional": true,
                success: function() {
                    mutModel.trigger("load");
                }
            });
        },

        findSampleNumbersByLocation: function(data) {
            var max_samples = 0;

            var samples_by_loc = _.chain(data)
                .groupBy('location')
                .reduce(function(memo, loc_group, location) {
                    memo[location] = _
                        .chain(loc_group)
                        .groupBy('mutation_id')
                        .reduce(function(type_memo, type_group, type_key) {
                            var num_samples = type_group.length;

                            type_memo[type_key] = {
                                num_samples: num_samples
                            };

                            if (num_samples > max_samples) {
                                max_samples = num_samples;
                            }

                            return type_memo;
                        }, {})
                        .value();

                    return memo;
                }, {})
                .value();

            return {
                samples_by_loc: samples_by_loc,
                max_samples: max_samples
            }
        },

        buildTracks: function(data, tracks_array) {
            var location_items = {
                "Protein loc": function(d) {
                    return d.location;
                },
                "AA": function(d) {
                    return d.start_aa + " - " + d.end_aa;
                },
                "Type": function(d) {
                    return d.mutation_type;
                }
            };

            var sample_items = {
                "Patient ID": function(d) {
                    return d.id;
                }
            };

            var all_mutations = [];
            _.each(data.cancer_subtypes, function(track) {
                _.chain(track.mutations)
                    .filter(function(d) {
                        return d.uniprot_id != 'UNIPROT_FAIL';
                    })
                    .each(function(m) {
                        all_mutations.push({
                            mutation_id: m.mutation_id,
                            location: m.location,
                            sample_ids: _.clone(m.sample_ids)
                        })
                    });
            });

            var sample_info = this.findSampleNumbersByLocation(all_mutations);

            _.each(data.cancer_subtypes, function(track) {
                var mutsig_rank = data.mutsig[track.label.toLowerCase()].rank,
                    label = mutsig_rank + " " + track.label;

                tracks_array.push({
                    type: 'samples',
                    label: label,
                    mutations: _.filter(track.mutations, function(d) {
                        return d.uniprot_id != 'UNIPROT_FAIL';
                    }),
                    layout: {
                        protein_scale_line: {
                            enabled: true,
                            y: 0
                        },
                        protein_scale_ticks: {
                            enabled: false,
                            y: 0
                        },
                        protein_domains: {
                            enabled: false
                        },
                        mutation_stems: {
                            enabled: true
                        }
                    },
                    tooltips: {
                        location: {
                            items: location_items
                        },
                        sample: {
                            items: sample_items
                        }
                    }
                });
            });

            tracks_array.push({
                type: 'samples',
                label: 'log10(N)',
                mutations: all_mutations,
                data: {
                    total_samples_by_location: sample_info.samples_by_loc,
                    max_samples: sample_info.max_samples
                },
                color_by: {
                    color_scale: d3.scale.ordinal().domain(['all']).range(['#aaaaaa']),
                    type: 'log10naggr',
                    max_height: 70,
                    group_names: ['all'],
                    group_fn: function(samples, mutation) {
                        return {
                            all: sample_info.samples_by_loc[mutation.location][mutation.mutation_id].num_samples
                        };
                    }
                },
                layout: {
                    protein_scale_line: {
                        enabled: true,
                        y: 0
                    },
                    protein_scale_ticks: {
                        enabled: true,
                            y: 0
                    },
                    protein_domains: {
                        enabled: true
                    },
                    mutation_stems: {
                        enabled: false
                    }
                },
                tooltips: {
                    location: {
                        items: {
                            "Protein loc": function(d) {
                                return d.location;
                            },
                            "Samples": function(mutation) {
                                return mutation.sample_ids.length;
                            }
                        }
                    }
                }
            });
        },

        initGraph: function () {
            if (!this.current_gene) return;

            var model_data = this.model.get("data"),
                tracks = [];

            this.buildTracks(model_data, tracks);

            var vis_data = {
                protein: model_data.protein,
                tracks: tracks
            };

            var options = {
                location_tick_height: 25,
                protein_scale: {
                    width: 1200,
                    vertical_padding: 10
                },
                protein_domains: {
                    padding: 10,
                    key: 'dbname'
                },
                signature_height: 10,
                enable_transitions: false,
                mutation_layout: 'all_subtypes',
                mutation_groups: {
                    padding: 0,
                    stems: {
                        height: 15,
                        stroke_width: 1.0
                    }
                },
                mutation_shape_width: 2.0,
                mutation_order: [
                    "Silent",
                    "Nonsense_Mutation",
                    "Frame_Shift_Del",
                    "Frame_Shift_Ins",
                    "Missense_Mutation"
                ],
                mutation_sample_id_field: 'patient_id',
                mutation_color_field: 'mutation_type',
                mutation_colors: {
                    Nonsense_Mutation: 'red',
                    Silent: 'green',
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
                    vertical_padding: 20
                },
                band_label_width: 140,
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

            this.$el.find(".seqpeek-container").seqpeek(vis_data, options);
        },

        setContainerSize: function() {
            var size = this.$el.find(".seqpeek-container").seqpeek("get_size");
            this.$el.find(".seqpeek-container").css("width", size.width).css("height", size.height + 20);
        }
    });

// end define
});
