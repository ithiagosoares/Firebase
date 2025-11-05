'use client';
    
import {
  Auth,
  signInWithEmailAndPassword
} from 'firebase/auth';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function signInWithEmailAndPasswordNonBlocking(auth: Auth, email: string, pass: string) {
  const promise = signInWithEmailAndPassword(auth, email, pass)
  // Execution continues immediately
  return promise;
}
