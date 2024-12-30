import { ValidationAcceptor, ValidationChecks } from 'langium';
import { VidiumMlAstType, Video } from './generated/ast';
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
        if (video.name) {
            const firstChar = video.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'App name should start with a capital.', { node: video, property: 'name' });
            }
        }
    }

}
