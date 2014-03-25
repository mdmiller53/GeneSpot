define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            parse: function (data) {
                console.debug("models/graphs/cypher.parse");
                var graphs = _.flatten(_.map(data["results"], function (result) {
                    return _.pluck(result["data"], "graph");
                }));
                var nodes = _.map(_.flatten(_.pluck(graphs, "nodes")), function (node) {
                    return { "data": _.extend(_.omit(node, "properties"), node["properties"]) };
                });
                var relationships = _.map(_.flatten(_.pluck(graphs, "relationships")), function (edge) {
                    var basecy = { "source": edge["startNode"], "target": edge["endNode"] };
                    return { "data": _.extend(basecy, _.omit(edge, "properties"), edge["properties"]) };
                });
                return { "nodes": nodes, "edges": relationships };
            },

            fetch: function (options) {
                console.debug("models/graphs/cypher.fetch");
                var cypherQuery = {
                    "statements": [
                        {
                            "statement": "MATCH (a)-[:`PROXIMAL`]->(b) RETURN a,b LIMIT 25",
                            "resultDataContents": ["graph"],
                            "includeStats": false
                        }
                    ]
                };

                var ajaxObj = {
                    "method": "POST",
                    "url": this["url"],
                    "processData": false,
                    "contentType": "application/json"
                };

                var ids = [];
                $.ajax(_.extend({}, ajaxObj, {
                    "data": JSON.stringify(cypherQuery),
                    "async": false,
                    "success": function(data) {
                        var data_elements = _.flatten(_.pluck(data["results"], "data"));
                        var graphs = _.flatten(_.pluck(data_elements, "graph"));
                        var nodes = _.flatten(_.pluck(graphs, "nodes"));
                        ids = _.pluck(nodes, "id");
                    }
                }));

                if (_.isEmpty(ids)) {
                    console.debug("models/graphs/cypher.fetch:empty ids");
                    return null;
                }

                var node_ids = ids.join(",");
                var secondQuery = {
                    "statements": [
                        {
                            "statement": "START a = node(" + node_ids + "), b = node(" + node_ids + ")\nMATCH a -[r]-> b RETURN r;",
                            "resultDataContents": ["graph"],
                            "includeStats": false
                        }
                    ]
                };

                return Backbone.Model.prototype.fetch.call(this, _.extend({}, options, ajaxObj, {
                    "data": JSON.stringify(secondQuery)
                }));
            }
        });
    });