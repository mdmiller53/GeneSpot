define(["jquery", "underscore", "backbone",
        "hbs!templates/workbooks/worktabs", "hbs!templates/workbooks/bookinfo"],
    function ($, _, Backbone, Tpl, BookInfoTpl) {
        return Backbone.View.extend({
            "initialize": function () {
                this.model = this.options.model;
                this.model.on("load", function () {
                    this.$(".bookinfo").html(BookInfoTpl(this.model.toJSON()));
                }, this);
                this.model.on("load:payload", function () {
                    var payload = this.model.get("payload");
                    var items = payload["items"] || [];
                    var genes = payload["genes"] || [];

                    var datamodels = _.compact(_.flatten(_.map(items, function (item) {
                        if (_.has(item, "datamodels")) return _.values(item["datamodels"]);
                        return item["datamodel"];
                    })));
                    datamodels = _.map(_.groupBy(datamodels, "uri"), function (groupedDM) {
                        return _.first(groupedDM);
                    }, this);

                    this.$(".worktabs").html(Tpl({
                        "title": this.model.get("title"),
                        "items": items,
                        "genes": genes,
                        "datamodels": datamodels,
                        "visualizations": _.map(this.options["map_templates"].values(), function(map_template) {
                            return map_template.toJSON();
                        })
                    }));
                }, this);
            },

            "events": {
                "click a.select-worktab": function (e) {
                    var activated_tab = this.workbook_tabs[$(e.target).data("id")];
                    _.defer(activated_tab.render);

                    if (this.previous_tab) _.defer(this.previous_tab.shadow);
                    this.previous_tab = activated_tab;
                },
//                "shown a[data-toggle='tab']": function (e) {
//                    console.log("shown data-toggle");
//                    var activated_tab = this.workbook_tabs[$(e.target).data("id")];
//                    _.defer(activated_tab.render);
//
//                    if (e.relatedTarget) {
//                        var previous_tab = this.workbook_tabs[$(e.relatedTarget).data("id")];
//                        if (previous_tab && previous_tab.shadow) _.defer(previous_tab.shadow);
//                    }
//                },
                "click a.hide-datapanel": function (e) {
                    $(".hide-datapanel").toggleClass("hide");
                    $(".datapanel").toggleClass("hide");
                },
                "click a.append-body": function (e) {
                    console.log("append-body=" + $(e.target).data("id"));

                    this.model.set("payload", {
                        "items": [
                            {
                                "id": "arbitrary_id_1",
                                "view": "views/fmx_distributions/view",
                                "label": "Feature Selector",
                                "datamodels": {
                                    "gene_features": {
                                        "label": "Integrated Datasets per Tumor Type",
                                        "uri": "datamodel/tcga_datawarehouse",
                                        "url_suffix": "/feature_matrix"
                                    },
                                    "clinical_features": {
                                        "label": "Integrated Datasets per Tumor Type",
                                        "uri": "datamodel/tcga_datawarehouse",
                                        "url_suffix": "/feature_matrix",
                                        "query_clinical_variables": true
                                    }
                                }
                            },
                            {
                                "id": "arbitrary_id_2",
                                "view": "views/pivot_data_view",
                                "label": "MutSig Top 20",
                                "dimensions": {
                                    "pivot": "cancer",
                                    "values": "gene",
                                    "groupBy": "rank"
                                },
                                "datamodel": {
                                    "uri": "datamodel/mutations/mutsig_top20",
                                    "query_all_genes": true
                                }
                            }
                        ],
                        "genes": this.options["genes"]
                    });
                    this.model.save();
                }
            },

            "shadow": function () {
//                this.shadow_DOM = this.$el.html();
//                this.$el.html("Shadowed");
                return this;
            }
        });
    });
