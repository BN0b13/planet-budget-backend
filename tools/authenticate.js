// 'use strict';

require('dotenv/config');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const authenticate = async (token) => {
  try {
    console.log('Authenticate Token: ', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = decoded.username;

    const params = {
        TableName: process.env.USERS_TABLE,
        ProjectionExpression: "username, #t",
        KeyConditionExpression: "username = :username",
        ExpressionAttributeValues: {
        ":username": username
        },
        ExpressionAttributeNames: {
        "#t": "token"
        }
    };

    const usernameQueryResult = await queryUsername(params);

    if(usernameQueryResult.length > 0 && usernameQueryResult[0].token === token) {
      return true;
    }
      
    return false;
        
  } catch (err) {
  console.log('User query error: ', err);
  return { statusCode: 500 };
  }
};

const queryUsername = async (params) => {
  try {
    const result = await dynamodb.query(params).promise();
    return result.Items;
  } catch (err) {
    console.log('User query function error: ', err);
    return err;
  }
}

exports.authenticate = authenticate;