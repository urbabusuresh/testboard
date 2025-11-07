/**
 * Validation utilities for form inputs
 */

/**
 * Check if a value is empty (null, undefined, or empty string)
 */
function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (isEmpty(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate string length
 */
function isValidLength(str, minLength = 1, maxLength = 255) {
  if (isEmpty(str)) return false;
  const length = str.length;
  return length >= minLength && length <= maxLength;
}

/**
 * Validate that value is a positive integer
 */
function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validate that value is in allowed values
 */
function isInEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Validate required fields in request body
 */
function validateRequiredFields(body, requiredFields) {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (isEmpty(body[field])) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate project data
 */
function validateProjectData(data) {
  const errors = [];
  
  if (!isValidLength(data.name, 1, 255)) {
    errors.push('Project name must be between 1 and 255 characters');
  }
  
  if (data.detail && !isValidLength(data.detail, 0, 1000)) {
    errors.push('Project detail must not exceed 1000 characters');
  }
  
  if (typeof data.isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean value');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate test case data
 */
function validateTestCaseData(data) {
  const errors = [];
  
  if (!isValidLength(data.title, 1, 255)) {
    errors.push('Test case title must be between 1 and 255 characters');
  }
  
  if (!isPositiveInteger(data.state)) {
    errors.push('State must be a positive integer');
  }
  
  if (!isPositiveInteger(data.priority)) {
    errors.push('Priority must be a positive integer');
  }
  
  if (!isPositiveInteger(data.type)) {
    errors.push('Type must be a positive integer');
  }
  
  if (!isPositiveInteger(data.automationStatus)) {
    errors.push('Automation status must be a positive integer');
  }
  
  if (!isPositiveInteger(data.template)) {
    errors.push('Template must be a positive integer');
  }
  
  if (data.description && !isValidLength(data.description, 0, 5000)) {
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
function validateTestRunData(data) {
  const errors = [];
  
  if (!isValidLength(data.name, 1, 255)) {
    errors.push('Test run name must be between 1 and 255 characters');
  }
  
  if (data.description && !isValidLength(data.description, 0, 1000)) {
    errors.push('Description must not exceed 1000 characters');
  }
  
  if (data.state !== undefined && !isPositiveInteger(data.state)) {
    errors.push('State must be a positive integer');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user data
 */
function validateUserData(data) {
  const errors = [];
  
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
    errors.push('Role must be a positive integer');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  isEmpty,
  isValidEmail,
  isValidLength,
  isPositiveInteger,
  isInEnum,
  validateRequiredFields,
  validateProjectData,
  validateTestCaseData,
  validateTestRunData,
  validateUserData,
};
