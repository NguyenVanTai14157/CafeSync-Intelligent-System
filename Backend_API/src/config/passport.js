const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? process.env.GOOGLE_CALLBACK_URL 
      : 'http://localhost:5000/api/auth/google/callback',
    proxy: true
  },
    async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@google.com`;
      const name = profile.displayName || profile.name.givenName || 'Google User';

      // Tìm kiếm user theo email trong MongoDB
      let user = await User.findOne({ email });
      if (!user) {
        // Tự động tạo mật khẩu ngẫu nhiên để vượt qua validation của schema Mongoose
        const randomPassword = Math.random().toString(36).slice(-8) + "Aa1!";
        user = new User({
          name,
          email,
          password: randomPassword,
          role: 'customer'
        });
        await user.save();
        console.log(`👤 Đăng ký người dùng mới từ Google: ${email}`);
      } else {
        console.log(`🔑 Đăng nhập người dùng cũ từ Google: ${email}`);
      }
      return done(null, user);
    } catch (err) {
      console.error("Lỗi trong GoogleStrategy callback:", err);
      return done(err, null);
    }
  }
));
} else {
  console.warn("⚠️ Cảnh báo: Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET. Đăng nhập Google sẽ không hoạt động.");
}

// ---------------------------------------------------------
// FACEBOOK STRATEGY
// ---------------------------------------------------------
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? process.env.FACEBOOK_CALLBACK_URL 
      : 'http://localhost:5000/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'name'],
    proxy: true
  },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`;
        const name = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}` || 'Facebook User';

        let user = await User.findOne({ email });
        if (!user) {
          const randomPassword = Math.random().toString(36).slice(-8) + "Aa1!";
          user = new User({
            name,
            email,
            password: randomPassword,
            role: 'customer'
          });
          await user.save();
          console.log(`👤 Đăng ký người dùng mới từ Facebook: ${email}`);
        } else {
          console.log(`🔑 Đăng nhập người dùng cũ từ Facebook: ${email}`);
        }
        return done(null, user);
      } catch (err) {
        console.error("Lỗi trong FacebookStrategy callback:", err);
        return done(err, null);
      }
    }
  ));
} else {
  console.warn("⚠️ Cảnh báo: Thiếu FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET. Đăng nhập Facebook sẽ không hoạt động.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
