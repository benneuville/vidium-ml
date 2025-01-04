import { ValidationAcceptor, ValidationChecks } from 'langium';
import {VidiumMlAstType, AssetCreation} from './generated/ast';
import type { VidiumMLServices } from './vidium-ml-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: VidiumMLServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.VidiumMLValidator;
    const checks: ValidationChecks<VidiumMlAstType> = {
        AssetCreation: validator.checkNothing
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class VidiumMLValidator {

    checkNothing(assetCreation: AssetCreation, accept: ValidationAcceptor): void {
        // This is a dummy validation that does nothing.
    }

}
