const { db } = require('../util/admin')

exports.getAllScreams = async(req,res) => {
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
}

exports.postOneScream = async(req,res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString()
  }
  try {
    let data = await db.collection('screams').add(newScream)
    const resScream = newScream
    resScream.screamId = data.id
    return res.json(resScream)
  } catch (e) {
    res.status(500).json({ error: 'something is wrong, i can feel it'})
    console.error(e)
  }
}

exports.getScream = async(req,res) => {
  let screamData = {}

  try {
    const doc = await db.doc(`/screams/${req.params.screamId}`).get()
    if(!doc.exists) res.status(404).json({ error: 'Scream not found' })
    screamData = doc.data()
    screamData.screamId = doc.id

    const data = await db
      .collection('comments')
      .orderBy('createdAt','desc')
      .where('screamId','==',req.params.screamId)
      .get()

    screamData.comments = []
    data.forEach(el => screamData.comments.push(el.data()))
    return res.json(screamData)
  } catch (e) {
    console.error(e)
    res.status(500).json(screamData)
  }
}

// Comment on a scream
exports.commentOnScream = async (req,res) => {
  if(req.body.body.trim() === '') 
    return res.status(400).json({ error: 'Must not be empty' })
  
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  }

  try {
    const doc = await db.doc(`/screams/${req.params.screamId}`).get()
    if(!doc.exists) return res.status(404).json({ error: 'Scream not found' })
    await doc.ref.update({ commentCount: doc.data().commentCount+1 })
    await db.collection('comments').add(newComment)
    res.json(newComment)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Something\'s wrong, I can feel it' })
  }
}

// Like a scream
exports.likeScream = async (req,res) => {
  try {
    const likeDocument = db.collection('likes')
      .where('userHandle','==',req.user.handle)
      .where('screamId','==',req.params.screamId).limit(1)
    
    const screamDocument = db.doc(`/screams/${req.params.screamId}`)

    let screamData = {}

    let doc = await screamDocument.get()
    if(doc.exists){
      screamData = doc.data()
      screamData.screamId = doc.id
      let data = await likeDocument.get()

      if(data.empty){
        await db.collection('likes').add({
          screamId: req.params.screamId,
          userHandle: req.user.handle
        })

        screamData.likeCount++
        await screamDocument.update({ likeCount: screamData.likeCount })
        return res.json(screamData)
      } else return res.status(400).json({ error: 'Scream already liked' })
        
    } else return res.status(404).json({ error: 'Scream not found' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.code})
  }
}

// Unlike a scream
exports.unlikeScream = async (req,res) => {
  try {
    const likeDocument = db.collection('likes')
      .where('userHandle','==',req.user.handle)
      .where('screamId','==',req.params.screamId).limit(1)
    
    const screamDocument = db.doc(`/screams/${req.params.screamId}`)

    let screamData = {}

    let doc = await screamDocument.get()
    if(doc.exists){
      screamData = doc.data()
      screamData.screamId = doc.id
      let data = await likeDocument.get()

      if(data.empty) return res.status(400).json({ error: 'Scream not liked' })
      else {
        await db.doc(`/likes/${data.docs[0].id}`).delete()
        screamData.likeCount--
        await screamDocument.update({ likeCount: screamData.likeCount})
        return res.json(screamData)
      }
        
    } else return res.status(404).json({ error: 'Scream not found' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.code})
  }
}

// Delete a scream
exports.deleteScream = async (req,res) => {
  try {
    const document = db.doc(`/screams/${req.params.screamId}`)
    const doc = await document.get()
    console.log(req.params.screamId)
    console.log(doc.data())
    if(!doc.exists) return res.status(404).json({ error: 'Scream not found'})
    if(doc.data().userHandle !== req.user.handle)
      return res.status(403).json({ error: 'You can\'t delete someone else scream (Unauthorized)' })
    await document.delete()
    res.json({ message: `Scream deleted successfully` })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.code})
  }
}