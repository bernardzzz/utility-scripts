const aws = require('aws-sdk')

const getAutoScalingClient = region => new aws.AutoScaling({
  apiVersion: '2011-01-01',
  region
})

const getEC2Client = region => new aws.EC2({
  apiVersion: '2016-11-15',
  region
})

const describeAsg = (asgId, region) => new Promise((resolve, reject) => {
  const autoscaling = getAutoScalingClient(region)
  autoscaling.describeAutoScalingGroups({ AutoScalingGroupNames: [asgId] }, (err, data) => {
    if (err) {
      reject(err)
    }

    if (data) {
      resolve(data)
    }
  })
})

const describeInstances = (ec2Ids, region, token) => new Promise((resolve, reject) => {
  const ec2 = getEC2Client(region)
  ec2.describeInstances({
    InstanceIds: ec2Ids,
    NextToken: token
  }, (err, data) => {
    if (err) {
      reject(err)
    }
    if (data) {
      resolve(data)
    }
  })
})

exports.describeCluster = async (asgId, region) => {
  let instances = []
  const asg = await describeAsg(asgId, region)
  if (asg.AutoScalingGroups.length !== 1) {
    throw new Error(`Cannot find the Auto Scaling Group ${asgId}`)
  }
  const ec2Ids = asg.AutoScalingGroups[0].Instances.map(instance => instance.InstanceId)

  let token
  do {
    const {
      NextToken,
      Reservations
    } = await describeInstances(ec2Ids, region, token)
    token = NextToken

    instances = Reservations
      .reduce((acc, reservation) => acc.concat(reservation.Instances), [])
      .map(instance => {
        return {
          ec2Id: instance.InstanceId,
          az: instance.Placement.AvailabilityZone,
          state: instance.State.Name,
          created: instance.LaunchTime
        }
      })
      .concat(instances)
  } while (token)

  return {
    autoscaling: asg.AutoScalingGroups[0],
    instances
  }
}

exports.detachInstances = (asgId, instanceIds, region) => new Promise((resolve, reject) => {
  const client = getAutoScalingClient(region)
  client.detachInstances({
    InstanceIds: instanceIds,
    AutoScalingGroupName: asgId,
    ShouldDecrementDesiredCapacity: false
  }, (err, data) => {
    if (err) {
      reject(err)
    } else {
      resolve(data)
    }
  })
})

exports.terminateInstances = (instanceId, region) => new Promise((resolve, reject) => {
  const client = getEC2Client(region)
  client.terminateInstances({
    InstanceIds: [instanceId]
  }, (err, data) => {
    if (err) {
      reject(err)
    }
    if (data) {
      resolve(data)
    }
  })
})
