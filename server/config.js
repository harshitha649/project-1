const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  sessionSecret: process.env.SESSION_SECRET || 'agrishare-default-secret-2026',
  isSupabaseConfigured() {
    return (
      Boolean(this.supabase.url) &&
      Boolean(this.supabase.anonKey) &&
      !this.supabase.url.includes('placeholder') &&
      !this.supabase.url.includes('xyzcompany')
    );
  }
};
