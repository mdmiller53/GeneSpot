# Depends on lxml
#    http://pypi.python.org/pypi/lxml/
#    easy_install lxml

import argparse
import gzip
import json
import pymongo
import sys
import logging

from lxml import etree


INCLUDE_DATABASES = set(['PFAM', 'SMART', 'PROFILE'])
PROTEIN_MATCH_TAGS = set(['ipr', 'lcn'])


def connect_database(hostname, port):
    connection = pymongo.Connection(hostname, port)
    return connection


def process_protein_flat(element):
    protein_id = element.attrib['id']
    matches = []

    for match_elem in element:
        if ((match_elem.tag != 'match') or (match_elem.attrib['dbname'] not in INCLUDE_DATABASES)):
            continue

        match = dict(match_elem.attrib)
        match['locations'] = []

        for lcn in match_elem:
            if (lcn.tag != 'lcn'):
                continue

            location = dict()
            location['start'] = int(lcn.attrib['start'])
            location['end'] = int(lcn.attrib['end'])
            location['score'] = float(lcn.attrib['score'])

            match['locations'].append(location)

        matches.append(match)

    return({'uniprot_id': protein_id,
        'name': element.attrib['name'],
        'length': int(element.attrib['length']),
        'matches': matches})


def process_protein_hierarchical(element):
    protein_id = element.attrib['id']
    match_dict = {}

    for match_elem in element:
        if ((match_elem.tag != 'match') or (match_elem.attrib['dbname'] not in INCLUDE_DATABASES)):
            continue

        match = None
        if match_elem.attrib['id'] in match_dict:
            match = match_dict[match_elem.attrib['id']]
        else:
            match = dict(match_elem.attrib)
            match_dict[match_elem.attrib['id']] = match_elem

        if 'locations' not in match:
            match['locations'] = []

        for child_elem in match_elem:
            if child_elem.tag not in PROTEIN_MATCH_TAGS:
                continue

            if child_elem.tag == 'ipr':
                if 'ipr' in match:
                    continue
                else:
                    match['ipr'] = dict(child_elem.attrib)

            if (child_elem.tag == 'lcn'):
                location = dict()
                location['start'] = int(child_elem.attrib['start'])
                location['end'] = int(child_elem.attrib['end'])
                location['score'] = float(child_elem.attrib['score'])

                match['locations'].append(location)

        match_dict[match['id']] = match

    return({'uniprot_id': protein_id,
        'name': element.attrib['name'],
        'length': int(element.attrib['length']),
        'matches': match_dict.values()
    })

def annotate_with_gene():
    pass

def load_gene_map_json(file_path):
    json_file = open(file_path, 'rb')
    data = json.load(json_file)
    json_file.close()
    return data

def main():
    mainparser = argparse.ArgumentParser(description="InterPro XML to MongoDB import utility")
    subparsers = mainparser.add_subparsers()

    cmd_line_parser = subparsers.add_parser('import', help="Import XML from command line")

    cmd_line_parser.add_argument('FILE', nargs=1, help='XML file containing InterPro entries. File type must be either \'.xml\' or \'.gz\'.')
    cmd_line_parser.add_argument('--host', required=True, type=str, help='hostname')
    cmd_line_parser.add_argument('--port', required=True, type=int, help='port')
    cmd_line_parser.add_argument('--db', required=True, help='database name')
    cmd_line_parser.add_argument('--collection', required=True, help='collection name')
    cmd_line_parser.add_argument('--process', default='hierarchical', choices=['hierarchical', 'flat'])
    cmd_line_parser.add_argument('--gene-map-json', nargs=1, required=False, type=str)
    cmd_line_parser.add_argument('--filter', default=False, required=False, action='store_true', help='If enabled, import only entries with matching UniProt ID in gene-map-json')

    args = mainparser.parse_args()

    # Connect to MongoDB
    conn = connect_database(args.host, args.port)
    collection = conn[args.db][args.collection]

    progress_interval = 50000
    counter = 0
    total_count = 0
    uniprot_to_gene_label_map = {}
    if args.gene_map_json is not None:
        uniprot_to_gene_label_map = load_gene_map_json(args.gene_map_json[0])

    enable_filter = args.filter

    filehandle = None
    source_file_path = args.FILE[0]
    filetype = source_file_path.lower().rsplit('.', 1)[1]

    if (filetype == 'gz'):
        filehandle = gzip.open(source_file_path, 'r')
    elif (filetype == 'xml'):
        filehandle = open(source_file_path, 'r')

    context = etree.iterparse(filehandle, events=('end',), tag='protein')

    process_fn = None
    if args.process == 'flat':
        process_fn = process_protein_flat
    elif args.process == 'hierarchical':
        process_fn = process_protein_hierarchical
    else:
        print("ERROR: Unknown process")
        sys.exit(1)

    ###################
    # Import the data #
    ###################
    for event, element in context:
        protein_data = process_fn(element)
        uniprot_id = protein_data["uniprot_id"]

        # Annotate the entry with a gene label if the UniProt ID to gene mapping was
        # provided as a command line argument.
        if uniprot_id in uniprot_to_gene_label_map:
            protein_data["gene"] = uniprot_to_gene_label_map[uniprot_id]

        if enable_filter and uniprot_id not in uniprot_to_gene_label_map:
            continue

        collection.insert(protein_data)

        element.clear()

        while element.getprevious() is not None:
            del element.getparent()[0]

        counter = counter + 1
        total_count = total_count + 1

        if counter == progress_interval:
            counter = 0
            print('{0:15d} records'.format(total_count))

    conn.close()
    filehandle.close()
    print("Inserted " + str(total_count) + " records in total.")


if __name__ == '__main__':
    main()
