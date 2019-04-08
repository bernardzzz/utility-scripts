const EventEmitter = require('events')
const { describeCluster, detachInstances } = require('./aws-services')

const AutoScalingRotation = new EventEmitter()

AutoScalingRotation.start = async function (asgId, region) {
  const cutOffTime = new Date()
  let oldInstance = await getOneOldInstance(asgId, region, cutOffTime)

  while (oldInstance) {
    // detach old instance
    await detachInstances(asgId, [oldInstance.ec2Id], region)
    this.emit('INSTANCE_BEING_DETACHED', oldInstance.ec2Id, region)
    console.log(`${oldInstance.ec2Id} is being detached`)
    // wait until cluster stablized
    let pendingInstance
    do {
      await sleep(2000)
      pendingInstance = await getOnePendingInstance(asgId, region)
    } while (pendingInstance)
    this.emit('INSTANCE_DETACHED', oldInstance.ec2Id, region)
    console.log(`${oldInstance.ec2Id} is detached`)
    oldInstance = await getOneOldInstance(asgId, region, cutOffTime)
  }
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
    .find( instance => new Date(instance.created) < cutOffTime)
}



module.exports = AutoScalingRotation
