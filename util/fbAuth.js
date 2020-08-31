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
    console.log(data)
    req.user.handle = data.docs[0].data().handle
    console.log(data.docs[0].data())
    next()
  } catch (e) {
    console.error('Error while verifying token ',e)
    return res.status(403).json(e)
  }
}