'use strict';

require('dotenv/config');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const { recaptchaCheck } = require('../tools/recaptcha');

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.login = async (body) => {
  try {
    console.log('Login Event: ', body);

    const headers = {
      "Access-Control-Allow-Headers" : "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    };

    const parseData = JSON.parse(body);
    if(parseData.recaptcha) {
      const recaptcha = await recaptchaCheck(parseData.recaptcha);
      return {
        headers,
        statusCode: recaptcha,
        body: JSON.stringify({
          msg: 'ReCAPTCHA check completed.'
        })
      }
    }

    const { username, password } = JSON.parse(body);

    console.log('Password: ', password);

    const params = {
        TableName: process.env.USERS_TABLE,
        ProjectionExpression: "username, password, id, email, profile, purchases, debt, #t",
        KeyConditionExpression: "username = :username",
        ExpressionAttributeValues: {
          ":username": username
        },
        ExpressionAttributeNames: {
          "#t": "token"
        }
    };

    const usernameQueryResult = await queryUsername(params);

    // console.log('Current token: ', usernameQueryResult[0].token);
    console.log('Data results: ', usernameQueryResult);

    const checkPassword = await bcrypt.compare(password, usernameQueryResult[0].password);
    
    if(usernameQueryResult.length > 0 && checkPassword) {
      try {
        console.log('Log In Success!', usernameQueryResult[0]);
        const {
          email = null,
          profile = null,
          purchases = null,
          debt = null,
        } = usernameQueryResult[0];
        const payload = {
          id: usernameQueryResult[0].id,
          username, 
          date: new Date()
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET);

        console.log('New token result: ', token);

        const params = {
          TableName: process.env.USERS_TABLE,
          Key: {
            username: username
          },
          UpdateExpression: "set #t = :token",
          ExpressionAttributeNames: {
            "#t": "token"
          },
          ExpressionAttributeValues: {
              ":token": token
          }
        };

        await dynamodb.update(params).promise();
        
        return {
          headers,
          statusCode: 200,
          body: JSON.stringify(
            {
              message: 'Login successful.',
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
        console.log('Update user token error: ', err);
        return { statusCode: 500 };
      }
    }
        
    return {
      headers,
      statusCode: 401,
      body: JSON.stringify(
        {
          message: 'Login failed, please try again.',
        },
        null,
        2
      ),
    };
        
  } catch (err) {
    console.log('Login error: ', err);
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