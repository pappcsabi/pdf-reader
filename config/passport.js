const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: GitHubStrategy } = require('passport-github2');
const authService = require('../services/authService');

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await authService.findUserByEmail(email);
        if (!user || !user.password_hash) {
          return done(null, false);
        }
        const ok = await authService.comparePassword(password, user.password_hash);
        if (!ok) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.CALLBACK_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateUserByOAuth('google', profile);
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.CALLBACK_BASE_URL || 'http://localhost:3000'}/api/auth/github/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateUserByOAuth('github', profile);
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}
