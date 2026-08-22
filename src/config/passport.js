const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcryptjs');
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
// Google OAuth Strategy
// -----------------------------------------------------------------------------
const googleClientId = process.env.GOOGLE_CLIENT_ID || '297396891792-ntk15lp8ibflkun8emhkh8tc2s85h1cr.apps.googleusercontent.com';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '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';
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : null;
          if (!email) {
            return done(new Error('No email found in Google account profile.'), null);
          }

          const firstName = profile.name ? profile.name.givenName || 'Google' : profile.displayName || 'Google';
          const lastName = profile.name ? profile.name.familyName || 'User' : 'User';

          // Check if user already exists
          let user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user) {
            // Create user account
            const baseUsername = email.split('@')[0] || `user_${Date.now()}`;
            let uniqueUsername = baseUsername;
            const existingUsername = await prisma.user.findUnique({ where: { username: uniqueUsername } });
            if (existingUsername) {
              uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }

            const dummyPassword = await bcrypt.hash(`OAuth_${profile.id}_${Date.now()}`, 10);

            user = await prisma.user.create({
              data: {
                email,
                firstName,
                lastName,
                username: uniqueUsername,
                password: dummyPassword,
                accountType: 'normal_user',
                role: 'normal_user',
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
const fbAppId = process.env.FACEBOOK_APP_ID || '2621377384978326';
const fbAppSecret = process.env.FACEBOOK_APP_SECRET || 'cc113a43994046b98f300330204e9104';
const fbCallbackUrl = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback';

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
            const dummyPassword = await bcrypt.hash(`OAuth_FB_${profile.id}_${Date.now()}`, 10);

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
