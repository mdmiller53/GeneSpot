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

            "click .list-update": function(e) {
                var listid = $(e.target).data("id");
                var text_content = this.$el.find("#samplelist-contents-" + listid).val();
                var sample_ids = text_content.match(/\S+/g);
                this.collection.updateSampleList(listid, sample_ids);
            },

            "click .list-refresh": function() {
                _.defer(this.__refresh);
            },

            "click .add-new-list": function(e) {
                var list_label = this.$el.find(".new-list-name").val();

                if (list_label.length == 0) {
                    return;
                }

                this.collection.addSampleList(list_label, []);
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
