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
            _.bindAll(this, "render");

            this.collection = WebApp.getItemSets();
            this.collection.on("add remove change", this.render, this);
        },

        render: function() {
            var template_data = this.collection.map(function(model) {
                var samples = model.get("samples");
                var text_content = samples.join("\n");

                return {
                    "id": model["id"],
                    "label": model.get("label"),
                    "samples": samples,
                    "text": text_content,
                    "number_samples": samples.length
                };
            });

            this.$el.html(Tpl({ "samplelists": _.sortBy(template_data, "sort") }));

            return this;
        }
    });
});
