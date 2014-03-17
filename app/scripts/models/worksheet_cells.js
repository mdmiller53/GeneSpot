define(["jquery", "underscore", "backbone", "xml2json"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function(attributes) {
                var cell_data = _.map(attributes["data"], function(item, idx) {
                    return _.map([1,2,3], function(i) {
                        return { "_row": idx, "_col": i, "_inputValue": Math.random() }
                    });
                }, this);
                this.set("cells", _.flatten(cell_data));
            }
        });

    });
