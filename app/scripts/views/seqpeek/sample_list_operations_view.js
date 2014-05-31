define([
        "jquery",
        "underscore",
        "backbone",
        "hbs!templates/seqpeek/sample_list_operations"
],
function ($, _, Backbone,
          Tpl
    ) {

    return Backbone.View.extend({
        events: {
            "click .list-union-op": function(e) {
                var listid = $(e.target).data("id");
                this.trigger("list:union", this.collection.get(listid));
            }
        },

        initialize: function() {
            _.bindAll(this, "__refresh");

            this.collection.on("add remove change reset", this.__refresh, this);
        },

        render: function() {
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
        }
    });
});
