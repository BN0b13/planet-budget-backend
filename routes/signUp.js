'use strict';

require('dotenv/config');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const bcrypt = require('bcryptjs');

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.signUp = async (event) => {
  try {
    console.log('Sign Up Event: ', event.body);
  if(event.httpMethod != 'POST') {
    const data = JSON.stringify({ error: 'There was an error with signUp.signUp. Please try again.' });
    return {
      statusCode: 501,
      body: data
    }
  }

  const { 
    username, 
    password,
    email,
    profile,
    purchases,
    debt
  } = JSON.parse(event.body);
  const headers = {
    "Access-Control-Allow-Headers" : "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
  };
  const params = {
    TableName: process.env.USERS_TABLE,
    ProjectionExpression: "username",
    KeyConditionExpression: "username = :username",
    ExpressionAttributeValues: {
      ":username": username
    },
};

  const usernameQueryResult = await queryUsername(params);
  
  if(usernameQueryResult.length > 0) {
    console.log('Username exists. Unable to create new user.');
    return {
      headers,
      statusCode: 401,
      body: JSON.stringify(
        {
          message: 'Username exists. Unable to create new user.',
          input: event,
        },
        null,
        2
      ),
    };
  } else {
    try {
      const salt = bcrypt.genSaltSync(parseInt(process.env.SALT_ROUNDS));
      const id = uuid.v4();
      const payload = {
        id,
        username,
        date: new Date(),
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET);
      const params = {
        TableName: process.env.USERS_TABLE,
        Item: { 
          id,
          username,
          password: bcrypt.hashSync(password, salt),
          email,
          token,
          profile,
          purchases,
          debt,
        },
      };
  
      await dynamodb.put(params).promise();

      return {
        headers,
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'Sign-up successful. Logging user in...',
            token,
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
      console.log({ catchErr: err });
      return { statusCode: 500 };
    }
  }
  } catch (err) {
    console.log('There was an error with Sign Up: ', err);
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