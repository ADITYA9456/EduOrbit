'use client';

import { createClient } from '@/lib/supabase/client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from profiles table
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) console.error('Failed to load profile:', error.message);
      setProfile(data ?? null);
      return data ?? null;
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfile(null);
      return null;
    }
  }, [supabase]);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) await fetchProfile(session.user.id);
      } catch (err) {
        console.error('Failed to initialise session:', err);
      } finally {
        setLoading(false);
      }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          // Deferred: awaiting Supabase calls inside this callback can deadlock the auth client.
          setTimeout(() => fetchProfile(session.user.id).finally(() => setLoading(false)), 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // Sign up with email + password
  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    // Supabase returns a user with no identities (instead of an error) when the email is already registered.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Try signing in instead.');
    }
    return data;
  };

  // Send a password reset email
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    });
    if (error) throw error;
  };

  // Set a new password for the signed-in (recovery) session
  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  // Sign in with email + password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) await fetchProfile(data.user.id);
    return data;
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async (next = '/home') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) throw error;
    return data;
  };

  // Send OTP to phone number
  const sendPhoneOtp = async (phone) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) throw error;
    return data;
  };

  // Verify phone OTP
  const verifyPhoneOtp = async (phone, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;
    if (data.user) await fetchProfile(data.user.id);
    return data;
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      // ignore
    }
    setUser(null);
    setProfile(null);
    // Hard redirect to server signout route — clears cookies + redirects to /login
    window.location.href = '/api/auth/signout';
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        signUp,
        signIn,
        resetPassword,
        updatePassword,
        signInWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        signOut,
        updateProfile,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
