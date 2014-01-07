define(
[
    'backbone'
], function
(
    Backbone
) {

return Backbone.Model.extend({
    initialize: function (attributes, options) {
        this.options = options;

        _.bindAll(this, "parseMutationData");
    },

    fetch: function (param_options) {
        var that = this;

        var gene,
            cancers;

        if (_.has(param_options, "data")) {
            gene = param_options.data.gene;
            if (_.isArray(param_options.data.gene)) {
                gene = param_options.data.gene[0];
            }

            cancers = param_options.data.cancer;
        }
        else {
            gene = this.default_gene.toLowerCase();
            cancers = _.map(this.default_cancer_types, function(x) {return x.toLowerCase();});
        }
        var data = {
            mutations: [],
            subtype_map: {}
        };

        var service_uri = this.options["data_uri"];
        var protein_db = "svc/" + this.options["catalog_unit"]["protein_db"];
        var successFn = this.parseMutationData;

        var mutationsLoadedFn = _.after(cancers.length, function () {
            var found_subtypes = _.keys(data.subtype_map);
            if (found_subtypes.length > 0) {
                var uniprot_id = data.subtype_map[found_subtypes[0]][0].uniprot_id;

                $.when(
                    $.ajax({
                        type: "GET",
                        url: protein_db,
                        data: {
                            "uniprot_id": uniprot_id
                        },
                        context: this,
                        dataType: "json",
                        error: function() {
                            console.error("Error while loading InterPro data");
                        }
                    }),
                    that.getMutSigRankingsAjaxObject([gene], cancers)
                ).done(function(interpro_result, mutsig_result) {
                    data.interpro = interpro_result[0].items;
                    data.mutsig = _.reduce(mutsig_result[0].items, function(memo, rank_data) {
                        memo[rank_data.cancer] = rank_data;
                        return memo;
                    }, {});

                    successFn(data);
                });
            }
        });

        _.each(cancers, function (cancer_label) {
            $.ajax({
                "type": "GET",
                "url": service_uri,
                "traditional": true,
                "data": {
                    "cancer": cancer_label,
                    "gene": gene
                },
                "context": this,
                success: function (json) {
                    if (json.items.length > 0) {
                        data.subtype_map[cancer_label] = json.items;
                    }
                    mutationsLoadedFn();
                }
            });
        });
    },

    getMutSigRankingsAjaxObject: function(gene_list, cancer_list) {
        var query = [];

        _.each(gene_list, function(v) {
            query.push({name: "gene", value: v});
        });
        _.each(cancer_list, function(v) {
            query.push({name: "cancer", value: v});
        });

        return $.ajax({
            type: "GET",
            url: "svc/" + this.options.catalog_unit.mutsig_rankings_service,
            context: this,
            dataType: 'json',
            data: query
        });
    },


    parseMutationData: function (data) {
        if (data.interpro === undefined || _.keys(data.subtype_map).length == 0) {
            return;
        }
        this.set("data", {
            protein: _.extend(data.interpro[0], { domains: data.interpro[0].matches }),
            cancer_subtypes: _.map(data.subtype_map, function (mutations, cancer_label) {
                return { "label": cancer_label, "mutations": mutations };
            }),
            mutsig: data.mutsig
        });
        this.trigger("load");
    }
});

// end define
});
