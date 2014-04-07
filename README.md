http://GeneSpot.org
====

*Development Version* :: https://csacr.systemsbiology.net/staging/genespot

*Branches* :: http://genespot.org/branches

This software tool for systems biology provides a way to view TCGA data from a gene-centric point-of-view. It includes a number of interactive visualizations, and allows the user to save their current exploration. This application also enables the user to select specific tumor types and genes of interest, and load data that is generated from a variety of TCGA analysis.

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

GeneSpot Runtime Configuration
-----
This project adds the following files into the [configurations directory](https://github.com/cancerregulome/GeneSpot/tree/master/app/configurations/).

### [tumor_types.json](https://github.com/cancerregulome/GeneSpot/blob/master/app/configurations/tumor_types.json) ###
 * Provides listing of Tumor Types for selectors and queries

### [atlas.json](https://github.com/IlyaLab/WebAppBase/blob/master/app/configurations/atlas.json) ###
 * Provides initial layout of maps in the [Atlas view](https://github.com/cancerregulome/GeneSpot/blob/master/app/scripts/views/gs/atlas.js)

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
                    "view": "views/pivot_data_view",
                    "dimensions": {
                        "pivot": "cancer",
                        "values": "gene",
                        "groupBy": "rank"
                    },
                    "label": "Top 20",
                    "datamodel": "datamodel/mutations/mutsig_top20",
                    "query_all_genes": true
                }
            ]
        },
        {
            "id": "sample_distributions",
            "label": "Sample Distributions",
            "position": {
                "top": -50,
                "left": 200
            },
            "views": [
                {
                    "view": "views/fmx_distributions/view",
                    "label": "Feature Selector",
                    "datamodel": "datamodel/tcga_datawarehouse",
                    "url_suffix": "/feature_matrix",
                    "query_clinical_variables": true
                }
            ]
        }
    ]
}
```
