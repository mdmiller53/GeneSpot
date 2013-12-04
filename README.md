http://GeneSpot.org
====
*Development Branches* :: http://genespot.org/branches

This software tool for systems biology provides a way to view TCGA data from a gene-centric point-of-view. It includes a number of interactive visualizations, and allows the user to save their current exploration. This application also enables the user to select specific cancers and genes of interest, and load data that is generated from a variety of TCGA analysis.

All software is presented AS IS to the general community.  Our priority is to continuously improve the software to serve research in systems biology and computational biology.


Acknowledgements
=====
This project hosts software developed to support the TCGA Genomic Data Analysis Center (GDAC) at
the [Institute for Systems Biology](http://www.systemsbiology.org) (ISB) and
[MD Anderson Cancer Center](http://mdanderson.org).  Visit our project website at http://cancerregulome.org.

For more information, please contact codefor@systemsbiology.org or info@csacr.org.

Developer Instructions
=====
Follow [Web App Base](https://github.com/IlyaLab/WebAppBase) and [Addama](https://github.com/IlyaLab/Addama) instructions

Atlas Runtime Configuration
-----
This project adds an additional file in the [configurations directory](https://github.com/cancerregulome/GeneSpot/tree/master/app/configurations/) for the initial layout of the [Atlas view](https://github.com/cancerregulome/GeneSpot/blob/master/app/scripts/views/gs/atlas.js).

### [atlas.json](https://github.com/IlyaLab/WebAppBase/blob/master/app/configurations/atlas.json) ###
 * Specifies identifying UI elements (e.g. titles, links in the About menu)
 * Specifies links
 * Configures Hangout URL

### Example configuration ###
```json
{
    "maps": [
        {
            "id": "mutsig_ranks",
            "label": "MutSig Ranks",
            "description": "This dataset was prepared from TCGA MutSig CV data produced by Firehose.",
            "isOpen": true,
            "position": {
                "top": 10,
                "left": 50
            },
            "views": [
                {
                    "id": "mutsig_grid",
                    "label": "Selected Genes",
                    "source": "datamodel/mutations/mutsig_rankings"
                },
                {
                    "id": "mutsig_top_genes",
                    "label": "Top 20",
                    "source": "datamodel/mutations/mutsig_top20"
                }
            ]
        },
        {
            "id": "sample_distributions",
            "label": "Sample Distributions",
            "views": [
                {
                    "id": "scatterplot",
                    "label": "Feature Selector",
                    "source": "datamodel/feature_matrices/BLCA-SEQ-20131113",
                    "comment": "need to handle multiple tumor types"
                }
            ]
        }
    ]
}
```
