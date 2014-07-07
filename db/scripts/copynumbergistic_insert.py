#!/usr/bin/env python

import argparse
import csv
import pymongo
import logging

from utilities import configure_logging

def extract_records(file_path):
    logging.info(file_path)

    with open(file_path, "rb") as csvfile:
        csvreader = csv.reader(csvfile, delimiter="\t")
        ids = csvreader.next()[4:]

        for row in csvreader:
            gene_symbol = row[0]
            locus_id = row[1]
            cytoband = row[2]
            values = row[4:]

            if len(values) != len(ids): raise Exception("mismatched values and features: %s (%s/%s)" % (gene_symbol, str(len(values)), str(len(ids))))

            record = {}
            record["gene"] = gene_symbol
            record["locus"] = locus_id
            record["cytoband"] = cytoband
            record["values"] = values_dict(ids, values)

            yield record

        logging.info("samples=%s" % str(len(ids)))

def values_dict(ids, values):
    result = {}
    for i, v in zip(ids, values):
        trunc_i = i
        float_v = v

        if len(i) > 16: trunc_i = i[0:15]
        if v != "NA": float_v = float(v)

        result[trunc_i] = float_v
    return result

def main():
    parser = argparse.ArgumentParser(description="Utility to import Firehose Copy Number Gistic2 data to MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--f", required=True, help="Path to copy number gistic2 file")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.f)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    collection = conn[args.db]["copy_number_gistic"]

    count = 0
    for record in extract_records(args.f):
        collection.insert(record)
        count += 1

    logging.info("inserted count=%s" % count)

    conn.close()

if __name__ == "__main__":
    main()

