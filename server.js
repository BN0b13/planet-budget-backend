'use strict';

// Routes
const login = require('./routes/login');
const { signUp } = require('./routes/signUp');
const { user } = require('./routes/user');
const { purchases } = require('./routes/purchases');

module.exports.server = async (event) => {
  try {
    const path = JSON.parse(event.body).path ? JSON.parse(event.body).path : null;

    if(!path) {
        return {
            statusCode: 404,
            msg: 'Access Denied',
        }
    } else {
        switch(path) {
            case 'login':
                return await login.login(event.body);
            case 'sign-up':
                return await signUp(event);
            case 'user-data':
                return await user(event);
            case 'purchases':
                return await purchases(event);
            default:
                return {
                    statuscode: 404,
                }
        }
    }
  } catch (err) {
    console.log('Server error: ', err);
    return { statusCode: 500 };
  }
};