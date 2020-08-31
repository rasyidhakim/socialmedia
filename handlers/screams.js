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