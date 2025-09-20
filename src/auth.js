// src/auth.js

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with your environment variables
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Trigger Google OAuth sign-in.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://builder.vibescript.online'
    }
  })
  if (error) {
    console.error('Google sign-in error:', error.message)
    alert('Failed to sign in with Google. Check the console for details.')
  }
}

/**
 * Sign out current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error.message)
    alert('Failed to sign out. Check console for details.')
  }
}

/**
 * Get the currently logged-in user.
 */
export async function getUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  if (error) {
    console.error('Error fetching user:', error.message)
    return null
  }
  return user
}

export default supabase
