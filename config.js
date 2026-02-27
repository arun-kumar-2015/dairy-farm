// Supabase Configuration
// PLEASE REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = 'https://cjpfjsadnlgvvnytafrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcGZqc2FkbmxndnZueXRhZnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDYyNzgsImV4cCI6MjA4NzY4MjI3OH0.dwUZglKpg6rZmAYb-KdCyS79b0qZ-gFOhVy5t3dF_Og';

// Initialize Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
