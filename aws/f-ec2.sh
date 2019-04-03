#!/usr/bin/env bash

##########################################
## Find ec2 instances matche the criterias
##########################################

while getopts e:t:c:b:r: option
do
  case "${option}"
  in
    e) ENV=${OPTARG};;
    t) TYPE=${OPTARG};;
    c) CLOUD=${OPTARG};;
    b) BUILD=${OPTARG};;
    r) REGION=${OPTARG};;
  esac
done

TAG_QUERY=" --filters "

if [[ ! -z "${ENV}" ]]; then
  TAG_QUERY="${TAG_QUERY} Name=tag:Environment,Values=${ENV} "
fi

if [[ ! -z "${BUILD}" ]]; then
  TAG_QUERY=" ${TAG_QUERY} Name=tag:EnvironmentTag,Values=${BUILD} "
fi

if [[ ! -z "${CLOUD}" ]]; then
  TAG_QUERY=" ${TAG_QUERY} Name=tag:Cloud,Values=${CLOUD} "
fi

if [[ ! -z "${TYPE}" ]]; then
  TAG_QUERY=" ${TAG_QUERY} Name=tag:HostRole,Values=${TYPE} "
fi

if [[ ! -z "${REGION}" ]]; then
  REGION_QUERY=" --region ${REGION} "
fi

aws ec2 describe-instances ${TAG_QUERY} ${REGION_QUERY}  --query "Reservations[].Instances[? State.Name == 'running' ][].{created_on: LaunchTime, private_ip: PrivateIpAddress,id: InstanceId, app_ver: Tags[?Key == 'Version'].Value | [0], cloud: Tags[?Key == 'Cloud'].Value | [0], env: Tags[?Key == 'Environment'].Value | [0], build: Tags[?Key == 'EnvironmentTag'].Value | [0], type: Tags[?Key == 'HostRole'].Value | [0]} " --output table --no-paginate;

