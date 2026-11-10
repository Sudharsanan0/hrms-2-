import React, { useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { AuthContext } from './auth-context';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resolveEmployeeForLogin } from '../services/employeeService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [role, setRole]       = useState<Role | null>(null);
  const [isLoading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string, email: string) => {
    let resolvedRole: Role = email.toLowerCase().includes('emp') ? 'employee' : 'admin';
    let fullName = resolvedRole === 'admin' ? 'Admin User' : 'Employee User';
    let avatarUrl: string | undefined;
    let profileRole: string | undefined;

    if (isSupabaseConfigured) {
      try {
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('*, companies(*)')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          profileRole = (profile as any).role as string;
          resolvedRole = profileRole === 'admin' || profileRole === 'super_admin' ? 'admin' : 'employee';
          fullName = (profile as any).full_name || email.split('@')[0];
          avatarUrl = (profile as any).avatar_url || undefined;
        }
      } catch (err) {
        console.warn('Profile load failed:', err);
      }
    }

    // Resolve the employee record through the shared employee service so that
    // every module works with the SAME employee data as the Employees page.
    let employee = null;
    try {
      employee = await resolveEmployeeForLogin(isSupabaseConfigured ? userId : undefined, email);
    } catch (err) {
      console.warn('Employee lookup failed:', err);
    }

    const u: User = {
      id: userId,
      email,
      name: employee?.fullName || fullName,
      role: resolvedRole,
      employeeId: employee?.id,
      employeeCode: employee?.employeeCode,
      department: employee?.departmentName,
      designation: employee?.designationName,
      avatarUrl,
    };
    setUser(u);
    setRole(resolvedRole);
    return resolvedRole;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await loadProfile(session.user.id, session.user.email || '');
        }
      }
      if (mounted) setLoading(false);
    };

    init();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
        }
      });
      return () => { mounted = false; subscription.unsubscribe(); };
    }
    return () => { mounted = false; };
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setLoading(false); return { success: false, error: error.message }; }
        if (data.session?.user) {
          await loadProfile(data.session.user.id, data.session.user.email || email);
        }
        setLoading(false);
        return { success: true };
      }
      // Demo login
      await new Promise(r => setTimeout(r, 600));
      await loadProfile('demo', email);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
