'use strict'

const QS = require('querystring')
const AWS = require('aws-sdk')
const ssm = new AWS.SSM()
const dynamodb = new AWS.DynamoDB()

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request
  checkIpTable(request, callback)
}

const TableName = 'restrict-ip-table'

async function checkIpTable(request, callback) {
  const ipnumber = ip2int(request.clientIp).toString()
  let data
  try {
    data = await dynamodb.getItem({
      Key: { ip: { N: ipnumber } },
      TableName
    }).promise()
  } catch (err) {
    console.error(err)
    restrictedResponse(request, callback)
    return
  }
  if (!data.hasOwnProperty('Item')) {
    callback(null, request)
    return
  } else {
    await checkRestrictFlag(request, callback)
  }
}

async function checkRestrictFlag(request, callback) {
  const params = QS.parse(request.querystring)
  if (!params.ipr) {
    return restrictedResponse(request, callback)
  }
  const ssmParams = { Name: '/develop/shared/restrict_flag', WithDecryption: true }
  let data
  try {
    data = await ssm.getParameter(ssmParams).promise()
  } catch (err) {
    console.error(err)
    restrictedResponse(request, callback)
  }
  if (data.Parameter.Value !== params.ipr) {
    restrictedResponse(request, callback)
  } else {
    callback(null, request)
  }
}

function ip2int(ip) {
  return ip.split('.').reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet, 10), 0)
}

function restrictedResponse(request, callback) {
  request.uri = '/restricted.html'
  callback(null, request)
}
