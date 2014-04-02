define(["jquery", "underscore", "backbone", "hbs!templates/search_results"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            "callbacks_by_keyword": {},
            "indexed_items_by_keyword": {},

            initialize: function () {
                console.debug("views/search_control.initialize");
                _.bindAll(this, "__source", "__updater");
            },

            render: function () {
                console.debug("views/search_control.render");
                this.$el.typeahead({
                    "source": this.__source,
                    "updater": this.__updater,
                    "autocomplete": "off",
                    "indexed_items_by_keyword": this.indexed_items_by_keyword
                });
                this.$el.data("typeahead").render = this.__render;
                return this;
            },

            add_callback: function (header, label, keywords, callbackFn) {
                console.debug("views/search_control.add_callback(" + header + "," + label + "," + keywords.length + ")");
                var kws = _.map(keywords, function (kw) {
                    return "[" + header + "] " + label + " (" + kw + ")";
                });

                var uniqueId = "ii_" + Math.round(Math.random() * 10000); // TODO : Something better
                var indexed_item = { "uid": uniqueId, "header": header, "label": label, "callback": callbackFn };

                _.each(_.flatten([header, label, keywords]), function (kw) {
                    var idxitms = this.indexed_items_by_keyword[kw] || [];
                    idxitms.push(indexed_item);
                    this.indexed_items_by_keyword[kw] = idxitms;
                }, this);

//                _.each(kws, function (kw) {
////                    this.callbacks_by_keyword[kw] = callbackFn;
//                    this.callbacks_by_keyword[kw] = {
//                        "header": header,
//                        "label": label,
//                        "keywords": keywords,
//                        "callback": callbackFn
//                    };
//                }, this);
            },

            __source: function () {
//                return _.map(this.callbacks_by_keyword, function(item) {
//                    return { "header": item.}
//                })
                return _.keys(this.indexed_items_by_keyword);
            },

            __updater: function (item) {
                console.debug("views/search_control.__updater(" + item + ")");
                var callbackFn = this.callbacks_by_keyword[item];
                if (_.isFunction(callbackFn)) callbackFn();
                return null;
            },

            __render: function (items) {
                console.debug("views/search_control.__render");
//                var that = this;
                var data_items = _.map(items, function (item) {
                    return this.options.indexed_items_by_keyword[item];
                }, this);

                var indexed_items = _.map(_.groupBy(_.flatten(data_items), "header"), function (items, key) {
                    return { "header": key, "items": items };
                });

//                items = $(items).map(function (i, item) {
//                    var itemClass = (item == "Sunday" || item == "Saturday") ? "weekend" : "weekday";
//                    i = $(that.options.item).attr("data-value", item).attr("class", itemClass);
//                    i.find("a").html(that.highlighter(item))
//                    return i[0]
//                })

//                _.first(data_items).addClass("active")
                this.$menu.html(Tpl({ "items": indexed_items }));
                return this;
            }
        });
    });
