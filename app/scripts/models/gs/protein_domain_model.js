define   (
[
    "backbone"
],
function (
    Backbone
) {
    return Backbone.Model.extend({
        initialize: function(attributes, options) {
            this.config = {
                data_source: options.data_source
            };

            this.settings = {};
        },

        url: function() {
            var query,
                ds = this.config.data_source,
                query_terms = _.chain(this.settings.protein_ids)
                    .map(function(protein_id) {
                        return "uniprot_id=" + protein_id
                    })
                    .value()
                    .join("&");

            query = ds.uri
                + '?' + query_terms;

            return query;
        },

        parse: function(json) {
            var domain_map;

            if (_.has(json, 'items')) {
                domain_map = _.reduce(json.items, function(memo, protein) {
                    memo[protein.uniprot_id] = protein;
                    return memo;
                }, {});
            }
            else {
                console.warn('No protein domains found for query ' + this.settings.protein_ids.toString());
                domain_map = {};
            }

            if (_.size(domain_map) > 0) {
                return domain_map;
            }
            else {
                return {};
            }
        },

        fetch: function(options) {
            this.settings.protein_ids = _.clone(options.protein_ids);

            this.constructor.__super__.fetch.apply(this, _.extend({dataType: "json"}, options));
        }
    });
// end define
});
