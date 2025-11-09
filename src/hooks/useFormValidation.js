/**
 * useFormValidation Hook
 *
 * Custom hook for managing form state with real-time validation
 * Handles values, errors, touched state, and submission
 *
 * Features:
 * - Real-time validation with debounce
 * - Touched field tracking
 * - Error messages
 * - Submission handling
 * - Field-level control
 */

import { useState, useCallback, useRef } from 'react';

export function useFormValidation(initialValues = {}, validators = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimers = useRef({});

  /**
   * Set a field value and trigger validation
   * @param {string} name - Field name
   * @param {any} value - Field value
   * @param {boolean} validateNow - Force immediate validation
   */
  const setField = useCallback((name, value, validateNow = false) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (validateNow && validators[name]) {
      validateField(name, value);
    }
  }, [validators]);

  /**
   * Set field as touched
   * @param {string} name - Field name
   */
  const setFieldTouched = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  /**
   * Validate a single field with debounce
   * @param {string} name - Field name
   * @param {any} value - Field value
   */
  const validateField = useCallback(async (name, value) => {
    if (!validators[name]) return;

    // Clear existing timer
    if (debounceTimers.current[name]) {
      clearTimeout(debounceTimers.current[name]);
    }

    // Debounce validation (300ms)
    debounceTimers.current[name] = setTimeout(async () => {
      setIsValidating(true);
      try {
        const validator = validators[name];
        const result = await Promise.resolve(validator(value));

        setErrors(prev => {
          const newErrors = { ...prev };
          if (result.isValid) {
            delete newErrors[name];
          } else {
            newErrors[name] = result.message || 'Invalid';
          }
          return newErrors;
        });
      } catch (error) {
        console.error(`Validation error for ${name}:`, error);
        setErrors(prev => ({
          ...prev,
          [name]: 'Validation error'
        }));
      } finally {
        setIsValidating(false);
      }
    }, 300);
  }, [validators]);

  /**
   * Handle field change - update value and validate
   * @param {Event} e - Change event
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setField(name, fieldValue);
    validateField(name, fieldValue);
  }, [setField, validateField]);

  /**
   * Handle field blur - mark as touched
   * @param {Event} e - Blur event
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setFieldTouched(name);
  }, [setFieldTouched]);

  /**
   * Validate all fields at once
   * @returns {Promise<boolean>} True if all valid
   */
  const validate = useCallback(async () => {
    setIsValidating(true);
    const newErrors = {};

    // Validate all fields
    const validationPromises = Object.entries(validators).map(
      async ([fieldName, validator]) => {
        try {
          const result = await Promise.resolve(validator(values[fieldName]));
          if (!result.isValid) {
            newErrors[fieldName] = result.message || 'Invalid';
          }
        } catch (error) {
          newErrors[fieldName] = 'Validation error';
        }
      }
    );

    await Promise.all(validationPromises);
    setErrors(newErrors);
    setIsValidating(false);

    return Object.keys(newErrors).length === 0;
  }, [values, validators]);

  /**
   * Reset form to initial state
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Get all form data
   * @returns {object} Form values
   */
  const getValues = useCallback(() => values, [values]);

  /**
   * Check if form is valid
   * @returns {boolean} True if no errors
   */
  const isValid = Object.keys(errors).length === 0;

  /**
   * Check if form is submittable (touched and valid)
   * @returns {boolean} True if can submit
   */
  const isSubmittable = isValid && Object.keys(touched).length > 0;

  /**
   * Get field props for use with inputs
   * @param {string} name - Field name
   * @returns {object} Props for input element
   */
  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': touched[name] && errors[name] ? 'true' : 'false',
    'aria-describedby': errors[name] ? `${name}-error` : undefined
  }), [values, errors, touched, handleChange, handleBlur]);

  return {
    // State
    values,
    errors,
    touched,
    isValidating,
    isValid,
    isSubmittable,

    // Setters
    setField,
    setFieldTouched,
    setErrors: (newErrors) => setErrors(newErrors),
    setTouched: (newTouched) => setTouched(newTouched),

    // Handlers
    handleChange,
    handleBlur,
    getFieldProps,

    // Validation
    validateField,
    validate,

    // Utilities
    reset,
    getValues
  };
}
