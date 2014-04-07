#!/usr/bin/env python

import argparse
import csv
import pymongo
import logging

from utilities import configure_logging

def extract_features(file_path):
    logging.info("extract_features(%s)" % file_path)

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

        logging.info("extract_features(%s):samples=%s" % (file_path, str(len(ids))))

def extract_feature_dict(feature_id):
    feature_parts = feature_id.split(":")

    source = feature_parts[1]
    f_dict = {
        "id": feature_id,
        "type": feature_parts[0],
        "source": source,
        "label": feature_parts[7]
    }

    if source == "CLIN":
        f_dict["label"] = feature_parts[2]

    elif source == "CNVR":
        start = feature_parts[4]
        end = feature_parts[5]

        if not start: start = -1
        if not end: end = -1

        f_dict["locus"] = feature_parts[2]
        f_dict["chromosome"] = feature_parts[3]
        f_dict["start"] = start
        f_dict["end"] = end
        f_dict["strand"] = feature_parts[6]

    elif source == "GEXP":
        start = feature_parts[4]
        end = feature_parts[5]
        if not start: start = -1
        if not end: end = -1

        f_dict["gene"] = feature_parts[2]
        f_dict["chromosome"] = feature_parts[3]
        f_dict["start"] = start
        f_dict["end"] = end
        f_dict["strand"] = feature_parts[6]

        f_dict["label"] = "mRNAseq"
        if feature_parts[7] == "array": f_dict["label"] = "micro-array"

    elif source == "GNAB":
        start = feature_parts[4]
        end = feature_parts[5]
        if not start: start = -1
        if not end: end = -1

        f_dict["gene"] = feature_parts[2]
        f_dict["chromosome"] = feature_parts[3]
        f_dict["start"] = start
        f_dict["end"] = end
        f_dict["strand"] = feature_parts[6]

    elif source == "MIRN":
        start = feature_parts[4]
        end = feature_parts[5]
        if not start: start = -1
        if not end: end = -1

        f_dict["microRNA"] = feature_parts[2]
        f_dict["chromosome"] = feature_parts[3]
        f_dict["start"] = start
        f_dict["end"] = end
        f_dict["strand"] = feature_parts[6]
        f_dict["accession_number"] = feature_parts[7]
        f_dict["label"] = feature_parts[2]

    elif source == "METH":
        f_dict["gene"] = feature_parts[2]
        f_dict["chromosome"] = feature_parts[3]
        f_dict["position"] = feature_parts[4]

        last_part = feature_parts[7]
        _pos = last_part.find("_")
        if _pos >= 0: f_dict["probe"] = last_part[:_pos]

    elif source == "RPPA":
        start = feature_parts[4]
        end = feature_parts[5]
        if not start: start = -1
        if not end: end = -1

        f_dict["gene"] = feature_parts[2]
        f_dict["chromosome"] = feature_parts[3]
        f_dict["start"] = start
        f_dict["end"] = end
        f_dict["strand"] = feature_parts[6]
        f_dict["protein"] = feature_parts[7]

    elif source == "SAMP":
        f_dict["label"] = feature_parts[2]

    else:
        raise Exception("Unknown feature id %s" % feature_id)

    logging.debug("%s=%s" % (feature_id, f_dict))
    return f_dict

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
    parser.add_argument("--fmx", required=True, help="Path to feature matrix file")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()

    configure_logging(args.loglevel.upper())

    logging.info("import file: %s" % args.fmx)
    logging.info("uploading to %s:%s/%s" % (args.host, args.port, args.db))

    conn = pymongo.Connection(args.host, args.port)
    collection = conn[args.db]["feature_matrix"]

    count = 0
    for feature_object in extract_features(args.fmx):
        collection.insert(feature_object)
        count += 1

    logging.info("inserted count=%s" % count)

    conn.close()

if __name__ == "__main__":
    main()
