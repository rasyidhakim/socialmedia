const functions = require('firebase-functions');
const express = require('express')
const app = express()

const FBAuth = require('./util/fbAuth')

const { getAllScreams, postOneScream } = require('./handlers/screams')
const { signup,login, uploadImage, addUserDetails, getCurrentUser } = require('./handlers/users')

// Screams Route
app.get('/screams', getAllScreams)
app.post('/screams', FBAuth, postOneScream )
app.post('/user/image', FBAuth ,uploadImage)
app.post('/user',FBAuth, addUserDetails)
app.get('/user', FBAuth, getCurrentUser)

// Users route
app.post('/signup', signup)
app.post('/login', login)

exports.api = functions.https.onRequest(app)