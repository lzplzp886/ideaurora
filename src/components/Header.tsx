'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';  // for redirecting
import userPool from '@/lib/cognitoClient';     // so we can sign out
import getCurrentUser from '@/lib/getCurrentUser';
import { useUser } from '@/context/UserContext';

/**
 * The header is a client component,
 * so we can use React hooks to fetch user data and call useUser().
 */
export default function Header() {
  const router = useRouter();

  // Pull username and its setter from our global user context
  const { username, setUsername } = useUser();

  // On mount, attempt to fetch current user session
  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user?.cognitoUser) {
          // Must call getUsername() to get the actual username
          setUsername(user.cognitoUser.getUsername());
        }
      })
      .catch(() => {
        setUsername(null);
      });
  }, [setUsername]);

  // Sign out logic
  const handleSignOut = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    // Clear our global username
    setUsername(null);
    // Redirect back to home page
    router.push('/');
  };

  return (
    <header style={{ 
        backgroundColor: '#4790fc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
        }}>
      <h1 style={{ margin: 0 }}>
        <img
          src="/images/logo.png"
          alt="sheen.bot Logo"
          style={{ height: '80px' }}
        />
      </h1>
      <nav>
        <ul className='menu'>
          <li>
            <Link href="/">Home</Link>
          </li>

          {/* If user is not logged in, show "Login" link. */}
          {!username && (
            <li>
              <Link href="/login">Login</Link>
            </li>
          )}

          {/* If user is logged in, display the username and a Sign Out button */}
          {username && (
            <>
              <li style={{ fontWeight: 'bold' }}>
                Welcome, {username}!
              </li>
              <li>
                <button onClick={handleSignOut}>Sign Out</button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
