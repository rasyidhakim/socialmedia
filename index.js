const functions = require('firebase-functions');
const express = require('express')
const app = express()

const FBAuth = require('./util/fbAuth')
const { db } = require('./util/admin')

const { getAllScreams, postOneScream, getScream, commentOnScream, 
  likeScream, unlikeScream,deleteScream } = require('./handlers/screams')
const { signup,login, uploadImage, addUserDetails, getCurrentUser,
  getUserDetails, markNotificationRead } = require('./handlers/users')

// Screams Route
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream )
app.get('/scream/:screamId', getScream)
app.delete('/scream/:screamId', FBAuth, deleteScream)
app.get('/scream/:screamId/like', FBAuth, likeScream)
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream)
app.post('/scream/:screamId/comment', FBAuth, commentOnScream)

// Users route
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth ,uploadImage)
app.post('/user',FBAuth, addUserDetails)
app.get('/user', FBAuth, getCurrentUser)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBAuth, markNotificationRead)

exports.api = functions.https.onRequest(app)

exports.createNotificationOnLike = functions.firestore
  .document('likes/{id}').onCreate( async snapshot => {
    try {
      let doc = await db.doc(`/screams/${snapshot.data().screamId}`).get()
      if(doc.exists){
        await db.doc(`/notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle,
          sender: snapshot.data().userHandle,
          type: 'like',
          read: false,
          screamId: doc.id
        })
      }
    } catch(err) {
      console.error(err)
    }
  })

exports.deleteNotificationOnUnlike = functions.firestore
.document('likes/{id}').onDelete( async snapshot => {
  try {
    await db.doc(`/notifications/${snapshot.id}`).delete()
  } catch (e) {
    console.error(e)
  }
})

exports.createNotificationOnComment = functions.firestore
  .document('comments/{id}').onCreate( async snapshot => {
    try {
      let doc = await db.doc(`/screams/${snapshot.data().screamId}`).get()
      if(doc.exists){
        await db.doc(`/notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle,
          sender: snapshot.data().userHandle,
          type: 'comment',
          read: false,
          screamId: doc.id
        })
      }
    } catch (err) {
      console.log(err)
    }
  })