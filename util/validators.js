const { user } = require("firebase-functions/lib/providers/auth")

const emailCheck = (email) => {
  const regEx = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return email.match(regEx) ? true : false
}

const emptyCheck = (string) => {
  return string.trim() === '' ? true : false
}

exports.validateSignupData = newUser => {
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

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.validateLoginData = user => {
  let errors = {}
  if(emptyCheck(user.email)) errors.email = 'Must not be empty'
  if(emptyCheck(user.password)) errors.password = 'Must not be empty'

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.reduceUserDetails = data => {
  let userDetails = {}

  if(!emptyCheck(data.bio.trim())) userDetails.bio = data.bio
  if(!emptyCheck(data.website.trim())){
    data.website.trim().substring(0,4) !== 'http' 
      ? userDetails.website = `http://${data.website.trim()}` 
      : userDetails.website = data.website
  }
  if(!emptyCheck(data.location.trim())) userDetails.location = data.location

  return userDetails
}