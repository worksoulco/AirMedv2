import { ValidationRule, ValidationResult, ValidationSchema, ValidationOptions } from './types';
import { errorService } from '../errors/service';

class ValidationService {
  private schemas: Map<string, ValidationSchema> = new Map();

  registerSchema(name: string, schema: ValidationSchema) {
    this.schemas.set(name, schema);
  }

  getSchema(name: string): ValidationSchema | undefined {
    return this.schemas.get(name);
  }

  async validate(
    data: Record<string, any>,
    schemaNameOrRules: string | ValidationSchema,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    try {
      const schema = typeof schemaNameOrRules === 'string'
        ? this.getSchema(schemaNameOrRules)
        : schemaNameOrRules;

      if (!schema) {
        throw new Error(`Validation schema not found: ${schemaNameOrRules}`);
      }

      const result: ValidationResult = {
        valid: true,
        errors: []
      };

      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        for (const rule of rules) {
          try {
            const isValid = await rule.validate(value, options.context);

            if (!isValid) {
              result.valid = false;
              result.errors.push({
                field,
                rule: rule.type,
                message: rule.message
              });

              if (options.abortEarly) {
                return result;
              }
            }
          } catch (error) {
            console.error(`Validation error for field ${field}:`, error);
            result.valid = false;
            result.errors.push({
              field,
              rule: rule.type,
              message: 'Validation failed'
            });

            if (options.abortEarly) {
              return result;
            }
          }
        }
      }

      return result;
    } catch (error) {
      errorService.handleError({
        name: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        context: { data, schema: schemaNameOrRules },
        timestamp: new Date().toISOString(),
        handled: true
      });

      return {
        valid: false,
        errors: [{
          field: '*',
          rule: 'system',
          message: 'System validation error occurred'
        }]
      };
    }
  }

  // Helper to create a validation function for a specific schema
  createValidator(schemaNameOrRules: string | ValidationSchema, options: ValidationOptions = {}) {
    return (data: Record<string, any>) => this.validate(data, schemaNameOrRules, options);
  }
}

export const validationService = new ValidationService();