const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('./database');

// Serialize & Deserialize User for Session Persistence
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// -----------------------------------------------------------------------------
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

// Auto-detect dynamic callback (relative path allows dynamic resolution per request)
const googleCallbackUrl = '/auth/google/callback';

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : null;
          const firstName = profile.name ? profile.name.givenName || 'Google' : 'Google';
          const lastName = profile.name ? profile.name.familyName || 'User' : 'User';

          if (!email) {
            return done(new Error('Google account has no verified email associated.'), null);
          }

          let user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user) {
            const highEntropySecret = crypto.randomBytes(32).toString('hex');
            const dummyPassword = await bcrypt.hash(highEntropySecret, 10);
            user = await prisma.user.create({
              data: {
                email,
                firstName,
                lastName,
                username: `google_${profile.id.slice(0, 8)}`,
                password: dummyPassword,
                accountType: 'normal_user',
                role: 'normal_user',
                status: 'active',
                isEmailVerified: true
              }
            });
          }

          return done(null, user);
        } catch (err) {
          console.error('Google OAuth Strategy Error:', err);
          return done(err, null);
        }
      }
    )
  );
}

// -----------------------------------------------------------------------------
// Facebook OAuth Strategy
// -----------------------------------------------------------------------------
const fbAppId = process.env.FACEBOOK_APP_ID || '';
const fbAppSecret = process.env.FACEBOOK_APP_SECRET || '';
const fbCallbackUrl = process.env.FACEBOOK_CALLBACK_URL || `${baseUrl}/auth/facebook/callback`;

if (fbAppId && fbAppSecret) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: fbAppId,
        clientSecret: fbAppSecret,
        callbackURL: fbCallbackUrl,
        profileFields: ['id', 'emails', 'name', 'displayName']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : `${profile.id}@facebook.user`;
          const firstName = profile.name ? profile.name.givenName || 'Facebook' : profile.displayName || 'Facebook';
          const lastName = profile.name ? profile.name.familyName || 'User' : 'User';

          let user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user) {
            const baseUsername = `fb_${profile.id}`;
            const highEntropySecret = crypto.randomBytes(32).toString('hex');
            const dummyPassword = await bcrypt.hash(highEntropySecret, 10);

            user = await prisma.user.create({
              data: {
                email,
                firstName,
                lastName,
                username: baseUsername,
                password: dummyPassword,
                accountType: 'normal_user',
                role: 'normal_user',
                isEmailVerified: true
              }
            });
          }

          return done(null, user);
        } catch (err) {
          console.error('Facebook OAuth Strategy Error:', err);
          return done(err, null);
        }
      }
    )
  );
}

module.exports = passport;
