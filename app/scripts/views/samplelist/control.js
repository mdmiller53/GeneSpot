define([
    "jquery",
    "underscore",
    "backbone",
    "hbs!templates/samplelist/container"
],
function ($, _, Backbone,
          Tpl
) {
    return Backbone.View.extend({
        collection: null,
        events: {
            "click .list-remover": function(e) {
                var listid = $(e.target).data("id");

                this.collection.remove(listid);
            },

            "click .list-refresh": function() {
                _.defer(this.__refresh);
            }
        },

        initialize: function() {
            _.bindAll(this, "__refresh");
        },

        __set_collection: function() {
            if (WebApp !== undefined && this.collection === null) {
                this.collection = WebApp.getItemSets();

                this.collection.on("add remove change", this.__refresh, this);
            }
        },

        render: function() {
            this.__set_collection();
            this.__refresh();

            return this;
        },

        __refresh: function() {
            var data = this.collection.toJSON();

            var template_data = _.map(data, function(model) {
                var samples = model["samples"];
                var text_content = samples.join("\n");

                return {
                    "id": model["id"],
                    "label": model["label"],
                    "samples": samples,
                    "text": text_content,
                    "number_samples": samples.length
                };
            });

            this.$el.html(Tpl({ "samplelists": _.sortBy(template_data, "sort") }));
        },

        get_current: function() {
            var currentSampleListId = this.$el.find(".nav-tabs").find("li.active").data("id");
            return this.itemizers[currentSampleListId].model.get("genes");
        }
    });
});
