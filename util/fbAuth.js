const { admin,db } = require('./admin')

module.exports = async (req,res,next) => {
  let idToken;
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
    idToken = req.headers.authorization.split('Bearer ')[1]
  } else {
    console.error('No token found')
    return res.status(403).json({ error: 'Unauthorized' })
  }

  try {
    req.user = await admin.auth().verifyIdToken(idToken)
    let data =  await db.collection('users')
      .where('userId', '==', req.user.uid)
      .limit(1)
      .get()
    req.user.handle = data.docs[0].data().handle
    req.user.imageUrl = data.docs[0].data().imageUrl
    next()
  } catch (e) {
    console.error('Error while verifying token ',e)
    return res.status(403).json(e)
  }
}