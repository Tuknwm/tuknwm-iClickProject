const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// no auth — session always empty
app.use((req, res, next) => {
  res.locals.session = { user: null };
  next();
});

const pages = ['LandingPage:/', 'home', 'login', 'register', 'leaderboard', 'about', 'profile', 'friend', 'global', 'ChangePassword', 'ChangeUsername'];
pages.forEach(p => {
  const [view, route] = p.includes(':') ? p.split(':') : [p, `/${p}`];
  app.get(route, (_req, res) => res.render(view));
});

app.listen(port, () => console.log(`http://localhost:${port}`));
