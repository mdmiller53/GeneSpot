#!/usr/bin/env python

# this file parses the mutation summary output from binarization/genes_and_mutations_annovar.pl

import argparse
import csv
import os
import pymongo
import logging

from utilities import configure_logging


# example data:
# TPTE2    Silent    TCGA-GC-A3RB    13:20048104    A->G    Q6XPS3    A114A    114    A    A
# TPTE2    Missense_Mutation    TCGA-GC-A3RB    13:20048099    C->G    Q6XPS3    G116A    116    G    A
# TPTE2P6    RNA    TCGA-BT-A20Q    13:25168432    T->C    UNIPROT_FAIL    UNIPROT_FAIL
# TPTE2P6    RNA    TCGA-BT-A20X    13:25168463    T->C    UNIPROT_FAIL    UNIPROT_FAIL
# TPTE2P6    RNA    TCGA-DK-A2I4    13:25144762    G->T    UNIPROT_FAIL    UNIPROT_FAIL

def extract_mutations(file_path, exception_uniprot_fail):
    with open(file_path, "rb") as csvfile:
        # this file format does not have a header row
        csvreader = csv.reader(csvfile, delimiter="\t")

        for row in csvreader:
            num_col_uniprotfail = 7
            num_col_mutationinfo = 10
            if not ((len(row) == num_col_uniprotfail) or (len(row) == num_col_mutationinfo)):
                logging.warning("skipping row due to unexpected number of columns ({})".format(len(row)))
                raise Exception("unexpected number of columns: %s" % row[0])

            chr_info = row[3].split(":")

            mut_row = {
                "gene": row[0],
                "mutation_type": row[1],
                "patient_id": row[2],
                "chromosome": chr_info[0],
                "chromosome_position": chr_info[1],
                "dna_change": row[4]
            }

            if len(row) > num_col_uniprotfail and row[5] != "UNIPROT_FAIL":
                mut_row["uniprot_id"] = row[5]
                mut_row["amino_acid_mutation_detail"] = row[6]
                mut_row["amino_acid_position"] = row[7]
                mut_row["amino_acid_wildtype"] = row[8]
                mut_row["amino_acid_mutation"] = row[9]
            else:
                exception_uniprot_fail.write("\t".join(row) + "\n")

            yield mut_row

def main():
    parser = argparse.ArgumentParser(description="Utility to import TCGA mutation summaries to MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--f", required=True, help="Path to mutation summary file")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.f)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    collection = conn[args.db]["mutation_summary"]

    exception_filename = "%s_uniprot_fail.out" % args.db
    if os.path.exists(exception_filename): os.remove(exception_filename)

    count = 0
    exception_uniprot_fail = open(exception_filename, "w")
    for mut_row in extract_mutations(args.f, exception_uniprot_fail):
        collection.insert(mut_row)
        count += 1

    exception_uniprot_fail.close()

    line_count = sum(1 for line in open(exception_filename, "r"))

    logging.info("inserted count=%s" % count)
    logging.info("uniprot_fail exception file=%s:%s" % (exception_filename, line_count))

    conn.close()

if __name__ == "__main__":
    main()

