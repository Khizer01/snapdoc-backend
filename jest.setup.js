process.env.NODE_ENV = 'test';
// Provide dummy env vars so supabase module doesn't throw at import
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
