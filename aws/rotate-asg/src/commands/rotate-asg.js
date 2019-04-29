const { describeCluster, terminateInstances } = require('../lib/aws-services')
const AutoScalingRotation = require('../lib/autoscaling')

const printAsgInfo = (cluster, print) => {
  print.info(`Auto Scaling Group Id: ${cluster.autoscaling.AutoScalingGroupName}`)
  print.info(`Current Instance size: ${cluster.autoscaling.Instances.length}`)
  print.info(`Desided Size: ${cluster.autoscaling.DesiredCapacity}. Min Size: ${cluster.autoscaling.MinSize}. Max Size: ${cluster.autoscaling.MaxSize}`)

  const { table } = print
  const azStats = cluster.instances.reduce((acc, val) => {
    if (!acc[val.az]) {
      acc[val.az] = 1
    } else {
      acc[val.az]++
    }
    return acc
  }, {})
  table(
    [
      ['AZ name', 'Size'],
      ...Object.keys(azStats).map( azName => [azName, azStats[azName]])
    ],
    { format: 'markdown' }
  )
}

module.exports = {
  name: 'rotate-asg',
  run: async toolbox => {
    const asgId = toolbox.parameters.first
    const { r: region = 'ap-southeast-2' } = toolbox.parameters.options
    const { print } = toolbox

    const cluster = await describeCluster(asgId, region)

    /**
     * print out the current Auto Scaling Group information
     */
    printAsgInfo(cluster, print)
    await toolbox.prompt.confirm('Do you want to rotate this Auto Scaling Group?')
    const spinner = toolbox.print.spin()
    AutoScalingRotation.on('ROTATION_START', startTime => {
      spinner.start(`Start to rotate instances in Auto Scaling Group ${asgId} at ${startTime}`)
    })
    AutoScalingRotation.on('INSTANCE_BEING_DETACHED', instanceId => {
      spinner.start(`Instance ${instanceId} is being detached`)
    })
    AutoScalingRotation.on('AWAITING_PENDING_INSTANCE', (instanceId, progress) => {
      spinner.start(`Await pending instance ${instanceId}(${progress})`)
    })
    AutoScalingRotation.on('INSTANCE_DETACHED', instanceId => {
      spinner.succeed(`Instance ${instanceId} is detached`)
    })
    AutoScalingRotation.on('INSTANCE_DETACHED', terminateInstances)
    AutoScalingRotation.start(asgId, region)
  }
}
