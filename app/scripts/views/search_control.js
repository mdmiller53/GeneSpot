define(["jquery", "underscore", "backbone", "hbs!templates/search_results"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            "indexed_by_keyword": {},

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
                    "indexed_by_keyword": this.indexed_by_keyword
                });
                this.$el.data("typeahead").render = this.__render;
                return this;
            },

            add_callback: function (header, label, keywords, callbackFn) {
                console.debug("views/search_control.add_callback(" + header + "," + label + "," + keywords.length + ")");
                var kws = _.map(keywords, function (kw) {
                    return "[" + header + "] " + label + " (" + kw + ")";
                });

                var uniqueId = Math.round(Math.random() * 10000);
                _.each(_.unique(_.flatten([label, keywords])), function (kw) {
                    var idxitms = this.indexed_by_keyword[kw] || [];
                    var idxitm = { "uid": "ii_" + uniqueId++, "header": header, "label": kw, "callback": callbackFn };
                    if (!_.isEqual(label, kw)) idxitm["belongs"] = label;
                    idxitms.push(idxitm);
                    this.indexed_by_keyword[kw] = idxitms;
                }, this);
            },

            __source: function () {
                return _.keys(this.indexed_by_keyword);
            },

            __updater: function (uid) {
                console.debug("views/search_control.__updater(" + uid + ")");
                var indexed_by_uid = _.indexBy(_.flatten(_.values(this.indexed_by_keyword)), "uid");
                var indexed_item = indexed_by_uid[uid];
                if (indexed_item && _.has(indexed_item, "callback")) {
                    var callbackFn = indexed_item["callback"];
                    if (_.isFunction(callbackFn)) callbackFn();
                }
                return null;
            },

            __render: function (items) {
                console.debug("views/search_control.__render");
                var data_items = _.map(items, function (item) {
                    return this.options.indexed_by_keyword[item];
                }, this);

                if (_.isEmpty(data_items)) return this;

                var indexed_items = _.map(_.groupBy(_.flatten(data_items), "header"), function (items, key) {
                    if (!key) return null;
                    return {
                        "header": key,
                        "items": _.map(items, function(it) {
                            return _.extend({}, it, { "label": this.highlighter(it["label"]) });
                        }, this)
                    };
                }, this);

                if (_.isEmpty(_.compact(indexed_items))) return this;

                this.$menu.html(Tpl({ "items": indexed_items }));
                return this;
            }
        });
    });
