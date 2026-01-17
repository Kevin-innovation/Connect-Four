'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase, DbUser, isSupabaseConfigured } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  nickname: string;
  email?: string;
  photoUrl?: string;
  titleId?: number | null;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, nickname: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isSignupModalOpen: boolean;
  openSignupModal: () => void;
  closeSignupModal: () => void;
  refreshDbUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // Ref to track if user is already being fetched/created (prevent race conditions)
  const fetchingUserRef = useRef(false);
  const userRef = useRef<User | null>(null);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch or create user in our database
  const fetchOrCreateDbUser = async (supabaseUser: SupabaseUser) => {
    // Prevent concurrent fetches for the same user
    if (fetchingUserRef.current) {
      console.log('Already fetching user, skipping...');
      return;
    }

    // If we already have this user loaded, skip
    if (userRef.current?.id === supabaseUser.id) {
      console.log('User already loaded, skipping...');
      return;
    }

    fetchingUserRef.current = true;

    try {
      console.log('fetchOrCreateDbUser called with:', supabaseUser.id, supabaseUser.email);

      // First try to fetch existing user by ID
      const { data: existingUserById } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (existingUserById) {
        console.log('Found user by ID:', existingUserById.email);
        setDbUser(existingUserById);
        setUser({
          id: existingUserById.id,
          nickname: existingUserById.display_name,
          email: existingUserById.email,
          photoUrl: existingUserById.photo_url || undefined,
          titleId: existingUserById.current_title_id,
        });

        // Update last login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', supabaseUser.id);

        return;
      }

      // If not found by ID, check by email (prevent duplicates)
      if (supabaseUser.email) {
        const { data: existingUserByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', supabaseUser.email)
          .single();

        if (existingUserByEmail) {
          console.log('Found existing user by email, updating ID:', existingUserByEmail.email);

          // Update the existing user's ID to match the new auth ID
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              id: supabaseUser.id,
              last_login_at: new Date().toISOString()
            })
            .eq('email', supabaseUser.email)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating user ID:', updateError);
            // Use existing user anyway
            setDbUser(existingUserByEmail);
            setUser({
              id: existingUserByEmail.id,
              nickname: existingUserByEmail.display_name,
              email: existingUserByEmail.email,
              photoUrl: existingUserByEmail.photo_url || undefined,
              titleId: existingUserByEmail.current_title_id,
            });
          } else if (updatedUser) {
            setDbUser(updatedUser);
            setUser({
              id: updatedUser.id,
              nickname: updatedUser.display_name,
              email: updatedUser.email,
              photoUrl: updatedUser.photo_url || undefined,
              titleId: updatedUser.current_title_id,
            });
          }
          return;
        }
      }

      // If user doesn't exist, create new one
      const newUser = {
        id: supabaseUser.id,
        google_id: supabaseUser.user_metadata?.sub || `email_${supabaseUser.id}`,
        email: supabaseUser.email || '',
        email_verified: supabaseUser.email_confirmed_at ? true : false,
        display_name: supabaseUser.user_metadata?.full_name ||
                      supabaseUser.user_metadata?.name ||
                      supabaseUser.email?.split('@')[0] ||
                      'Player',
        photo_url: supabaseUser.user_metadata?.avatar_url ||
                   supabaseUser.user_metadata?.picture || null,
        is_active: true,
        is_banned: false,
        last_login_at: new Date().toISOString(),
      };

      console.log('Creating new user:', newUser.email);

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        // Still set basic user info even if DB insert fails
        setUser({
          id: supabaseUser.id,
          nickname: newUser.display_name,
          email: newUser.email,
          photoUrl: newUser.photo_url || undefined,
        });
        return;
      }

      if (createdUser) {
        setDbUser(createdUser);
        setUser({
          id: createdUser.id,
          nickname: createdUser.display_name,
          email: createdUser.email,
          photoUrl: createdUser.photo_url || undefined,
          titleId: createdUser.current_title_id,
        });

        // Create initial statistics for all game modes
        const { data: gameModes } = await supabase.from('game_modes').select('id');
        if (gameModes) {
          const statsToInsert = gameModes.map((mode) => ({
            user_id: createdUser.id,
            game_mode_id: mode.id,
          }));
          await supabase.from('user_statistics').insert(statsToInsert);
        }
      }
    } catch (error) {
      console.error('Error in fetchOrCreateDbUser:', error);
    } finally {
      fetchingUserRef.current = false;
    }
  };

  // Refresh dbUser data
  const refreshDbUser = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setDbUser(data);
      setUser({
        id: data.id,
        nickname: data.display_name,
        email: data.email,
        photoUrl: data.photo_url || undefined,
        titleId: data.current_title_id,
      });
    }
  };

  // Track if initial auth check is done
  const initialAuthDoneRef = useRef(false);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Skip if already initialized (prevents re-init on navigation)
      if (initialAuthDoneRef.current && userRef.current) {
        console.log('Auth already initialized, skipping...');
        setIsLoading(false);
        return;
      }

      try {
        // First try getSession() for quick cached session check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.log('Session error:', sessionError.message);
        }

        if (session?.user) {
          console.log('Session found from cache:', session.user.email);
          if (mounted) {
            await fetchOrCreateDbUser(session.user);
          }
        } else {
          // Fallback: try getUser() for server validation
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

          if (userError) {
            console.log('No active session:', userError.message);
          }

          if (mounted && authUser) {
            console.log('Session restored via getUser:', authUser.email);
            await fetchOrCreateDbUser(authUser);
          }
        }

        initialAuthDoneRef.current = true;
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // 모달 즉시 닫기 (DB 작업 전)
          setIsLoginModalOpen(false);
          setIsSignupModalOpen(false);

          // DB 작업은 별도로 처리 (실패해도 로그인은 유지)
          try {
            await fetchOrCreateDbUser(session.user);
          } catch (err) {
            console.error('Failed to fetch/create DB user:', err);
            // 기본 사용자 정보라도 설정
            setUser({
              id: session.user.id,
              nickname: session.user.user_metadata?.full_name ||
                        session.user.email?.split('@')[0] || 'Player',
              email: session.user.email,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setDbUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // 토큰 갱신 시에도 사용자 정보 유지
          console.log('Token refreshed for user:', session.user.email);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // 초기 세션 로드 (페이지 새로고침 시)
          console.log('Initial session loaded for user:', session.user.email);
          // Use ref to check current user state (avoid stale closure)
          if (!userRef.current) {
            await fetchOrCreateDbUser(session.user);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      alert('Supabase가 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log('Google OAuth response:', { data, error });

      if (error) {
        console.error('Google sign in error:', error);
        alert(`Google 로그인 오류: ${error.message}`);
      }
    } catch (err) {
      console.error('Google sign in exception:', err);
      alert('Google 로그인 중 오류가 발생했습니다.');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase가 설정되지 않았습니다. 관리자에게 문의하세요.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error: error.message };
      }

      // 로그인 성공 - 세션과 사용자 정보 확인
      if (data.session && data.user) {
        console.log('Sign in successful, user:', data.user.email);
        // 직접 사용자 정보 설정 (onAuthStateChange가 늦게 호출될 수 있으므로)
        await fetchOrCreateDbUser(data.user);
        setIsLoginModalOpen(false);
        setIsSignupModalOpen(false);
      }

      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
    }
  };

  const signUpWithEmail = async (email: string, password: string, nickname: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase가 설정되지 않았습니다. 관리자에게 문의하세요.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nickname,
            name: nickname,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    setUser(null);
    setDbUser(null);
  };

  const openLoginModal = () => {
    setIsSignupModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const openSignupModal = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(true);
  };

  const closeSignupModal = () => {
    setIsSignupModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        isLoggedIn: !!user,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        isSignupModalOpen,
        openSignupModal,
        closeSignupModal,
        refreshDbUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
