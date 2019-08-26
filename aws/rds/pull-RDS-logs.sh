#!/usr/bin/env bash

instanceId=$1

for logFileName in `aws rds describe-db-log-files --no-paginate --db-instance-identifier ${instanceId} | jq -r ".DescribeDBLogFiles[].LogFileName"`
do
    aws rds download-db-log-file-portion --no-paginate --db-instance-identifier ${instanceId} --log-file-name ${logFileName} --output text >> full.log
done
