document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');

    // Check if already logged in
    checkSession();

    async function checkSession() {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session) {
            window.location.href = 'admin-dashboard.html';
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // UI Loading state
        loginText.style.display = 'none';
        loginSpinner.style.display = 'inline-block';
        loginBtn.disabled = true;
        loginError.style.display = 'none';

        try {
            // 1. Authenticate user
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // 2. Check role from profiles table
            const userId = data.user.id;
            console.log("Logged in UID:", userId);

            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (profileError) {
                if (profileError.code === 'PGRST116') {
                    console.error("No profile found for UID:", userId);
                    throw new Error(`Access Denied: Your account (${email}) exists, but it hasn't been added to the 'profiles' table. Please add a row with ID: ${userId} and role: 'admin' in your Supabase dashboard.`);
                }
                console.error("Profile fetching error details:", JSON.stringify(profileError, null, 2));
                throw new Error(`Profile verification failed: ${profileError.message} (Code: ${profileError.code}).`);
            }

            if (profileData && profileData.role === 'admin') {
                // Success - redirect to dashboard
                window.location.href = 'admin-dashboard.html';
            } else {
                // Not an admin
                await supabaseClient.auth.signOut();
                throw new Error("Access Denied: You do not have admin privileges.");
            }

        } catch (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        } finally {
            // Reset UI Loading state
            loginText.style.display = 'inline-block';
            loginSpinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    });
});
