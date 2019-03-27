import argparse
import sys
from functools import reduce

import boto3

TABLE_NAME = 'restrict-ip-table'


def format_ip(ip):
    def shift_and_sum(x, y):
        print(x, y)
        return (int(x) << 8) + int(y)
    return reduce(shift_and_sum, ip.split('.'))


def import_csv_to_dynamodb(table_name, csv_file_name):
    '''
    Import a CSV file to a DynamoDB table
    '''
    session = boto3.session.Session()
    dynamodb = session.resource('dynamodb')
    dynamodb_table = dynamodb.Table(table_name)
    if csv_file_name == '-':
        csv_file = sys.stdin
    else:
        csv_file = open(csv_file_name, 'r')

    with dynamodb_table.batch_writer() as batch:
        for no, cur_line in enumerate(csv_file):
            row = {'ip': format_ip(cur_line)}
            print('{} {}'.format(no, row))
            batch.put_item(Item=row)

    csv_file.close()


parser = argparse.ArgumentParser(description='Upload list of IPs to dynamo.')
parser.add_argument('csv_file_name', help='filename with ips to upload')
parser.add_argument(
    '--table-name', help='dynamodb table name', default=TABLE_NAME)


def main():
    args = parser.parse_args()
    import_csv_to_dynamodb(args.table_name, args.csv_file_name)


if __name__ == "__main__":
    main()
