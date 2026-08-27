/**
 * Rankly.ai - Strict Schema-Based Input Validator Middleware
 * Enforces strict type, length, bounds, format (regex), and unexpected field rejection.
 */

const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  OTP: /^\d{6}$/,
  PHONE: /^[+]?[0-9\s\-().]{7,25}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$/
};

function validateField(fieldName, value, rules) {
  if (value === undefined || value === null || value === '') {
    if (rules.required) {
      return 'Field \'' + fieldName + '\' is required.';
    }
    return null;
  }

  const expectedType = rules.type || 'string';

  switch (expectedType) {
    case 'string': {
      if (typeof value !== 'string') {
        return 'Field \'' + fieldName + '\' must be a string (received ' + typeof value + ').';
      }
      const trimmed = value.trim();
      if (rules.required && trimmed.length === 0) {
        return 'Field \'' + fieldName + '\' cannot be empty.';
      }
      if (rules.min !== undefined && trimmed.length < rules.min) {
        return 'Field \'' + fieldName + '\' must be at least ' + rules.min + ' characters long.';
      }
      if (rules.max !== undefined && trimmed.length > rules.max) {
        return 'Field \'' + fieldName + '\' must be at most ' + rules.max + ' characters long.';
      }
      if (rules.pattern && !rules.pattern.test(trimmed)) {
        return rules.patternMessage || 'Field \'' + fieldName + '\' has an invalid format.';
      }
      if (rules.enum && !rules.enum.includes(trimmed)) {
        return 'Field \'' + fieldName + '\' must be one of: ' + rules.enum.join(', ') + '.';
      }
      break;
    }

    case 'email': {
      if (typeof value !== 'string') {
        return 'Field \'' + fieldName + '\' must be an email string.';
      }
      const cleanEmail = value.trim().toLowerCase();
      if (!PATTERNS.EMAIL.test(cleanEmail)) {
        return 'Field \'' + fieldName + '\' must be a valid email address (e.g. user@domain.com).';
      }
      if (rules.max && cleanEmail.length > rules.max) {
        return 'Field \'' + fieldName + '\' is too long (maximum ' + rules.max + ' characters).';
      }
      break;
    }

    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      if (isNaN(num) || typeof value === 'boolean') {
        return 'Field \'' + fieldName + '\' must be a valid number.';
      }
      if (rules.min !== undefined && num < rules.min) {
        return 'Field \'' + fieldName + '\' must be at least ' + rules.min + '.';
      }
      if (rules.max !== undefined && num > rules.max) {
        return 'Field \'' + fieldName + '\' must be at most ' + rules.max + '.';
      }
      break;
    }

    case 'integer': {
      const num = typeof value === 'number' ? value : Number(value);
      if (isNaN(num) || !Number.isInteger(num) || typeof value === 'boolean') {
        return 'Field \'' + fieldName + '\' must be an integer.';
      }
      if (rules.min !== undefined && num < rules.min) {
        return 'Field \'' + fieldName + '\' must be at least ' + rules.min + '.';
      }
      if (rules.max !== undefined && num > rules.max) {
        return 'Field \'' + fieldName + '\' must be at most ' + rules.max + '.';
      }
      break;
    }

    case 'boolean': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return 'Field \'' + fieldName + '\' must be a boolean (true or false).';
      }
      break;
    }

    case 'enum': {
      if (!rules.enum || !Array.isArray(rules.enum)) {
        return 'Invalid enum definition for \'' + fieldName + '\'.';
      }
      if (!rules.enum.includes(value)) {
        return 'Field \'' + fieldName + '\' must be one of: ' + rules.enum.join(', ') + '.';
      }
      break;
    }

    case 'array': {
      if (!Array.isArray(value)) {
        return 'Field \'' + fieldName + '\' must be an array.';
      }
      if (rules.min !== undefined && value.length < rules.min) {
        return 'Field \'' + fieldName + '\' must contain at least ' + rules.min + ' item(s).';
      }
      if (rules.max !== undefined && value.length > rules.max) {
        return 'Field \'' + fieldName + '\' must contain at most ' + rules.max + ' item(s).';
      }
      if (rules.items) {
        for (let i = 0; i < value.length; i++) {
          const itemErr = validateField(fieldName + '[' + i + ']', value[i], rules.items);
          if (itemErr) return itemErr;
        }
      }
      break;
    }

    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return 'Field \'' + fieldName + '\' must be an object.';
      }
      if (rules.schema) {
        const objErr = validateObject(value, rules.schema, rules.allowUnknown || false, fieldName);
        if (objErr.length > 0) return objErr[0].issue;
      }
      break;
    }

    case 'date': {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return 'Field \'' + fieldName + '\' must be a valid date.';
      }
      break;
    }

    case 'id': {
      if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 128) {
        return 'Field \'' + fieldName + '\' must be a valid identifier (1-128 characters).';
      }
      break;
    }

    case 'any': {
      break;
    }

    default: {
      return 'Unknown validation type \'' + expectedType + '\' for field \'' + fieldName + '\'.';
    }
  }

  if (typeof rules.custom === 'function') {
    const customResult = rules.custom(value);
    if (customResult === false) {
      return 'Field \'' + fieldName + '\' failed custom validation.';
    }
    if (typeof customResult === 'string') {
      return customResult;
    }
  }

  return null;
}

function validateObject(data = {}, schema = {}, allowUnknown = false, prefix = '') {
  const errors = [];
  const incomingKeys = Object.keys(data || {});
  const allowedKeys = Object.keys(schema);

  if (!allowUnknown) {
    for (const key of incomingKeys) {
      if (!allowedKeys.includes(key)) {
        const fullKey = prefix ? prefix + '.' + key : key;
        errors.push({
          field: fullKey,
          issue: 'Unexpected field \'' + fullKey + '\' is not allowed.'
        });
      }
    }
  }

  for (const [key, rules] of Object.entries(schema)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    const value = data ? data[key] : undefined;
    const err = validateField(fullKey, value, rules);
    if (err) {
      errors.push({
        field: fullKey,
        issue: err
      });
    }
  }

  return errors;
}

function validate(spec = {}, options = {}) {
  const allowUnknown = options.allowUnknown === true;

  return (req, res, next) => {
    const allErrors = [];

    if (spec.body) {
      const bodyErrors = validateObject(req.body, spec.body, allowUnknown);
      allErrors.push(...bodyErrors);
    }

    if (spec.query) {
      const queryErrors = validateObject(req.query, spec.query, true);
      allErrors.push(...queryErrors);
    }

    if (spec.params) {
      const paramsErrors = validateObject(req.params, spec.params, allowUnknown);
      allErrors.push(...paramsErrors);
    }

    if (allErrors.length > 0) {
      const primaryMessage = allErrors[0].issue;
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: primaryMessage,
        details: allErrors
      });
    }

    next();
  };
}

module.exports = {
  validate,
  validateField,
  validateObject,
  PATTERNS
};