define(["jquery", "underscore", "backbone", "d3",
        "hbs!templates/workdesk/dimensions_vis"],
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

                var diameter = 600;
                var format = d3.format(",d");
                var color = d3.scale.category20c();

                var bubble = d3.layout.pack().sort(null).size([diameter, diameter]).padding(1.5);

                var svg = d3.select("#dimensions-vis-container").append("svg")
                    .attr("width", diameter)
                    .attr("height", diameter)
                    .attr("class", "bubble");

                // Returns a flattened hierarchy containing all leaf nodes under the root.
                function flatten_hierarchy(root) {
                    var children = [];

                    function recurse(name, node) {
                        if (_.has(node, "children")) {
                            var totalSize = 0;
                            _.each(node["children"], function (child) {
                                totalSize += recurse(node["name"], child);
                            });
                            if (!node["isExcluded"]) {
                                children.push({ "packageName": name, "className": node["name"], "value": totalSize });
                            }
                            return totalSize;
                        }
                        children.push({ "packageName": name, "className": node["name"], "value": node["size"] });
                        return node["size"];
                    }

                    recurse(null, root);
                    return { "children": children };
                }

                var root = this.model.toJSON();
                var node = svg.selectAll(".node")
                    .data(bubble.nodes(flatten_hierarchy(root))
                        .filter(function (d) {
                            return !d["children"];
                        }))
                    .enter().append("g")
                    .attr("class", "node")
                    .attr("transform", function (d) {
                        return "translate(" + d.x + "," + d.y + ")";
                    });

                node.append("title")
                    .text(function (d) {
                        return d["className"] + ": " + format(d["value"]);
                    });

                node.append("circle")
                    .attr("r", function (d) {
                        return d.r;
                    })
                    .style("fill", function (d) {
                        return color(d["packageName"]);
                    });

                node.append("text")
                    .attr("dy", ".3em")
                    .style("text-anchor", "middle")
                    .text(function (d) {
                        return d.className.substring(0, d.r / 3);
                    });
            }
        });
    });