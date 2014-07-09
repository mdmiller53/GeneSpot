#!/usr/bin/env python

import argparse
import csv
import pymongo
import logging

from utilities import configure_logging

def extract_features(file_path):
    logging.info(file_path)

    with open(file_path, "rb") as csvfile:
        csvreader = csv.reader(csvfile, delimiter="\t")
        ids = csvreader.next()[1:]

        for row in csvreader:
            feature_id = row[0]
            values = row[1:]

            if len(values) != len(ids): raise Exception("mismatched values and features: %s (%s/%s)" % (feature_id, str(len(values)), str(len(ids))))

            feature_object = extract_feature_dict(feature_id)
            if feature_object["type"] == "N":
                feature_object["values"] = build_value_dict_numerical(ids, values)
            else:
                feature_object["values"] = build_value_dict_categorical(ids, values)

            yield feature_object

        logging.info("samples=%s" % str(len(ids)))

def extract_feature_dict(feature_id):
    feature_parts = feature_id.split(":")

    source = feature_parts[1]
    f_dict = {
        "id": feature_id,
        "type": feature_parts[0],
        "source": source
    }

    if source == "CLIN":
        f_dict["code"] = feature_parts[2]

    elif source == "SAMP":
        f_dict["code"] = feature_parts[2]

    elif source == "GEXP":
        f_dict["gene"] = feature_parts[2]
        f_dict["platform"] = "mRNAseq"
        f_dict["code"] = feature_parts[7]
        if feature_parts[7] == "array": f_dict["platform"] = "micro-array"

        annotate_chr_location(feature_parts, f_dict)

    elif source == "GNAB":
        f_dict["gene"] = feature_parts[2]
        f_dict["code"] = feature_parts[7]

        annotate_chr_location(feature_parts, f_dict)

    elif source == "MIRN":
        f_dict["microRNA"] = feature_parts[2]
        f_dict["accession_number"] = feature_parts[7]

        annotate_chr_location(feature_parts, f_dict)

    elif source == "CNVR":
        f_dict["locus"] = feature_parts[2]
        f_dict["code"] = feature_parts[7]

        annotate_chr_location(feature_parts, f_dict)

    elif source == "METH":
        f_dict["chromosome"] = feature_parts[3]

        position = feature_parts[4]
        if not position: f_dict["position"] = int(position)

        last_part = feature_parts[7]
        f_dict["code"] = last_part

        last_parts = last_part.split("_")
        if len(last_parts) > 0: f_dict["probe"] = last_parts[0]

    elif source == "RPPA":
        f_dict["antibody"] = feature_parts[7]

    else:
        raise Exception("Unknown feature id %s" % feature_id)

    logging.debug("%s=%s" % (feature_id, f_dict))
    return f_dict

def annotate_chr_location(feature_parts, f_dict):
    f_dict["chromosome"] = feature_parts[3]
    start = feature_parts[4]
    end = feature_parts[5]
    f_dict["strand"] = feature_parts[6]

    if start: f_dict["start"] = int(start)
    if end: f_dict["end"] = int(end)

def build_value_dict_categorical(ids, values):
    result = {}
    for i, v in zip(ids, values):
        result[i] = v
    return result

def build_value_dict_numerical(ids, values):
    result = {}
    for i, v in zip(ids, values):
        if v == "NA":
            result[i] = v
        else:
            result[i] = float(v)
    return result

def main():
    parser = argparse.ArgumentParser(description="Utility to import TCGA feature matrix to MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--f", required=True, help="Path to feature matrix file")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.f)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    collection = conn[args.db]["feature_matrix"]

    count = 0
    for feature_object in extract_features(args.f):
        collection.insert(feature_object)
        count += 1

    logging.info("inserted count=%s" % count)

    conn.close()

if __name__ == "__main__":
    main()
