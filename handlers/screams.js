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
    createdAt: new Date().toISOString()
  }
  try {
    let data = await db.collection('screams').add(newScream)
    return res.json({ message: `document ${data.id} created successfully`})
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
    await db.collection('comments').add(newComment)
    res.json(newComment)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Something\'s wrong, I can feel it' })
  }
}