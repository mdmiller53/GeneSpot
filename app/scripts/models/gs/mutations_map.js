define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            "loaded_data": {
                "mutations": {},
                "mutsig": {},
                "features": {}
            },

            initialize: function () {
                _.bindAll(this, "__parse_mutations", "__parse_mutsig", "__parse_featurematrix");
            },

            fetch: function (options) {
                console.debug("mutations_map.fetch:" + JSON.stringify(options["data"] || {}));

                var genes;
                var tumor_types;

                if (_.has(options, "data")) {
                    genes = options["data"]["gene"];
                    tumor_types = options["data"]["cancer"];
                }
                else {
                    genes = [this.default_gene.toLowerCase()];
                    tumor_types = _.map(this.default_cancer_types, function (x) {
                        return x.toLowerCase();
                    });
                }

                var promises = [
                    this.__fetch_mutations(genes, tumor_types),
                    this.__fetch_mutsig(genes, tumor_types),
                    this.__fetch_featurematrix(genes, tumor_types)
                ];

                var parsers = [
                    _.partial(this.__parse_mutations),
                    _.partial(this.__parse_mutsig),
                    _.partial(this.__parse_featurematrix)
                ];

                var that = this;
                $.when.apply($, promises).done(function () {
                    _.each(arguments, function (argument, idx) {
                        parsers[idx](argument);
                    });
                    that.set(that.loaded_data);
                });
            },

            __fetch_mutations: function (genes, tumor_types) {
                console.debug("mutations_map.__fetch_mutations");
                return $.ajax({
                    "url": this.get("service"),
                    "traditional": true,
                    "data": {
                        "cancer": tumor_types,
                        "gene": genes
                    }
                });
            },

            __fetch_mutsig: function (genes, tumor_types) {
                console.debug("mutations_map.__fetch_mutsig");
                return $.ajax({
                    "url": this.get("mutsig_rankings_service"),
                    "dataType": "json",
                    "traditional": true,
                    "data": {
                        "cancer": tumor_types,
                        "gene": genes
                    }
                });
            },

            __fetch_featurematrix: function (genes, tumor_types) {
                console.debug("mutations_map.__fetch_featurematrix");
                return $.ajax({
                    "url": this.get("feature_matrix_service") + "/" + this.get("feature_matrix_collection"),
                    "dataType": "json",
                    "traditional": true,
                    "data": {
                        "cancer": tumor_types,
                        "gene": genes,
                        "source": "gnab",
                        "modifier": "y_n_somatic"
                    }
                });
            },

            __parse_mutations: function (result) {
                console.debug("mutations_map.__parse_mutations");
                var json = _.first(result);
                if (_.has(json, "items")) {
                    _.each(_.groupBy(json["items"], "cancer"), function (items, tumor_type) {
                        this.loaded_data["mutations"][tumor_type.toLowerCase()] = items;
                    }, this);
                }
            },

            __parse_mutsig: function (result) {
                console.debug("mutations_map.__parse_mutsig");
                var json = _.first(result);
                if (_.has(json, "items")) {
                    this.loaded_data["mutsig"] = _.reduce(json["items"], function (memo, feature) {
                        if (!_.has(memo, feature.cancer)) {
                            memo[feature.cancer] = [];
                        }
                        memo[feature.cancer].push(feature);
                        return memo;
                    }, {});
                }
            },

            __parse_featurematrix: function (result) {
                console.debug("mutations_map.__parse_featurematrix");

                var json = _.first(result);
                if (_.has(json, "items")) {
                    this.loaded_data["features"] = _.reduce(json["items"], function (memo, feature) {
                        if (!_.has(memo, feature.cancer)) {
                            memo[feature.cancer] = [];
                        }
                        memo[feature.cancer].push(feature);
                        return memo;
                    }, {});
                }
            }
        });
    });
