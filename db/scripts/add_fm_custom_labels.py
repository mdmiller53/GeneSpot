'''
Created on Jun 4, 2014

@author: michael
'''
import argparse
import logging
from os import path
import pymongo
import re

from utilities import configure_logging

ffnPattern = re.compile('FFN.*\.tsv$')

def addLabels(collection, path):
    logging.info(collection)
    with open(path, 'r') as labels:
        for line in labels:
            if '#' == line[0]:
                continue
            fields = line.strip().split('\t')
            if 2 > len(fields):
                raise ValueError('did not find two fields!!!')
            if collection.find_one({'id': fields[0]}):
                logging.info('found %s, updating label to %s', fields[0], fields[1])
                collection.update({'id': fields[0]}, {"$set": {"label": fields[1]}})
            else:
                logging.info("didn't find %s", (fields[0]))

def checkForFFNFile(files, dirname, names):
    for name in names:
        if ffnPattern.search(name):
            files += [dirname + '/' + name];
    
def findFNFfiles(args, dirname, names):
    dirs, topname = path.split(dirname);
    _, parent = path.split(dirs);
    if dirs == args.root and topname == args.dir:
        checkForFFNFile(args.topfiles, dirname, names)
    if args.tumor.lower() == parent.lower() and topname.startswith(args.dir):
        checkForFFNFile(args.tumorfiles, dirname, names)
    
def main():
    parser = argparse.ArgumentParser(description="Utility to add custom labels to TCGA feature matrix in MongoDB")
    parser.add_argument("--host", required=True, help="MongoDB host name")
    parser.add_argument("--port", required=True, type=int, help="MongoDB port")
    parser.add_argument("--db", required=True, help="Database name")
    parser.add_argument("--tumor", required=True, help="Tumor type")
    parser.add_argument("--root", required=True, help="Root path to search for FFN custom files")
    parser.add_argument("--dir", default="aux", help="directory to look for FFN custom files")
    parser.add_argument("--loglevel", default="INFO", help="Logging Level")
    args = parser.parse_args()
    configure_logging(args.loglevel.upper())

    logging.info('starting add custom labels to feature matrix:\n\t%s' % (args))

    args.topfiles = [];
    args.tumorfiles = []
    path.walk
    path.walk(args.root, findFNFfiles, args)
    logging.info('%s %s', args.topfiles, args.tumorfiles)
    
    conn = pymongo.Connection(args.host, args.port)
    collection = conn[args.db]["feature_matrix"]
    if 0 == len(args.topfiles):
        raise ValueError('did not find a general custom file')
    else:
        for topfile in args.topfiles:
            addLabels(collection, topfile);
    if 0 == len(args.tumorfiles):
        logging.info('did not find a tumor type custom file')
    else:
        for tumorfile in args.tumorfiles:
            addLabels(collection, tumorfile);
    conn.close()
    
    logging.info('finished add custom labels to feature matrix')

if __name__ == '__main__':
    main()
    