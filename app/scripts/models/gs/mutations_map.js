define(
[
    'backbone'
], function (
    Backbone
) {

    return Backbone.Model.extend({
        constructor: function(attributes, options) {
            this.options = attributes;

            Backbone.Model.apply(this, {});
        },

        initialize: function (attributes, options) {
            this.loaded_data = {
                mutations: {}
            };

            _.bindAll(this, "parseSingleCancerMutations", "parseMutsig", "parseFeatures");
        },

        parseSingleCancerMutations: function(cancer, result) {
            var items = result[0].items;
            if (items.length > 0) {
                this.loaded_data.mutations[cancer.toLowerCase()] = items;
            }
        },

        parseMutsig: function(cancer_list, result) {
            var items = result[0].items;

            this.loaded_data.mutsig = _.reduce(items, function(memo, rank_data) {
                memo[rank_data.cancer] = rank_data;
                return memo;
            }, {});
        },

        parseFeatures: function(cancer_list, result) {
            var items = result[0].items;
            this.loaded_data.features = _.reduce(items, function(memo, feature) {
                if (!_.has(memo, feature.cancer)) {
                    memo[feature.cancer] = [];
                }
                memo[feature.cancer].push(feature);
                return memo;
            }, {});
        },

        getMutSigRankingsDeferred: function(gene_list, cancer_list) {
            var query = [];

            _.each(gene_list, function(v) {
                query.push({name: "gene", value: v});
            });
            _.each(cancer_list, function(v) {
                query.push({name: "cancer", value: v});
            });

            return $.ajax({
                type: "GET",
                url: this.options.mutsig_rankings_service,
                context: this,
                dataType: 'json',
                data: query
            });
        },

        getFeatureMatrixDeferred: function(gene_list, cancer_list) {
            var query = [];

            _.each(gene_list, function(v) {
                query.push({name: "gene", value: v});
            });
            _.each(cancer_list, function(v) {
                query.push({name: "cancer", value: v});
            });
            query.push({name: 'source', value: 'gnab'});
            query.push({name: 'modifier', value: 'y_n_somatic'});

            return $.ajax({
                type: "GET",
                url: this.options.feature_matrix_service + "/" + this.options.feature_matrix_collection,
                context: this,
                dataType: 'json',
                data: query
            });
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

            var service_uri = this.options.service;

            var promises = [],
                parsers = [];

            // Deferreds and parsers for mutations data per tumor type
            _.each(cancers, function(tumor_type) {
                promises.push(
                    $.ajax({
                        type: "GET",
                        url: service_uri,
                        traditional: true,
                        data: {
                            "cancer": tumor_type,
                            "gene": gene
                        }
                    })
                );

                parsers.push(_.partial(that.parseSingleCancerMutations, tumor_type));
            });

            // Deferred and parser for MutSig data per tumor type
            promises.push(that.getMutSigRankingsDeferred([gene], cancers));
            parsers.push(_.partial(that.parseMutsig, cancers));

            // Deferred and parser for feature matrix data
            promises.push(that.getFeatureMatrixDeferred([gene], cancers));
            parsers.push(_.partial(that.parseFeatures, cancers));

            $.when.apply($, promises).done(function() {
                for (var i = 0; i < arguments.length; i++) {
                    parsers[i](arguments[i]);
                }

                that.set(that.loaded_data);
            });
        }
    });

// end define
});
