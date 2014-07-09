#!/usr/bin/env python

# this file parses the mutsig output from Firehose, rank is derived from order in file

import argparse
import csv
import os
import pymongo
import logging

from utilities import configure_logging

# example data:
# gene    Nnon    Nsil    Nflank  nnon    npat    nsite   nsil    nflank  nnei    fMLE    p       score   time    q
# CDKN1A  47190   15860   0       18      18      17      0       0       20      1.478287e+00    3.663736e-15    9.868049e+01    1.285760e-01    4.559103e-11
# TP53    122850  35880   0       75      64      50      1       0       4       1.600534e+00    4.996004e-15    1.827995e+02    2.969270e-01    4.559103e-11
# RB1     370240  97630   0       19      17      17      0       0       20      6.902772e-01    1.854072e-14    8.167202e+01    1.402310e-01    1.038462e-10
# ARID1A  580710  171080  0       38      32      36      2       0       2       1.146468e+00    2.275957e-14    1.301110e+02    1.304470e-01    1.038462e-10
# MLL2    1376830 455130  0       40      36      40      5       0       20      1.078227e+00    9.714451e-14    1.320917e+02    2.426840e-01    3.545969e-10
# KDM6A   402090  110110  0       32      31      26      2       0       1       1.366207e+00    2.076339e-12    1.326493e+02    1.375940e-01    6.315877e-09
# ELF3    115570  31720   0       15      11      14      0       0       20      1.089406e+00    2.276290e-10    5.431453e+01    1.243460e-01    5.934939e-07

def extract_rows(file_path):
    with open(file_path, "rb") as csvfile:
        csvreader = csv.reader(csvfile, delimiter="\t")
        headers = csvreader.next()

        rank = 0
        for line in csvreader:
            rank += 1
            row_obj = { "rank": rank }
            for idx in range(0, len(headers)):
                header = headers[idx]
                value = line[idx]
                if rank % 100 == 0: logging.debug("line[%s]:%s:%s:%s" % (rank, idx, header, value))
                row_obj[header] = value
            yield row_obj

def main():
    parser = argparse.ArgumentParser(description="Utility to import TCGA Firehose MutSig to MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--f", required=True, help="Path to mutsig sig-genes file")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.f)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    collection = conn[args.db]["mutsig_rankings"]
    collection.drop()

    count = 0
    for row in extract_rows(args.f):
        collection.insert(row)
        count += 1

    logging.info("inserted count=%s" % count)
    conn.close()

if __name__ == "__main__":
    main()

