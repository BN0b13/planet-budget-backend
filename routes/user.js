'use strict';

require('dotenv/config');
const { authenticate } = require('../tools/authenticate');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.user = async (event) => {
  try {
    const { token, data = null } = JSON.parse(event.body);
    if(authenticate(token)) {
      const headers = {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      };
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const username = decoded.username;

      if(event.httpMethod === 'POST') { return await getUserData({ headers, username }) }

      if(event.httpMethod === 'PUT') { return await editUserData({ headers, username, data }) }
    }
    
    return {
        statusCode: 403
    }
  } catch (err) {
    console.log('User query error: ', err);
    return { statusCode: 500 };
  }
};

const getUserData = async ({ username, headers }) => {
  try {
      const params = {
        TableName: process.env.USERS_TABLE,
        ProjectionExpression: "username, password, id, email, profile, purchases, debt",
        KeyConditionExpression: "username = :username",
        ExpressionAttributeValues: {
          ":username": username
        },
    };
      const result = await dynamodb.query(params).promise();
      const {
        email = null,
        profile = null,
        purchases = null,
        debt = null,
      } = result.Items[0];
      return {
        headers,
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'User data fetch successful.',
            data: {
              username,
              email,
              profile,
              purchases,
              debt,
            }
          },
          null,
          2
          ),
      };
  } catch (err) {
    console.log('User query function error: ', err);
    return err;
  }
}

const editUserData = async ({ username, headers, data }) => {
  try {
      const { email, income, compensationRate, compensationType, darkMode  } = data;
      const profileObj = {
        income,
        compensationRate,
        compensationType,
        darkMode
      };

      const params = {
        TableName: process.env.USERS_TABLE,
        Key: {
            username: username
        },
        UpdateExpression: "set #email = :email, #profile = :profile",
        ExpressionAttributeNames: {
            "#email": "email",
            "#profile": "profile"
        },
        ExpressionAttributeValues: {
            ":email": email,
            ":profile": profileObj
        }
      };
          
      await dynamodb.update(params).promise();

      return {
          headers,
          statusCode: 200,
          body: JSON.stringify({
              msg: `User Info Has Been Updated.`
          })
      }
  } catch (err) {
      console.log('Edit Purchase Error: ', err);
  }
}