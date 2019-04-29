const EventEmitter = require('events')
const { describeCluster, detachInstances } = require('./aws-services')

const AutoScalingRotation = new EventEmitter()

AutoScalingRotation.start = async function (asgId, region) {
  const cutOffTime = new Date()
  this.emit('ROTATION_START', cutOffTime)
  let cluster = await describeCluster(asgId, region)
  let oldInstance = await getOneOldInstance(asgId, region, cutOffTime)
  const minClusterSize = cluster.autoscaling.Instances.length
  let counter = 1
  while (oldInstance) {
    // detach old instance
    await detachInstances(asgId, [oldInstance.ec2Id], region)
    this.emit('INSTANCE_BEING_DETACHED', oldInstance.ec2Id, region)
    // wait until cluster stablized
    let pendingInstance
    let currentClusterSize = minClusterSize - 1
    
    do {
      if (pendingInstance) {
        this.emit('AWAITING_PENDING_INSTANCE', pendingInstance.InstanceId, `${counter}/${minClusterSize}`)
      }
      if (currentClusterSize < minClusterSize) {
        this.emit('AWAITING_LAUNCHING_NEW_INSTANCE')
      }
      await sleep(2000)
      pendingInstance = await getOnePendingInstance(asgId, region)
      cluster = await describeCluster(asgId, region)
      currentClusterSize = cluster.autoscaling.Instances.filter(instance => instance.LifecycleState === 'InService').length
    } while (pendingInstance || currentClusterSize < minClusterSize)
    this.emit('INSTANCE_DETACHED', oldInstance.ec2Id, region)
    counter += 1
    oldInstance = await getOneOldInstance(asgId, region, cutOffTime)
  }
  this.emit('ROTATION_FINISHED', new Date() - cutOffTime)
}

async function getOnePendingInstance (asgId, region) {
  const cluster = await describeCluster(asgId, region)
  const notInServiceInstance = cluster.autoscaling.Instances.find(instance => instance.LifecycleState !== 'InService')
  return notInServiceInstance
}

async function sleep (time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(time), time)
  })
}

async function getOneOldInstance (asgId, region, cutOffTime) {
  let cluster = await describeCluster(asgId, region)
  return cluster.instances
    .find(instance => new Date(instance.created) < cutOffTime)
}

module.exports = AutoScalingRotation
