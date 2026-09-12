import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { 
  AppUser, 
  AuthContextType, 
  UserRole 
} from '../types/auth';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  isFirebaseConfigured,
  FirebaseUser
} from '../lib/firebase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PREFIX = 'hypenex_auth_role_';
const DEMO_USER_KEY = 'hypenex_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Initialize Auth state
  useEffect(() => {
    // 1. If demo user was saved, restore it
    const savedDemo = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as AppUser;
        setUser(parsed);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    // 2. If Firebase Auth is available, subscribe
    if (auth && isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const savedRole = (localStorage.getItem(`${STORAGE_PREFIX}${firebaseUser.uid}`) as UserRole) || 'campaigner';
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: savedRole,
            isDemo: false
          });
        } else {
          // If not logged into Firebase and no demo, reset
          if (!localStorage.getItem(DEMO_USER_KEY)) {
            setUser(null);
          }
        }
        setLoading(false);
      }, (err) => {
        console.error('Auth state error:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async (rolePreference: UserRole = 'campaigner') => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase Authentication is not yet configured. Please supply your Firebase credentials or use the Role Preview buttons.');
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const existingRole = localStorage.getItem(`${STORAGE_PREFIX}${fbUser.uid}`) as UserRole;
      const effectiveRole = existingRole || rolePreference;
      localStorage.setItem(`${STORAGE_PREFIX}${fbUser.uid}`, effectiveRole);
      localStorage.removeItem(DEMO_USER_KEY);
      startTransition(() => {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Google User',
          role: effectiveRole,
          isDemo: false
        });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string, rolePreference: UserRole = 'campaigner') => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase Authentication is not yet configured. Please supply your Firebase credentials or use the Role Preview buttons.');
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = result.user;
      const existingRole = localStorage.getItem(`${STORAGE_PREFIX}${fbUser.uid}`) as UserRole;
      const effectiveRole = existingRole || rolePreference;
      localStorage.setItem(`${STORAGE_PREFIX}${fbUser.uid}`, effectiveRole);
      localStorage.removeItem(DEMO_USER_KEY);
      startTransition(() => {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          role: effectiveRole,
          isDemo: false
        });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setError(msg);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, role: UserRole) => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase Authentication is not yet configured. Please supply your Firebase credentials or use the Role Preview buttons.');
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = result.user;
      localStorage.setItem(`${STORAGE_PREFIX}${fbUser.uid}`, role);
      localStorage.removeItem(DEMO_USER_KEY);
      startTransition(() => {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.email?.split('@')[0] || 'User',
          role,
          isDemo: false
        });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
      throw err;
    }
  };

  const demoLogin = (role: UserRole) => {
    setError(null);
    const demoUser: AppUser = {
      uid: `demo-${role}-${Date.now()}`,
      email: `${role.toLowerCase()}@hypenex.internal`,
      displayName: `${role.charAt(0).toUpperCase() + role.slice(1)} Member`,
      role,
      isDemo: true
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    startTransition(() => {
      setUser(demoUser);
    });
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated: AppUser = {
      ...user,
      role: newRole,
      displayName: user.isDemo ? `${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Member` : user.displayName
    };
    if (user.isDemo) {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated));
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${user.uid}`, newRole);
    }
    startTransition(() => {
      setUser(updated);
    });
  };

  const logout = async () => {
    setError(null);
    localStorage.removeItem(DEMO_USER_KEY);
    if (auth && !user?.isDemo) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('SignOut error:', err);
      }
    }
    startTransition(() => {
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isFirebaseConfigured,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        demoLogin,
        switchRole,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
