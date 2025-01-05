import { ValidationAcceptor, ValidationChecks } from 'langium';
import {Video, VidiumMlAstType} from './generated/ast';
import type { VidiumMLServices } from './vidium-ml-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: VidiumMLServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.VidiumMLValidator;
    const checks: ValidationChecks<VidiumMlAstType> = {
        Video: validator.checkNothing
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class VidiumMLValidator {

    checkNothing(video: Video, accept: ValidationAcceptor): void {
        // This is a dummy validation that does nothing.
    }

}
