define   ([
    'backbone',
    'views/gs/region_seqpeek',
    'hbs!templates/gs/mutations_map',
    'hbs!templates/line_item',
    'vq'
],
function (
    Backbone,
    SeqPeekFactory,
    MutationsMapTemplate,
    LineItemTemplate,
    vq
) {

return Backbone.View.extend({
    genes: [],
    cancers: [],
    selected_cancers: [],

    initialize: function (options) {
        _.bindAll(this, "initGeneSelector", "initGraph");

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

        this.model.on("change", this.initGraph);
    },

    initGeneSelector: function () {
        var UL = this.$el.find(".seqpeek-gene-selector").empty();
        _.each(_.without(this.genes, this.current_gene), function(gene) {
            UL.append(LineItemTemplate({ "label":gene, "id":gene }));
        }, this);

        var _this = this;
        UL.find("li a").click(function(e) {
            _this.current_gene = $(e.target).data("id");
            _.defer(_this.model.fetch({
                data: {
                    gene: _this.current_gene,
                    cancers: _this.cancers
                }
            }));
            _.defer(_this.initGraph);
            _.defer(_this.initGeneSelector);
        });
    },

    initGraph: function(changed) {
        this.$el.html("");

        var mutations = this.model.get("mutations"),
            features = this.model.get("features"),
            formatter = function(value) {
                return parseInt(value) + " %";
            };
            template_data = {
                selected_gene: this.current_gene,
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
                tumor_type: tumor_type,
                mutsig_rank: mutsig_data.rank,
                statistics: statistics
            });
        });

        this.$el.html(MutationsMapTemplate(template_data));
    }
});

// end define
});
