import { ValidationAcceptor, ValidationChecks } from 'langium';
import { VidiumMlAstType, App } from './generated/ast';
import type { VidiumMLServices } from './vidium-ml-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: VidiumMLServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.VidiumMLValidator;
    const checks: ValidationChecks<VidiumMlAstType> = {
        App: validator.checkNothing
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class VidiumMLValidator {

    checkNothing(app: App, accept: ValidationAcceptor): void {
        if (app.name) {
            const firstChar = app.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'App name should start with a capital.', { node: app, property: 'name' });
            }
        }
    }

}
