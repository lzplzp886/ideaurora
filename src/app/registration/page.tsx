'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// Cognito
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import userPool from '@/lib/cognitoClient'; 
// Context
import { useUser } from '@/context/UserContext';
import CountryCodeSelect from '@/app/registration/reg_CountryCodeSelect'
import GeekWordsUsername from '@/app/registration/reg_UsernameGenerator';

export default function RegistrationPage() {
  const router = useRouter();
  // Access global user context
  const { setUsername } = useUser(); // We'll set the username after auto-login

  // Basic form fields
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setLocalUsername] = useState('');
  const [email, setEmail] = useState('');
  // We keep `password` so we can auto-login after user confirms registration
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+27');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [classID, setClassID] = useState('');

  // Track error messages to display on screen
  const [errorMsg, setErrorMsg] = useState('');

  // Indicates we successfully created a Cognito user 
  // and must confirm the code sent to the user.
  const [verificationNeeded, setVerificationNeeded] = useState(false);

  // Store the verification code input
  const [confirmationCode, setConfirmationCode] = useState('');

  // Normalize phone number by removing the first '0' if present and prepend country code
  const normalizePhoneNumber = (number: string, code: string): string => {
    // Remove the first '0' if it exists and combine with the country code
    const normalizedNumber = number.startsWith('0') ? number.substring(1) : number;
    return `${code}${normalizedNumber}`;
  };

  /**
   * 1) Build attribute list 
   * 2) userPool.signUp(...)
   * 3) If success => set verificationNeeded = true
   */

      
  // Handle the username generation
  const handleUsernameGenerated = (generatedUsername: string) => {
    setLocalUsername(generatedUsername);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Basic checks
    if (!username || !email || !password) {
      setErrorMsg('Please fill in username, email, and password.');
      return;
    }

    // Form normalized number
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber, countryCode);

    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'custom:role', Value: role }),
      new CognitoUserAttribute({ Name: 'phone_number', Value: normalizedPhoneNumber }),
      new CognitoUserAttribute({ Name: 'given_name', Value: firstName }),
      new CognitoUserAttribute({ Name: 'family_name', Value: lastName }),
      new CognitoUserAttribute({ Name: 'custom:classID', Value: classID }),
    ];

    userPool.signUp(username, password, attributeList, [], (err, result) => {
      if (err) {
        console.error('Sign up error:', err);
        setErrorMsg(err.message || 'Registration failed.');
        return;
      }

      // success => Cognito user is created, but unconfirmed 
      console.log('SignUp success. CognitoUser:', result?.user);
      setVerificationNeeded(true);
    });
  };

  /**
   * 1) confirmRegistration(...) => verifies the user
   * 2) Then auto-login with authenticateUser(...) => obtains session
   * 3) setUsername(...) in context => updates header
   * 4) router.push(...) to the role page
   */
  const handleConfirmCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username) {
      setErrorMsg('Username is missing. Please go back and sign up again.');
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
      if (err) {
        console.error('Verification error:', err);
        setErrorMsg(err.message || 'Verification failed.');
        return;
      }

      console.log('Verification success:', result); // Typically "SUCCESS"

      // --- AUTO-LOGIN after confirming registration ---
      const authDetails = new AuthenticationDetails({
        Username: username,
        Password: password, // we stored the password in state
      });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          console.log('Auto-login success. Session:', session);

          // Set the global username in context so header updates
          setUsername(cognitoUser.getUsername());

          // Go to the correct role-based page
          router.push(`/${role}`);
        },
        onFailure: (authErr) => {
          console.error('Auto-login failed:', authErr);
          setErrorMsg(authErr.message || 'Auto-login failed. Please log in manually.');
        },
      });
    });
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Account Registration</h1>

      {!verificationNeeded && (
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: 'auto', textAlign: 'left' }}>
          {/* ROLE */}
          <div style={{ marginBottom: '10px' }}>
            <label>Role:</label><br />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}
              style={{ width: '100%' }}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {/* FIRST NAME */}
          <div style={{ marginBottom: '10px' }}>
            <label>First Name:</label><br />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* LAST NAME */}
          <div style={{ marginBottom: '10px' }}>
            <label>Last Name:</label><br />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Username */}
          <div style={{ marginBottom: '10px' }}>
            <label><span style={{ color: 'red' }}>*</span>Username (min 6 chars, [0-9,a-z,-,_]):</label><br />
            <input
              type="text"
              value={username}
              onChange={(e) => setLocalUsername(e.target.value)}
              style={{ width: '100%' }}
              required
            />
            <GeekWordsUsername
              firstName={firstName}
              lastName={lastName}
              onUsernameGenerated={handleUsernameGenerated}
            />
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom: '10px' }}>
            <label>
              <span style={{ color: 'red' }}>*</span>Email:
            </label><br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: '10px' }}>
            <label>
              <span style={{ color: 'red' }}>*</span>Password:
            </label><br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>

          {/* Country Code and Phone Number with adjusted widths */}
          <div style={{ marginBottom: '10px' }}>
            <label>Phone Number:</label><br />
            <div style={{ display: 'flex' }}>
              <CountryCodeSelect 
                value={countryCode} 
                onChange={setCountryCode} 
                style={{ width: '30%', marginRight: '5%' }}  // Adjust width here for country code
              />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{ flex: 1}}  // Flex property adjusts to take the remaining space
              placeholder="Enter your phone number"
            />
            </div>
          </div>

          {/* CLASS ID */}
          <div style={{ marginBottom: '10px' }}>
            <label>Class ID(s) (optional, comma-separated):</label><br />
            <input
              type="text"
              value={classID}
              onChange={(e) => setClassID(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* ERRORS */}
          {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

          {/* SUBMIT BUTTON */}
          <button type="submit" style={{ marginTop: '10px', width: '100%' }}>
            Register
          </button>
        </form>
      )}

      {/* If we've created the user and need to confirm the code */}
      {verificationNeeded && (
        <form onSubmit={handleConfirmCode} style={{ maxWidth: '400px', margin: 'auto', textAlign: 'left' }}>
          <p style={{ color: 'green' }}>
            We sent a verification code to <strong>{email}</strong>. Check your email and enter the code below.
          </p>

          <div style={{ marginBottom: '10px' }}>
            <label>Verification Code:</label><br />
            <input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>

          {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

          <button type="submit" style={{ marginTop: '10px', width: '100%' }}>
            Confirm Code
          </button>
        </form>
      )}
    </div>
  );
}
