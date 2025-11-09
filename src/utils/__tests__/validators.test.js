/**
 * Validators Tests
 * Tests for email, password, username, and other validators
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateElectionTitle,
  validateDescription,
  validateVoterName,
  validateRequired,
  createValidator,
  composeValidators
} from '../validators';

describe('Validators', () => {
  // ===== Email Validator Tests =====
  describe('validateEmail', () => {
    it('should reject empty email', async () => {
      const result = await validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('requis');
    });

    it('should reject null email', async () => {
      const result = await validateEmail(null);
      expect(result.isValid).toBe(false);
    });

    it('should reject email without @', async () => {
      const result = await validateEmail('invalidemail.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Format');
    });

    it('should reject email without domain', async () => {
      const result = await validateEmail('user@');
      expect(result.isValid).toBe(false);
    });

    it('should reject email without local part', async () => {
      const result = await validateEmail('@example.com');
      expect(result.isValid).toBe(false);
    });

    it('should accept valid email', async () => {
      const result = await validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('success');
    });

    it('should accept email with subdomain', async () => {
      const result = await validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with numbers and special chars', async () => {
      const result = await validateEmail('user+tag123@example.co.uk');
      expect(result.isValid).toBe(true);
    });

    it('should reject email longer than 254 chars', async () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = await validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('trop long');
    });

    it('should trim whitespace', async () => {
      const result = await validateEmail('  user@example.com  ');
      expect(result.isValid).toBe(true);
    });

    it('should reject email with spaces', async () => {
      const result = await validateEmail('user name@example.com');
      expect(result.isValid).toBe(false);
    });

    it('should have error level', async () => {
      const result = await validateEmail('invalid');
      expect(result.level).toBe('error');
    });
  });

  // ===== Password Validator Tests =====
  describe('validatePassword', () => {
    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('requis');
    });

    it('should reject password shorter than 12 chars', () => {
      // This password: 10 chars (fails length) + missing special = 3 checks only
      const result = validatePassword('Sh0rtAbc');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('12+');
    });

    it('should reject password without uppercase', () => {
      // Missing uppercase AND one other requirement (short)
      const result = validatePassword('validpass1');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('majuscule');
    });

    it('should reject password without lowercase', () => {
      // Missing lowercase AND one other requirement (short)
      const result = validatePassword('VALIDPASS1');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('minuscule');
    });

    it('should reject password without number', () => {
      // Missing number AND one other requirement (short)
      const result = validatePassword('ValidPass');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('chiffre');
    });

    it('should reject password without special char', () => {
      // Has uppercase, lowercase, number but missing special char AND also missing one other
      const result = validatePassword('ValidPass');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('spécial');
    });

    it('should accept strong password', () => {
      const result = validatePassword('ValidPass123!');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('Très fort');
    });

    it('should accept password with various special chars', () => {
      const result = validatePassword('ValidPass123@');
      expect(result.isValid).toBe(true);
    });

    it('should accept password with hyphens', () => {
      const result = validatePassword('Valid-Pass123!');
      expect(result.isValid).toBe(true);
    });

    it('should track password strength levels', () => {
      const weak = validatePassword('weak');
      expect(weak.strength).toBeDefined();

      const medium = validatePassword('Medium123');
      expect(medium.strength).toBeDefined();

      const strong = validatePassword('Strong123!abc');
      expect(strong.isValid).toBe(true);
    });

    it('should provide check details', () => {
      const result = validatePassword('ValidPass123!');
      expect(result.checks).toBeDefined();
      expect(result.checks.length).toBe(true);
      expect(result.checks.uppercase).toBe(true);
      expect(result.checks.lowercase).toBe(true);
      expect(result.checks.number).toBe(true);
      expect(result.checks.special).toBe(true);
    });
  });

  // ===== Username Validator Tests =====
  describe('validateUsername', () => {
    it('should reject empty username', async () => {
      const result = await validateUsername('');
      expect(result.isValid).toBe(false);
    });

    it('should reject username shorter than 3 chars', async () => {
      const result = await validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Min 3');
    });

    it('should reject username longer than 30 chars', async () => {
      const result = await validateUsername('a'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Max 30');
    });

    it('should reject username with special chars', async () => {
      const result = await validateUsername('user@name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Caractères');
    });

    it('should reject username starting with underscore', async () => {
      const result = await validateUsername('_username');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('commencer');
    });

    it('should reject username starting with number', async () => {
      const result = await validateUsername('123user');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('commencer');
    });

    it('should accept valid username', async () => {
      const result = await validateUsername('validuser');
      expect(result.isValid).toBe(true);
    });

    it('should accept username with underscore', async () => {
      const result = await validateUsername('valid_user');
      expect(result.isValid).toBe(true);
    });

    it('should accept username with numbers in middle', async () => {
      const result = await validateUsername('user123name');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', async () => {
      const result = await validateUsername('  validuser  ');
      expect(result.isValid).toBe(true);
    });

    it('should accept 3-char username', async () => {
      const result = await validateUsername('abc');
      expect(result.isValid).toBe(true);
    });
  });

  // ===== Election Title Validator Tests =====
  describe('validateElectionTitle', () => {
    it('should reject empty title', () => {
      const result = validateElectionTitle('');
      expect(result.isValid).toBe(false);
    });

    it('should reject title shorter than 3 chars', () => {
      const result = validateElectionTitle('ab');
      expect(result.isValid).toBe(false);
    });

    it('should reject title longer than 200 chars', () => {
      const result = validateElectionTitle('a'.repeat(201));
      expect(result.isValid).toBe(false);
    });

    it('should accept valid title', () => {
      const result = validateElectionTitle('Board Elections 2024');
      expect(result.isValid).toBe(true);
    });

    it('should accept title with special chars', () => {
      const result = validateElectionTitle('Q3 2024 - Budget Vote & Approval');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateElectionTitle('  Valid Title  ');
      expect(result.isValid).toBe(true);
    });
  });

  // ===== Description Validator Tests =====
  describe('validateDescription', () => {
    it('should reject empty description', () => {
      const result = validateDescription('');
      expect(result.isValid).toBe(false);
    });

    it('should reject description shorter than minimum', () => {
      const result = validateDescription('short');
      expect(result.isValid).toBe(false);
    });

    it('should reject description longer than maximum', () => {
      const result = validateDescription('a'.repeat(5001));
      expect(result.isValid).toBe(false);
    });

    it('should accept valid description', () => {
      const result = validateDescription('This is a valid description of the election');
      expect(result.isValid).toBe(true);
    });

    it('should support custom min/max length', () => {
      const result = validateDescription('short', 3, 10);
      expect(result.isValid).toBe(true);
    });

    it('should reject if shorter than custom min', () => {
      const result = validateDescription('a', 5, 100);
      expect(result.isValid).toBe(false);
    });

    it('should accept multiline description', () => {
      const result = validateDescription(`
        Line 1
        Line 2
        Line 3
      `);
      expect(result.isValid).toBe(true);
    });
  });

  // ===== Voter Name Validator Tests =====
  describe('validateVoterName', () => {
    it('should reject empty name', () => {
      const result = validateVoterName('');
      expect(result.isValid).toBe(false);
    });

    it('should reject name shorter than 2 chars', () => {
      const result = validateVoterName('A');
      expect(result.isValid).toBe(false);
    });

    it('should reject name longer than 100 chars', () => {
      const result = validateVoterName('a'.repeat(101));
      expect(result.isValid).toBe(false);
    });

    it('should accept valid name', () => {
      const result = validateVoterName('John Doe');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with accents', () => {
      const result = validateVoterName('François Müller');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with hyphens', () => {
      const result = validateVoterName('Jean-Pierre');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateVoterName('  John Doe  ');
      expect(result.isValid).toBe(true);
    });
  });

  // ===== Required Field Validator Tests =====
  describe('validateRequired', () => {
    it('should reject empty value', () => {
      const result = validateRequired('', 'Email');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Email');
    });

    it('should reject whitespace-only value', () => {
      const result = validateRequired('   ', 'Password');
      expect(result.isValid).toBe(false);
    });

    it('should accept non-empty value', () => {
      const result = validateRequired('value', 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should use default field name', () => {
      const result = validateRequired('', undefined);
      expect(result.message).toContain('Champ');
    });

    it('should accept any truthy value', () => {
      const result = validateRequired('any value', 'Field');
      expect(result.isValid).toBe(true);
    });
  });

  // ===== Validator Factory Tests =====
  describe('createValidator', () => {
    it('should create validator from function', async () => {
      const customValidator = (value) => ({
        isValid: value === 'test',
        message: 'Must be "test"'
      });

      const validator = createValidator(customValidator);
      const result = await validator('test');

      expect(result.isValid).toBe(true);
    });

    it('should handle async validators', async () => {
      const asyncValidator = async (value) => ({
        isValid: value.length > 5,
        message: 'Too short'
      });

      const validator = createValidator(asyncValidator);
      const result = await validator('toolong');

      expect(result.isValid).toBe(true);
    });

    it('should catch validation errors', async () => {
      const errorValidator = () => {
        throw new Error('Validation failed');
      };

      const validator = createValidator(errorValidator);
      const result = await validator('value');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Erreur');
    });

    it('should work with promises', async () => {
      const promiseValidator = (value) =>
        Promise.resolve({
          isValid: !!value,
          message: 'Required'
        });

      const validator = createValidator(promiseValidator);
      const result = await validator('test');

      expect(result.isValid).toBe(true);
    });
  });

  // ===== Validator Composition Tests =====
  describe('composeValidators', () => {
    it('should compose multiple validators', async () => {
      const validator1 = (value) => ({
        isValid: value.length >= 5,
        message: 'Min 5 chars'
      });

      const validator2 = (value) => ({
        isValid: value.includes('@'),
        message: 'Must contain @'
      });

      const composed = composeValidators(validator1, validator2);
      const result = await composed('test@example');

      expect(result.isValid).toBe(true);
    });

    it('should fail fast on first error', async () => {
      const validator1 = (value) => ({
        isValid: value.length >= 10,
        message: 'Min 10 chars'
      });

      const validator2 = (value) => ({
        isValid: value.includes('@'),
        message: 'Must contain @'
      });

      const composed = composeValidators(validator1, validator2);
      const result = await composed('short');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Min 10');
    });

    it('should return success when all pass', async () => {
      const validator1 = (value) => ({
        isValid: !!value,
        message: 'Required'
      });

      const validator2 = (value) => ({
        isValid: value.length > 0,
        message: 'Not empty'
      });

      const composed = composeValidators(validator1, validator2);
      const result = await composed('test');

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Valide');
    });

    it('should support async validators in composition', async () => {
      const sync = (value) => ({
        isValid: value.length >= 5,
        message: 'Min 5'
      });

      const async1 = async (value) => ({
        isValid: value !== 'forbidden',
        message: 'Forbidden value'
      });

      const composed = composeValidators(sync, async1);
      const result = await composed('valid');

      expect(result.isValid).toBe(true);
    });
  });

  // ===== Integration Tests =====
  describe('Integration', () => {
    it('should work together in form validation', async () => {
      const validators = {
        email: validateEmail,
        password: validatePassword,
        username: validateUsername
      };

      const emailResult = await validators.email('user@example.com');
      const passwordResult = validators.password('ValidPass123!');
      const usernameResult = await validators.username('validuser');

      expect(emailResult.isValid).toBe(true);
      expect(passwordResult.isValid).toBe(true);
      expect(usernameResult.isValid).toBe(true);
    });

    it('should validate registration form', async () => {
      const email = await validateEmail('user@example.com');
      const password = validatePassword('SecurePass123!');
      const username = await validateUsername('newuser');

      expect(email.isValid && password.isValid && username.isValid).toBe(true);
    });

    it('should validate election creation form', async () => {
      const title = validateElectionTitle('Annual Meeting 2024');
      const description = validateDescription('This is the annual meeting to elect board members');

      expect(title.isValid && description.isValid).toBe(true);
    });

    it('should validate voter addition', () => {
      const name = validateVoterName('John Smith');
      const email = validateRequired('john@example.com', 'Email');

      expect(name.isValid && email.isValid).toBe(true);
    });
  });
});
