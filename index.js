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
      if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
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
      if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
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

exports.onUserImageChange = functions.firestore
  .document('users/{userId}').onUpdate( async change => {
    const before = change.before.data()
    const after = change.after.data()
    console.log(before)
    console.log(after)
    if(before.imageUrl !== after.imageUrl){
      console.log('image has changed')
      let batch = db.batch()
      const data = await db.collection('screams').where('userHandle','==', 
        before.handle).get()
      data.forEach(doc => {
        const scream = db.doc(`/screams/${doc.id}`)
        batch.update(scream, { userImage: after.imageUrl })
      })
      await batch.commit()
    } else console.log('image has not changed')
  })

exports.onScreamDelete = functions.firestore
.document('screams/{screamId}').onDelete( async (snapshot, context) => {
  const screamId = context.params.screamId
  const batch = db.batch()
  try {
    const collections = ['comments','likes','notifications']
    for (const col of collections) {
      const data = await db.collection(col)
        .where('screamId','==',screamId).get()
      data.forEach(doc => {
        batch.delete(db.doc(`/${col}/${doc.id}`))
      })
    }
    await batch.commit()
  } catch (err) {
    console.error(err)
  }
})