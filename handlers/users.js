const { admin, db } = require('../util/admin')

const config = require('../util/config')

const firebase = require('firebase')
firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators')

// User login
exports.login = async (req,res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  const { valid, errors } = validateLoginData(user)

  if(!valid) return res.status(400).json(errors)

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
}

// User sign up
exports.signup = async (req,res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  }

  const { valid, errors } = validateSignupData(newUser)

  if(!valid) return res.status(400).json(errors)

  const defaultImage = 'default-profile.jpg'

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${defaultImage}?alt=media`,
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
}

// Add user details
exports.addUserDetails = async (req,res) => {
  let userDetails = reduceUserDetails(req.body)

  try {
    await db.doc(`/users/${req.user.handle}`).update(userDetails)
    return res.json({ message: 'Details added successfully'})
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.code })
  }
}

// Get user detail by handle
exports.getUserDetails = async (req,res) => {
  let userData = {}
  try {
    const doc = await db.doc(`/users/${req.params.handle}`).get()
    if(doc.exists){
      userData.user = doc.data()
      const data = await db.collection('screams').where('userHandle','==',req.params.handle)
        .orderBy('createdAt','desc').get()
      userData.screams = []
      data.forEach(el => {
        userData.screams.push({
          body: el.data().body,
          createdAt: el.data().createdAt,
          userHandle: el.data().userHandle,
          userImage: el.data().userImage,
          likeCount: el.data().likeCount,
          commentCount: el.data().commentCount,
          screamId: doc.id
        })
      })
      return res.json(userData)
    } else res.status(404).json({ error: 'user not found' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.code })
  }
}

// Get current user details
exports.getCurrentUser =  async (req,res) => {
  let userData = {}
  try {
    let doc = await db.doc(`/users/${req.user.handle}`).get()
    if(doc.exists){
      userData.credentials = doc.data()
      let data = await db.collection('likes')
        .where('userHandle', '==' , req.user.handle).get()

      userData.likes = []
      data.forEach(docu => userData.likes.push(docu.data()))
      let recipientData = await db.collection('notifications').where('recipient','==', req.user.handle)
        .orderBy('createdAt','desc').limit(10).get()
      userData.notifications = []
      recipientData.forEach( docu => {
        userData.notifications.push({
          recipient: docu.data().recipient,
          sender: docu.data().sender,
          createdAt: docu.data().createdAt,
          screamId: docu.data().screamId,
          type: docu.data().type,
          read: docu.data().read,
          notificationId: docu.id,
        })
      })
      return res.json(userData)
    }
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.code })
  }
}

// Upload image for user
exports.uploadImage = (req,res) => {
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')

  const busboy = new BusBoy({ headers: req.headers})

  let imageFileName
  let imageToBeUploaded = {}

  busboy.on('file', (fieldname,file, filename,encoding, mimetype) => {
    if(mimetype!== 'image/jpeg' && mimetype !== 'image/png')
      return res.status(400).json({ error: 'Wrong file type submitted'})
    console.log(fieldname)
    console.log(filename)
    console.log(mimetype)

    const imageExtension = filename.split('.')[filename.split('.').length-1]
    imageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`
    const filepath = path.join(os.tmpdir(), imageFileName)
    imageToBeUploaded = { filepath, mimetype }
    file.pipe(fs.createWriteStream(filepath))
  })
  busboy.on('finish', async () => {
    try {
      await admin.storage().bucket().upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contenType: imageToBeUploaded.mimetype
          }
        }
      })
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      await db.doc(`/users/${req.user.handle}`).update({ imageUrl })
      return res.json({ message: 'Image uploaded successfully'})
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: e.code })
    }
  })
  busboy.end(req.rawBody)
}

exports.markNotificationRead = async (req,res) => {
  let batch = db.batch()
  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`)
    batch.update(notification,{ read: true })
  })
  try {
    await batch.commit()
    return res.json({ message: 'Notifications marked read'})
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}
