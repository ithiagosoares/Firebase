'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, DependencyList } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage'; // CORREÇÃO: Importa o tipo do Storage
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Props para o provider, agora incluindo o Storage
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage; // CORREÇÃO: Adiciona a prop do Storage
}

// Estado de autenticação do usuário
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Estado completo do contexto Firebase
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null; // CORREÇÃO: Adiciona o Storage ao estado
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Valor de retorno para o hook principal useFirebase
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage; // CORREÇÃO: Adiciona o Storage ao retorno do hook
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Contexto React
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Provider Component
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage, // CORREÇÃO: Recebe o storage via props
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Serviço de autenticação não fornecido.") });
      return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null }),
      (error) => {
        console.error("Erro no onAuthStateChanged:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    storage, // CORREÇÃO: Passa o storage para o contexto
    ...userAuthState,
  }), [firebaseApp, firestore, auth, storage, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// Hook principal para acessar todos os serviços (anteriormente useFirebase)
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase deve ser usado dentro de um FirebaseProvider.');
  }
  const { firebaseApp, firestore, auth, storage, user, isUserLoading, userError } = context;
  if (!firebaseApp || !firestore || !auth || !storage) { // CORREÇÃO: Verifica se o storage está disponível
    throw new Error('Serviços principais do Firebase (incluindo Storage) não disponíveis.');
  }
  return { firebaseApp, firestore, auth, storage, user, isUserLoading, userError };
};

// Hooks de conveniência
export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;
export const useStorage = (): FirebaseStorage => useFirebase().storage; // CORREÇÃO: Novo hook para o Storage
export const useUser = () => {
    const { user, isUserLoading, userError } = useFirebase();
    return { user, isUserLoading, userError };
};

// Hook de memoização (sem alterações)
type MemoFirebase <T> = T & {__memo?: boolean};
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}
