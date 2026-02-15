import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Skip validation for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      next();
      return;
    }
    
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      next();
      return;
    }
    
    const errorMessages = errors.array().map((e) => {
      const field = e.type === 'field' ? `${e.path}: ` : '';
      return field + (e.msg || 'Invalid value');
    });
    const message = errorMessages.join(', ');
    
    // Always log validation errors for debugging
    console.log('[Validation Error]', {
      path: req.path,
      method: req.method,
      params: req.params,
      errors: errors.array(),
      message,
    });
    
    next(new ApiError(400, message));
  };
}
