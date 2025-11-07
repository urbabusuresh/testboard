/**
 * Frontend validation utilities
 * Mirrors backend validation logic for consistent user experience
 */

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

/**
 * Check if a value is empty
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (isEmpty(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate string length
 */
export function isValidLength(str: string, minLength: number = 1, maxLength: number = 255): boolean {
  if (isEmpty(str)) return false;
  const length = str.length;
  return length >= minLength && length <= maxLength;
}

/**
 * Validate that value is a positive integer
 */
export function isPositiveInteger(value: any): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validate project data
 */
export function validateProjectData(data: {
  name: string;
  detail?: string;
  isPublic: boolean;
}): ValidationResult {
  const errors: string[] = [];

  if (!isValidLength(data.name, 1, 255)) {
    errors.push('Project name must be between 1 and 255 characters');
  }

  if (data.detail && data.detail.length > 1000) {
    errors.push('Project detail must not exceed 1000 characters');
  }

  if (typeof data.isPublic !== 'boolean') {
    errors.push('Public visibility must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate test case data
 */
export function validateTestCaseData(data: {
  title: string;
  state?: number;
  priority?: number;
  type?: number;
  automationStatus?: number;
  template?: number;
  description?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!isValidLength(data.title, 1, 255)) {
    errors.push('Test case title must be between 1 and 255 characters');
  }

  if (data.state !== undefined && !isPositiveInteger(data.state)) {
    errors.push('State must be selected');
  }

  if (data.priority !== undefined && !isPositiveInteger(data.priority)) {
    errors.push('Priority must be selected');
  }

  if (data.type !== undefined && !isPositiveInteger(data.type)) {
    errors.push('Type must be selected');
  }

  if (data.automationStatus !== undefined && !isPositiveInteger(data.automationStatus)) {
    errors.push('Automation status must be selected');
  }

  if (data.template !== undefined && !isPositiveInteger(data.template)) {
    errors.push('Template must be selected');
  }

  if (data.description && data.description.length > 5000) {
    errors.push('Description must not exceed 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate test run data
 */
export function validateTestRunData(data: {
  name: string;
  description?: string;
  state?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!isValidLength(data.name, 1, 255)) {
    errors.push('Test run name must be between 1 and 255 characters');
  }

  if (data.description && data.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }

  if (data.state !== undefined && !isPositiveInteger(data.state)) {
    errors.push('State must be selected');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user data
 */
export function validateUserData(data: {
  email?: string;
  username?: string;
  password?: string;
  role?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.username && !isValidLength(data.username, 1, 50)) {
    errors.push('Username must be between 1 and 50 characters');
  }

  if (data.password && !isValidLength(data.password, 8, 100)) {
    errors.push('Password must be between 8 and 100 characters');
  }

  if (data.role !== undefined && !isPositiveInteger(data.role)) {
    errors.push('Role must be selected');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Display validation errors to user
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return '• ' + errors.join('\n• ');
}
