#!/usr/bin/env python

import argparse
import csv
import os
import pymongo
import logging
import itertools

from utilities import configure_logging

# this script parses gene annotations (column 1) extracted from output produced by
#     https://github.com/cancerregulome/gidget/blob/master/commands/feature_matrix_construction/main/buildGeneMap.py
# and annotates a mongo (NOSQL) database with the matching feature ids (column 0)
#
# example data:
# C:CNVR:10p15.1:chr10:5610350:5628570::BLCA-TP_Gistic_ROI_d_amp  0
# C:CNVR:10q23.31:chr10:89617402:89735596::BLCA-TP_Gistic_ROI_d_del       2       KLLN,PTEN
# C:CNVR:11p15.5:chr11:598034:733071::BLCA-TP_Gistic_ROI_d_del    8       DRD4,SCT,CDHR5,TMEM80,EPS8L2,PHRF1,DEAF1,IRF7
# C:CNVR:11q13.3:chr11:69465158:69502928::BLCA-TP_Gistic_ROI_d_amp        2       ORAOV1,CCND1
# C:CNVR:11q22.2:chr11:102298003:102357340::BLCA-TP_Gistic_ROI_d_amp      1       TMEM123
# C:CNVR:11q25:chr11:132283490:133403089::BLCA-TP_Gistic_ROI_d_del        3       OPCML-IT1,OPCML-IT2,OPCML

def collect_tags(item_s):
    if item_s is None: return

    all_items = []

    if isinstance(item_s, list):
        for item in item_s:
            if not item is None: all_items.append(item)

    elif isinstance(item_s, basestring):
        all_items.append(item_s)

    return all_items

def extract_tags_by_id(gmf_file):
    with open(gmf_file, "rb") as csvfile:
        # this file format does not have a header row
        csvreader = csv.reader(csvfile, delimiter="\t")

        r_by_id = {}
        for row in csvreader:
            id = row[0]
            cnt = row[1]
            tags = []
            if cnt != "0" or cnt >= 0:
                if "," in row[2]:
                    tags = row[2].split(",")
                else:
                    tags.append(row[2])
            r_by_id[row[0]] = tags
        return r_by_id

def find_and_modify(collection, refGenes_by_id):
    count = 0
    for id in refGenes_by_id:
        refGenes = collect_tags(refGenes_by_id[id])

        if collection.find({ "id": id }).count() == 1:
            collection.find_and_modify({ "id": id }, {"$set":{ "refGenes": refGenes }})
            logging.debug("[%s] [%s]===%s" % (count, id, refGenes))
        count += 1
        if count % 1000 == 0: logging.info("update [%s]" % count)

    logging.info("total count=%s" % count)

def main():
    parser = argparse.ArgumentParser(description="Utility to annotate features with genes (tags) in MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--f", required=True, help="Path to gene map file")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.f)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    db = conn[args.db]

    count = 0
    batch_counter = 0

    # Extraction Phase
    tags_by_id = extract_tags_by_id(args.f)

    # Database Load Phase
    find_and_modify(db["feature_matrix"], tags_by_id)

    conn.close()

    logging.info("COMPLETE")

if __name__ == "__main__":
    main()
