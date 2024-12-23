/* eslint handle-callback-err: "off"*/

process.env.NODE_ENV = 'test'

const User = require('../app/models/user')
const faker = require('faker')
const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../server')
// eslint-disable-next-line no-unused-vars
const should = chai.should()
const loginDetails = {
  email: 'admin@admin.com',
  password: '12345'
}
let token = ''
const createdID = []
let verification = ''
let verificationForgot = ''
const email = faker.internet.email()
const failedLoginAttempts = 5
const badUser = {
  name: 'Bad user',
  email: 'bad@user.com',
  password: '54321'
}
const badLoginDetails = {
  email: 'bad@user.com',
  password: '12345'
}

chai.use(chaiHttp)

describe('*********** AUTH ***********', () => {
  describe('/GET /', () => {
    it('it should GET home API url', (done) => {
      chai
        .request(server)
        .get('/')
        .end((err, res) => {
          res.should.have.status(200)
          done()
        })
    })
  })

  describe('/GET /404url', () => {
    it('it should GET 404 url', (done) => {
      chai
        .request(server)
        .get('/404url')
        .end((err, res) => {
          res.should.have.status(404)
          res.body.should.be.an('object')
          done()
        })
    })
  })

  describe('/POST login', () => {
    it('it should GET token', (done) => {
      chai
        .request(server)
        .post('/login')
        .send(loginDetails)
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.an('object')
          res.body.should.have.property('token')
          token = res.body.token
          done()
        })
    })
  })

  describe('/POST register', () => {
    it('it should POST register', (done) => {
      const user = {
        name: faker.random.words(),
        email,
        password: faker.random.words()
      }
      chai
        .request(server)
        .post('/register')
        .send(user)
        .end((err, res) => {
          res.should.have.status(201)
          res.body.should.be.an('object')
          res.body.should.include.keys('token', 'user')
          createdID.push(res.body.user._id)
          verification = res.body.user.verification
          done()
        })
    })
    it('it should NOT POST a register if email already exists', (done) => {
      const user = {
        name: faker.random.words(),
        email,
        password: faker.random.words()
      }
      chai
        .request(server)
        .post('/register')
        .send(user)
        .end((err, res) => {
          res.should.have.status(422)
          res.body.should.be.a('object')
          res.body.should.have.property('errors')
          done()
        })
    })
  })

  describe('/POST verify', () => {
    it('it should POST verify', (done) => {
      chai
        .request(server)
        .post('/verify')
        .send({
          id: verification
        })
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.an('object')
          res.body.should.include.keys('email', 'verified')
          res.body.verified.should.equal(true)
          done()
        })
    })
  })

  describe('/POST forgot', () => {
    it('it should POST forgot', (done) => {
      chai
        .request(server)
        .post('/forgot')
        .send({
          email
        })
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.an('object')
          res.body.should.include.keys('msg', 'verification')
          verificationForgot = res.body.verification
          done()
        })
    })
  })

  describe('/POST reset', () => {
    it('it should POST reset', (done) => {
      chai
        .request(server)
        .post('/reset')
        .send({
          id: verificationForgot,
          password: '12345'
        })
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.should.have.property('msg').eql('PASSWORD_CHANGED')
          done()
        })
    })
  })

  describe('/GET token', () => {
    it('it should NOT be able to consume the route since no token was sent', (done) => {
      chai
        .request(server)
        .get('/token')
        .end((err, res) => {
          res.should.have.status(401)
          done()
        })
    })
    it('it should GET a fresh token', (done) => {
      chai
        .request(server)
        .get('/token')
        .set('Authorization', `Bearer ${token}`)
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.an('object')
          res.body.should.have.property('token')
          done()
        })
    })
  })

  describe('/POST register', () => {
    it('it should POST register', (done) => {
      chai
        .request(server)
        .post('/register')
        .send(badUser)
        .end((err, res) => {
          res.should.have.status(201)
          res.body.should.be.an('object')
          res.body.should.include.keys('token', 'user')
          createdID.push(res.body.user._id)
          done()
        })
    })
  })

  describe('/POST login', () => {
    for (let x = 1; x < failedLoginAttempts + 1; x++) {
      it(`it should NOT POST login after password fail #${x}`, (done) => {
        chai
          .request(server)
          .post('/login')
          .send(badLoginDetails)
          .end((err, res) => {
            res.should.have.status(409)
            res.body.should.be.a('object')
            res.body.should.have.property('errors').that.has.property('msg')
            res.body.errors.should.have.property('msg').eql('WRONG_PASSWORD')
            done()
          })
      })
    }

    it('it should NOT POST login after password fail #6 and be blocked', (done) => {
      chai
        .request(server)
        .post('/login')
        .send(badLoginDetails)
        .end((err, res) => {
          res.should.have.status(409)
          res.body.should.be.a('object')
          res.body.should.have.property('errors').that.has.property('msg')
          res.body.errors.should.have.property('msg').eql('BLOCKED_USER')
          done()
        })
    })

    it('it should NOT POST login after being blocked sending post with correct password', (done) => {
      chai
        .request(server)
        .post('/login')
        .send({
          email: badUser.email,
          password: badUser.password
        })
        .end((err, res) => {
          res.should.have.status(409)
          res.body.should.be.a('object')
          res.body.should.have.property('errors').that.has.property('msg')
          res.body.errors.should.have.property('msg').eql('BLOCKED_USER')
          done()
        })
    })
  })
  after(() => {
    createdID.forEach((id) => {
      User.findByIdAndRemove(id, (err) => {
        if (err) {
          console.log(err)
        }
      })
    })
  })
})
