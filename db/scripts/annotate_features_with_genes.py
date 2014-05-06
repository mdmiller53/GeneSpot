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

def append_genes(item_s, all_items):
    if item_s is None or all_items is None: return

    if isinstance(item_s, list):
        for item in item_s:
            if not item is None: all_items.append(item)

    elif isinstance(item_s, basestring):
        all_items.append(item_s)

def extract_rows_by_id(gmf_file):
    with open(gmf_file, "rb") as csvfile:
        # this file format does not have a header row
        csvreader = csv.reader(csvfile, delimiter="\t")

        r_by_id = {}
        for row in csvreader:
            id = row[0]
            cnt = row[1]
            gns = []
            if cnt != "0" or cnt >= 0:
                if "," in row[2]:
                    gns = row[2].split(",")
                else:
                    gns.append(row[2])
            r_by_id[row[0]] = gns
        return r_by_id

def find_and_modify(collection, rows_by_id):
    count = 0
    for id in rows_by_id:
        row = rows_by_id[id]
        agg_genes = []
        append_genes(rows_by_id[id], agg_genes)
        cnt = collection.find({ "id": id }).count()
        if cnt == 1:
            collection.find_and_modify({ "id": id }, {"$set":{ "genes": agg_genes }}, upsert=True)
            logging.debug("find_and_modify [%s] [%s]===%s" % (count, id, agg_genes))
        count += 1
        if count % 100 == 0: logging.info("upsert [%s]" % count)

    logging.info("total find_and_modify count=%s" % count)

def main():
    parser = argparse.ArgumentParser(description="Utility to import TCGA mutation summaries to MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--gmf", required=True, help="Path to gene map file")
    parser.add_argument("--src", required=False, help="source (data type) to filter on")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.gmf)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    db = conn[args.db]
    collection = db["feature_matrix"]

    count = 0
    batch_counter = 0

    # Extraction Phase
    rows_by_id = extract_rows_by_id(args.gmf)

    query = {}
    if args.src: query = { "source": args.src }

    # Database Load Phase
    find_and_modify(collection, rows_by_id)
    conn.close()

if __name__ == "__main__":
    main()
