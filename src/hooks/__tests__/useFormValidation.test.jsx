/**
 * useFormValidation Hook Tests
 * Tests for form state management, validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation Hook', () => {
  const initialValues = {
    email: '',
    password: '',
    username: ''
  };

  const validators = {
    email: (value) => ({
      isValid: value.includes('@'),
      message: value.includes('@') ? '' : 'Invalid email'
    }),
    password: (value) => ({
      isValid: value.length >= 8,
      message: value.length >= 8 ? '' : 'Min 8 chars'
    }),
    username: (value) => ({
      isValid: value.length >= 3,
      message: value.length >= 3 ? '' : 'Min 3 chars'
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Initialization Tests =====
  describe('Initialization', () => {
    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      expect(result.current.values).toEqual(initialValues);
    });

    it('should initialize with empty errors', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      expect(result.current.errors).toEqual({});
    });

    it('should initialize with empty touched fields', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      expect(result.current.touched).toEqual({});
    });

    it('should initialize with isValid false', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      expect(result.current.isValid).toBe(false);
    });

    it('should initialize with isSubmittable false', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      expect(result.current.isSubmittable).toBe(false);
    });
  });

  // ===== Value Management Tests =====
  describe('Value Management', () => {
    it('should update single field value', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
      });

      expect(result.current.values.email).toBe('test@example.com');
    });

    it('should maintain other field values when updating one', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
      });

      expect(result.current.values.password).toBe('');
      expect(result.current.values.username).toBe('');
    });

    it('should update multiple fields sequentially', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
        result.current.setField('password', 'password123');
        result.current.setField('username', 'testuser');
      });

      expect(result.current.values.email).toBe('test@example.com');
      expect(result.current.values.password).toBe('password123');
      expect(result.current.values.username).toBe('testuser');
    });

    it('should handle getValues method', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
      });

      const values = result.current.getValues();
      expect(values.email).toBe('test@example.com');
    });
  });

  // ===== Touched Field Tracking =====
  describe('Touched Field Tracking', () => {
    it('should mark field as touched', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setFieldTouched('email');
      });

      expect(result.current.touched.email).toBe(true);
    });

    it('should not affect other touched fields', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setFieldTouched('email');
      });

      expect(result.current.touched.email).toBe(true);
      expect(result.current.touched.password).toBeUndefined();
    });

    it('should track multiple touched fields', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setFieldTouched('email');
        result.current.setFieldTouched('password');
      });

      expect(result.current.touched.email).toBe(true);
      expect(result.current.touched.password).toBe(true);
    });
  });

  // ===== Validation Tests =====
  describe('Field Validation', () => {
    it('should validate single field', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'invalid');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(result.current.errors.email).toBe('Invalid email');
    });

    it('should clear error on valid field', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'valid@example.com');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(result.current.errors.email).toBe('');
    });

    it('should validate all fields', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'invalid');
        result.current.setField('password', '123');
        result.current.setField('username', 'ab');
      });

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors.email).toBeTruthy();
      expect(result.current.errors.password).toBeTruthy();
      expect(result.current.errors.username).toBeTruthy();
    });

    it('should return false from validate when errors exist', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'invalid');
      });

      let isValid = false;
      await act(async () => {
        isValid = await result.current.validate();
      });

      expect(isValid).toBe(false);
    });

    it('should return true from validate when no errors', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'valid@example.com');
        result.current.setField('password', 'password123');
        result.current.setField('username', 'validuser');
      });

      let isValid = false;
      await act(async () => {
        isValid = await result.current.validate();
      });

      expect(isValid).toBe(true);
    });

    it('should handle async validators', async () => {
      const asyncValidator = vi.fn().mockResolvedValue({
        isValid: true,
        message: ''
      });

      const asyncValidators = {
        email: asyncValidator
      };

      const { result } = renderHook(() =>
        useFormValidation(initialValues, asyncValidators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(asyncValidator).toHaveBeenCalled();
    });
  });

  // ===== Error Management Tests =====
  describe('Error Management', () => {
    it('should set field error programmatically', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setFieldError('email', 'Custom error message');
      });

      expect(result.current.errors.email).toBe('Custom error message');
    });

    it('should clear field error', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setFieldError('email', 'Error');
        result.current.setFieldError('email', '');
      });

      expect(result.current.errors.email).toBe('');
    });

    it('should handle multiple field errors', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setFieldError('email', 'Email error');
        result.current.setFieldError('password', 'Password error');
      });

      expect(result.current.errors.email).toBe('Email error');
      expect(result.current.errors.password).toBe('Password error');
    });
  });

  // ===== Form Validity Tests =====
  describe('Form Validity', () => {
    it('should be invalid when no fields are touched', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      expect(result.current.isSubmittable).toBe(false);
    });

    it('should be invalid when any field has errors', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'invalid');
        result.current.setFieldTouched('email');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(result.current.isSubmittable).toBe(false);
    });

    it('should be valid when all fields are touched and no errors', async () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'valid@example.com');
        result.current.setField('password', 'password123');
        result.current.setField('username', 'validuser');
        result.current.setFieldTouched('email');
        result.current.setFieldTouched('password');
        result.current.setFieldTouched('username');
      });

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.isSubmittable).toBe(true);
    });

    it('should be valid when required fields touched and no errors', async () => {
      const requiredValidators = {
        email: (v) => ({
          isValid: !!v && v.includes('@'),
          message: !v ? 'Required' : 'Invalid'
        })
      };

      const { result } = renderHook(() =>
        useFormValidation({ email: '' }, requiredValidators)
      );

      act(() => {
        result.current.setField('email', 'valid@example.com');
        result.current.setFieldTouched('email');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(result.current.isSubmittable).toBe(true);
    });
  });

  // ===== Reset Functionality =====
  describe('Reset', () => {
    it('should reset form to initial values', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
        result.current.setFieldTouched('email');
        result.current.setFieldError('email', 'Error');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.touched).toEqual({});
      expect(result.current.errors).toEqual({});
    });

    it('should reset to custom values', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      const customValues = {
        email: 'custom@example.com',
        password: 'custompass',
        username: 'customuser'
      };

      act(() => {
        result.current.setField('email', 'test@example.com');
        result.current.reset(customValues);
      });

      expect(result.current.values).toEqual(customValues);
    });
  });

  // ===== getFieldProps Tests =====
  describe('getFieldProps Helper', () => {
    it('should return props for form field', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      const props = result.current.getFieldProps('email');

      expect(props).toHaveProperty('name', 'email');
      expect(props).toHaveProperty('value');
      expect(props).toHaveProperty('onChange');
      expect(props).toHaveProperty('onBlur');
    });

    it('should include current field value in props', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
      });

      const props = result.current.getFieldProps('email');
      expect(props.value).toBe('test@example.com');
    });

    it('should update form on field change via props', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      const props = result.current.getFieldProps('email');

      act(() => {
        props.onChange({ target: { name: 'email', value: 'new@example.com' } });
      });

      expect(result.current.values.email).toBe('new@example.com');
    });

    it('should mark field touched on blur via props', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      const props = result.current.getFieldProps('email');

      act(() => {
        props.onBlur();
      });

      expect(result.current.touched.email).toBe(true);
    });
  });

  // ===== Advanced Tests =====
  describe('Advanced Features', () => {
    it('should handle conditional validators', async () => {
      const conditionalValidators = {
        email: (value) => ({
          isValid: value ? value.includes('@') : true,
          message: value && !value.includes('@') ? 'Invalid' : ''
        })
      };

      const { result } = renderHook(() =>
        useFormValidation(initialValues, conditionalValidators)
      );

      // Empty is valid
      await act(async () => {
        const isValid = await result.current.validate();
        expect(isValid).toBe(true);
      });

      // Invalid format is invalid
      act(() => {
        result.current.setField('email', 'invalid');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(result.current.errors.email).toBeTruthy();
    });

    it('should handle dependent field validation', async () => {
      const dependentValidators = {
        password: (value) => ({
          isValid: value.length >= 8,
          message: 'Min 8 chars'
        }),
        confirmPassword: (value) => ({
          isValid: value === initialValues.password,
          message: 'Passwords must match'
        })
      };

      const { result } = renderHook(() =>
        useFormValidation(
          { password: '', confirmPassword: '' },
          dependentValidators
        )
      );

      act(() => {
        result.current.setField('password', 'password123');
        result.current.setField('confirmPassword', 'password123');
      });

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.isSubmittable).toBe(true);
    });

    it('should support validator composition', async () => {
      const emailValidator = (value) => ({
        isValid: value.includes('@'),
        message: 'Invalid email'
      });

      const minLengthValidator = (value) => ({
        isValid: value.length >= 5,
        message: 'Min 5 chars'
      });

      const composedValidator = async (value) => {
        const result1 = await Promise.resolve(emailValidator(value));
        if (!result1.isValid) return result1;

        return await Promise.resolve(minLengthValidator(value));
      };

      const composedValidators = {
        email: composedValidator
      };

      const { result } = renderHook(() =>
        useFormValidation(initialValues, composedValidators)
      );

      act(() => {
        result.current.setField('email', 'a@b');
      });

      await act(async () => {
        await result.current.validateField('email');
      });

      expect(result.current.errors.email).toBeTruthy();
    });
  });

  // ===== Edge Cases =====
  describe('Edge Cases', () => {
    it('should handle form with no validators', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, {})
      );

      act(() => {
        result.current.setField('email', 'test@example.com');
      });

      expect(result.current.values.email).toBe('test@example.com');
    });

    it('should handle empty initial values', () => {
      const { result } = renderHook(() =>
        useFormValidation({}, {})
      );

      expect(result.current.values).toEqual({});
    });

    it('should handle rapid field updates', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.setField('email', `test${i}@example.com`);
        }
      });

      expect(result.current.values.email).toBe('test9@example.com');
    });

    it('should handle updating non-existent fields', () => {
      const { result } = renderHook(() =>
        useFormValidation(initialValues, validators)
      );

      act(() => {
        result.current.setField('newField', 'value');
      });

      expect(result.current.values.newField).toBe('value');
    });
  });
});
