const functions = require('firebase-functions');
const admin = require('firebase-admin')
require('dotenv').config()

admin.initializeApp()

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_PROJECT_ID + ".firebaseapp.com",
  databaseURL: "https://" + process.env.FIREBASE_PROJECT_ID + ".firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_PROJECT_ID + ".appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const express = require('express')
const app = express()

const firebase = require('firebase');
const { json } = require('express');
firebase.initializeApp(firebaseConfig)

const db = admin.firestore()

app.get('/screams', async(req,res) => {
  try {
    let data = await db
      .collection('screams')
      .orderBy('createdAt','desc')
      .get()
    
    let screams = []
    data.forEach(doc => {
      screams.push({
        screamId: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt
      })
    })
    return res.json(screams)
  } catch (e) {
    console.error(e)
    res.json(e)
  }
})

app.post('/screams', async(req,res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString()
  }
  try {
    let data = await db.collection('screams').add(newScream)
    return res.json({ message: `document ${data.id} created successfully`})
  } catch (e) {
    res.status(500).json({ error: 'something is wrong, i can feel it'})
    console.error(e)
  }
})

const emailCheck = (email) => {
  const regEx = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return email.match(regEx) ? true : false
}

const emptyCheck = (string) => {
  return string.trim() === '' ? true : false
}

//Signup route
app.post('/signup', async (req,res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  }

  let errors = {}

  if(emptyCheck(newUser.email))
    errors.email = 'Must not be empty'
  else if(!emailCheck(newUser.email))
    errors.email = 'Must be a valid email address'
  if(emptyCheck(newUser.password))
    errors.password = 'Must not be empty'
  if(newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = 'Password must match'
  if(emptyCheck(newUser.handle))
    errors.handle = 'Must not be empty'

  if(Object.keys(errors).length > 0)
    return res.status(400).json(errors)

  // TODO: validate data
  try {
    let doc = await db.doc(`/users/${newUser.handle}`).get()
    if(doc.exists)
      return res.status(400).json({ handle: 'this handle is already taken' })
    else {
      const data = await firebase.auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password)
      const token = await data.user.getIdToken()
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: data.user.uid
      }
      db.doc(`/users/${newUser.handle}`).set(userCredentials)
      return res.status(201).json({ token })
    }
  } catch (e) {
    console.error(e)
    if(e.code === 'auth/email-already-in-use')
      return res.status(400).json({ email: 'email already in use'  })
    else
      return res.status(500).json({ error: e.code })
  }
})

app.post('/login', async (req,res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  let errors = {}

  if(emptyCheck(user.email)) errors.email = 'Must not be empty'
  if(emptyCheck(user.password)) errors.password = 'Must not be empty'

  if(Object.keys(errors).length > 0)
    return res.status(400).json(errors)

  try {
    const login = await firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    const token = await login.user.getIdToken()
    return res.status(200).json({token})
  } catch (e) {
    console.error(e)
    if(e.code == 'auth/wrong-password')
      return res.status(403).json({ general : 'Wrong credential, please try again' })
    else return res.status(500).json({ error: e.code })
  }

})

exports.api = functions.https.onRequest(app)