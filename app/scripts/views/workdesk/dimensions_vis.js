define(["jquery", "underscore", "backbone", "d3",
        "hbs!templates/workdesk/dimensions_vis", "d3.parsets"],
    function ($, _, Backbone, d3, Tpl) {
        return Backbone.View.extend({
            "events": {
                "click a.refresh-vis": "__vis"
            },

            "initialize": function () {
                console.debug("views/dimensions_vis.initialize");
                this.model = this.options.model;
                this.model.on("change", this.__vis, this);
            },

            "render": function () {
                console.debug("views/dimensions_vis.render");
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "__vis": function () {
                this.$("#dimensions-vis-container").empty();

                var dims = ["Dimensions", "Feature Types", "Datasets"];
                var chart = d3.parsets().dimensions(dims).width(650).height(550);

                var vis = d3.select("#dimensions-vis-container").append("svg")
                    .attr("width", chart.width())
                    .attr("height", chart.height());

                d3.csv("configurations/summary_data.csv", function (error, csv) {
                    vis.datum(csv).call(chart);
                });

                var transition = vis.transition().duration(500);
                transition.call(chart.tension(.5));
            }
        });
    });