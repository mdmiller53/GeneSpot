define(["jquery", "underscore", "backbone", "hbs!templates/gs/per_tumor_type_grid"],
    function ($, _, Backbone, PerTumorTypeGridTpl) {
        return Backbone.View.extend({
            "annotations": new Backbone.Model(),

            "initialize": function (options) {
                _.bindAll(this, "renderView");

                if (this.options.annotations) {
                    var parts = this.options.annotations.split("/");
                    var annotations_url = "svc/" + WebApp.Datamodel.get(parts[0])[parts[1]]["catalog"][parts[2]]["service"];
                    this.annotations.fetch({
                        "url": annotations_url,
                        "async": false,
                        "dataType": "json",
                        "traditional": true,
                        "data": {
                            "gene": this.options.genes,
                            "cancer": this.options.cancers
                        }
                    });
                }

                this.model.on("load", this.renderView);
            },

            "renderView": function () {
                var items_by_cancer = _.groupBy(this.model.get("items"), "cancer");
                var annotations_by_tumor_types = _.groupBy(this.annotations.get("items"), "cancer");
                var items_by_tumor_type = _.map(items_by_cancer, function (items, key) {
                    var annotations_by_genes = _.groupBy(annotations_by_tumor_types[key], "gene");
                    var annotated_items = _.map(items, function (item) {
                        if (item.values) {
                            item.samples = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                            item.deletions = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                            item.gains = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                            item.mutations = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                        }

                        var annotations_by_gene = annotations_by_genes[item.gene];
                        if (annotations_by_gene) return _.extend(annotations_by_gene[0], item);
                    }, this);
                    return { "tumor_type": key, "items": _.compact(annotated_items), "numberOfItems": annotated_items.length };
                }, this);

                this.$el.html(PerTumorTypeGridTpl({ "id": Math.floor(Math.random() * 1000), "items_by_tumor_type": items_by_tumor_type }));
            }
        });
    });
