import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import * as helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as rateLimit from 'express-rate-limit';
import * as cors from 'cors';
import * as morgan from 'morgan';
import { config } from 'dotenv';
import * as DB from './src/db';

config();

import { Request, authenticate, protect } from './src/middleware';

const app = express();

/**
 * For development purposes
 */
app.use(cors());

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'pug');

/**
 * Request logger
 */
app.use(morgan('tiny'));

/**
 * Authentication logic
 */
app.use(authenticate);

const postList = [
  {
    text: 'I know a secret ;) Wanna hear it too?',
    owner: 'test-user',
    createdAt: new Date(),
  },
  {
    text: 'Just a test :)',
    owner: 'test-user',
    createdAt: new Date(),
  },
  {
    text: 'Site is now open :)',
    owner: 'admin',
    createdAt: new Date(),
  },
];

app.get('/', protect, (req, res) => {
  let list = [...postList];
  if ((req as any).user && (req as any).user.isAdmin) {
    list = list.map((x) => ({
      ...x,
      owner: `${x.owner} (ID: ${DB.findUser(x.owner)._id})`,
    }));
  }

  res.render('index', {
    postList: list,
    user: (req as any).user,
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later',
});

app.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { message: 'Invalid credentials' });
  }

  const user = DB.findUser(username);
  if (!user) return res.render('login', { message: 'Invalid credentials' });
  if (user.password !== password) {
    return res.render('login', { message: 'Invalid credentials' });
  }

  res.cookie('sid', user.sid);

  return res.redirect('/');
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many register attempts, please try again later',
});

app.post('/register', registerLimiter, (req, res) => {
  const { username, password, re_password, is_admin } = req.body;
  if (!username || !password || !re_password) {
    return res.render('register', { message: 'Invalid request' });
  }

  if (password !== re_password) {
    return res.render('register', { message: 'Passwords do not match' });
  }

  const user = DB.createUser({
    username,
    password,
    isAdmin: is_admin === 'on',
  });
  if (typeof user === 'string') {
    return res.render('register', { message: user });
  }

  res.cookie('sid', user.sid);

  return res.redirect('/');
});

app.get('/logout', (req, res) => {
  res.cookie('sid', '', { maxAge: 0 });
  res.redirect('/login');
});

app.post('/post', protect, (req, res) => {
  const { message } = req.body;
  if (!message) return res.redirect('/');

  postList.push({
    text: message,
    owner: (req as any).user.username,
    createdAt: new Date(),
  });

  return res.redirect('/');
});

app.post('/remove-post', protect, (req, res) => {
  const { index } = req.body;

  console.log(req.body);

  const post = postList[parseInt(index)];
  if (!post) return res.redirect('/');

  if (post.owner === (req as any).user.username || (req as any).user.isAdmin) {
    postList.splice(index, 1);
  }

  return res.redirect('/');
});

let server;

/**
 * SSL support
 */
if (process.env.SSL == 'false') {
  server = http.createServer(app);
} else {
  server = https.createServer(
    {
      key: fs.readFileSync(process.env.SSL_PRIVATE_KEY, 'utf8'),
      cert: fs.readFileSync(process.env.SSL_CERTIFICATE, 'utf8'),
      ca: fs.readFileSync(process.env.SSL_CA_BUNDLE, 'utf8'),
    },
    app
  );
}

server.listen(process.env.PORT, () => {
  console.log(
    `Listening on port ${process.env.PORT} for ${
      process.env.SSL == 'false' ? 'HTTP' : 'HTTPS'
    } traffic...`
  );
});
