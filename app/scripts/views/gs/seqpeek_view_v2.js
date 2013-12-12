define   ([
    'backbone',
    'views/gs/region_seqpeek',
    'hbs!templates/gs/mutations_map',
    'hbs!templates/line_item',
    'vq'
],
function (
    Backbone,
    SeqPeekFactory,
    MutationsMapTemplate,
    LineItemTemplate,
    vq
) {

return Backbone.View.extend({
    genes: [],
    cancers: [],
    selected_cancers: [],

    initialize: function (options) {
        _.bindAll(this, "initGeneSelector", "initGraph", "initCancerSelector");

        this.cancers = this.options.cancers;
        this.genes = this.options.genes;

        if (this.genes !== undefined && _.isArray(this.genes)) {
            if (this.genes.length > 0) {
                this.current_gene = this.genes[0];
            }
            else {
                this.genes = [this.options.default_gene];
                this.current_gene = this.genes[0];
            }
        }
        else if (this.genes !== undefined && _.isString(this.genes)) {
            this.current_gene = this.genes;
        }
        else {
            this.genes = [this.options.default_gene];
            this.current_gene = this.genes[0];
        }

        this.reloadModel = _.throttle(this.reloadModel, 1000);

        if (!this.hideSelector) {
            this.initCancerSelector();
        }

        if (!_.isEmpty(this.genes)) {
            this.current_gene = this.genes[0];
        }

        this.initGeneSelector();

        this.model.on("load", this.initGraph);
    },

    initGeneSelector: function () {
        this.$el.html(MutationsMapTemplate({"selected_gene": this.current_gene }));

        var UL = this.$el.find(".seqpeek-gene-selector").empty();
        _.each(_.without(this.genes, this.current_gene), function(gene) {
            UL.append(LineItemTemplate({ "label":gene, "id":gene }));
        }, this);

        var _this = this;
        UL.find("li a").click(function(e) {
            _this.current_gene = $(e.target).data("id");
            _.defer(_this.reloadModel);
            _.defer(_this.initGeneSelector);
        });
    },

    initCancerSelector: function(txt) {
        var cancers = this.cancers,
            selected_cancers = this.cancers;

        _.each(cancers, function(cancer) {
            cancer = cancer.trim();
            if (selected_cancers.indexOf(cancer)) {
                $(".cancer-selector").append(LineItemTemplate({"li_class":"active","a_class":"toggle-active","id":cancer,"label":cancer}));
            } else {
                $(".cancer-selector").append(LineItemTemplate({"a_class":"toggle-active","id":cancer,"label":cancer}));
            }
        });
        $(".cancer-selector").sortable();

        var _this = this;
        $(".cancer-selector").find(".toggle-active").click(function(e) {
            $(e.target).parent().toggleClass("active");
            _this.selected_cancers = $(this).find("li.active a").data("id");
            _.defer(_this.reloadModel);
        });
    },

    initGraph: function() {
        // TODO implement
    }
});

// end define
});
