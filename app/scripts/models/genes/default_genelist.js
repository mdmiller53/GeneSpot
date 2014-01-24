define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({

            initialize: function () {
                this.original_genelist = _.map(this.get("genes"), function(g) {return g;});

                this.on("change:genes", this.update_localStorage, this);

                var storedArray = localStorage.getItem("default-genelist");
                if (storedArray) {
                    var arr = storedArray.split(",");
                    if (!_.isEmpty(arr)) {
                        this.set("genes", arr);
                        return;
                    }
                }

                localStorage.setItem("default-genelist", this.original_genelist);
            },

            update_localStorage: function () {
                var gene_array = this.get("genes");
                if (_.isEmpty(gene_array)) {
                    this.set("genes", this.original_genelist);
                    return;
                }

                localStorage.setItem("default-genelist", gene_array);
            }
        });
    });