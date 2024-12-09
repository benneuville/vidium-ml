"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VidiumMLValidator = exports.registerValidationChecks = void 0;
/**
 * Register custom validation checks.
 */
function registerValidationChecks(services) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.VidiumMLValidator;
    const checks = {
        App: validator.checkNothing
    };
    registry.register(checks, validator);
}
exports.registerValidationChecks = registerValidationChecks;
/**
 * Implementation of custom validations.
 */
class VidiumMLValidator {
    checkNothing(app, accept) {
        if (app.name) {
            const firstChar = app.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'App name should start with a capital.', { node: app, property: 'name' });
            }
        }
    }
}
exports.VidiumMLValidator = VidiumMLValidator;
//# sourceMappingURL=vidium-ml-validator.js.map