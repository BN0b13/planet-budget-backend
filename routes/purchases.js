'use strict';

require('dotenv/config');
const { authenticate } = require('../tools/authenticate');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.purchases = async (event) => {
    try {
        const { token, purchase = null, id = null } = JSON.parse(event.body);
        if(authenticate(token)) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const username = decoded.username;

            const headers = {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            };

            if(event.httpMethod === 'POST') { return await addPurchase(headers, username,  purchase) }

            if(event.httpMethod === 'PUT') { return await editPurchase(headers, username, purchase) }

            if(event.httpMethod === 'DELETE') { return await deletePurchase(id, headers, username) }
        }
    } catch (err) {
        console.log('Purchase Error: ', err);
        return { statusCode: 500 };
    }
};

const queryUserPurchases = async (username) => {
    try {
        console.log('Query User username: ', username);
      const params = {
        TableName: process.env.USERS_TABLE,
        ProjectionExpression: "purchases",
        KeyConditionExpression: "username = :username",
        ExpressionAttributeValues: {
          ":username": username
        },
    };
      const result = await dynamodb.query(params).promise();
      return result.Items;
    } catch (err) {
      console.log('User Query Error: ', err);
      return err;
    }
  }

const addPurchase = async (headers, username, purchase) => {
    try {
        purchase.id = uuidv4();
        const purchases = await queryUserPurchases(username);
        purchases[0].purchases.push(purchase);

        const params = {
            TableName: process.env.USERS_TABLE,
            Key: {
                username: username
            },
            UpdateExpression: "set #purchases = :purchases",
            ExpressionAttributeNames: {
                "#purchases": "purchases"
            },
            ExpressionAttributeValues: {
                ":purchases": purchases[0].purchases
            }
        };
            
        await dynamodb.update(params).promise();
        
        return {
            headers,
            statusCode: 200,
            body: JSON.stringify(
            {
                message: 'Add purchase successful.',
                purchases: purchases[0].purchases,
            },
            null,
            2
            ),
        }; 
    } catch (err) {
        console.log('Add Purchase Error: ', err);
        return err;
    }
}

const editPurchase = async (headers, username, purchase) => {
    try {
        console.log('Edit Purchase Body: ', purchase);
        const { id, purchaseName, amount, purchaseType } = purchase;
        const purchases = await queryUserPurchases(username);
        console.log('Before Purchase Update: ', JSON.stringify(purchases[0].purchases));
        const updatedPurchases = purchases[0].purchases.map(item => {
            console.log(item);
            if(item.id === id) {
                return {
                    id: item.id,
                    purchaseName,
                    amount,
                    purchaseType
                }
            }
            return item
        });
        const params = {
            TableName: process.env.USERS_TABLE,
            Key: {
                username: username
            },
            UpdateExpression: "set #purchases = :purchases",
            ExpressionAttributeNames: {
                "#purchases": "purchases"
            },
            ExpressionAttributeValues: {
                ":purchases": updatedPurchases
            }
        };
            
        await dynamodb.update(params).promise();

        return {
            headers,
            statusCode: 200,
            body: JSON.stringify({
                msg: `Purchase ${id} has been updated.`
            })
        }
    } catch (err) {
        console.log('Edit Purchase Error: ', err);
    }
}

const deletePurchase = async (id, headers, username) => {
    try {
        const purchases = await queryUserPurchases(username);
        const filteredPurchases = purchases[0].purchases.filter(purchase => purchase.id !== id);
        const params = {
            TableName: process.env.USERS_TABLE,
            Key: {
                username: username
            },
            UpdateExpression: "set #purchases = :purchases",
            ExpressionAttributeNames: {
                "#purchases": "purchases"
            },
            ExpressionAttributeValues: {
                ":purchases": filteredPurchases
            }
        };
            
        await dynamodb.update(params).promise();

        return {
            headers,
            statusCode: 200,
            body: JSON.stringify({
                msg: `Purchase ${id} has been deleted.`
            })
        }
    } catch (err) {
        console.log('Delete Purchase Error: ', err);
    }
}