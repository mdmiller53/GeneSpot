define([
    "jquery",
    "underscore",
    "backbone",
    "views/genes/typeahead",
    "hbs!templates/samplelist/container"
],
function ($, _, Backbone,
          TypeAhead,
          Tpl
) {
    return Backbone.View.extend({
        samplelists_collection: new Backbone.Collection([], { "url": "svc/collections/samplelists" }),
        itemizers: {},

        events: {
            "click .list-remover": function(e) {
                var listid = $(e.target).data("id");

                Backbone.sync("delete", new Backbone.Model({}), {
                    "url": "svc/collections/samplelists/" + listid, "success": this.__refresh
                });
            },

            "click .list-refresh": function() {
                _.defer(this.__refresh);
            }
        },

        initialize: function() {
            _.bindAll(this, "__load", "__refresh", "__ready");
        },

        render: function() {
            this.samplelists_collection.fetch({ "success": this.__ready });
            this.samplelists_collection.on("change", function(item) {
                if (_.isEmpty(item)) return;
                Backbone.sync("update", item, {
                    "url": "svc/collections/samplelists/" + item.get("id"), "success": this.__refresh
                });
            });

            return this;
        },

        __ready: function() {
            this.__load();
            this.trigger("ready");
        },

        __refresh: function() {
            this.samplelists_collection.fetch({ "success": this.__load });
        },

        __load: function() {
            var samplelists = _.map(this.samplelists_collection["models"], function(model) {
                var samples = model.get("samples");
                var text_content = samples.join("\n");

                return {
                    "id": model.get("id"),
                    "label": model.get("label"),
                    "samples": samples,
                    "text": text_content,
                    "number_samples": samples.length
                };
            });

            this.$el.html(Tpl({ "samplelists": _.sortBy(samplelists, "sort") }));
        },

        get_current: function() {
            var currentSampleListId = this.$el.find(".nav-tabs").find("li.active").data("id");
            return this.itemizers[currentSampleListId].model.get("genes");
        }
    });
});
