import {
    createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, inject,
    LangiumServices, LangiumSharedServices, Module, PartialLangiumServices
} from 'langium';
import { VidiumMLGeneratedModule, VidiumMlGeneratedSharedModule } from './generated/module';
import { VidiumMLValidator, registerValidationChecks } from './vidium-ml-validator';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type VidiumMLAddedServices = {
    validation: {
        VidiumMLValidator: VidiumMLValidator
    }
    
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type VidiumMLServices = LangiumServices & VidiumMLAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const VidiumMLModule: Module<VidiumMLServices, PartialLangiumServices & VidiumMLAddedServices> = {
    validation: {
        VidiumMLValidator: () => new VidiumMLValidator()
    }
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createVidiumMLServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    VidiumML: VidiumMLServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        VidiumMlGeneratedSharedModule
    );
    const VidiumML = inject(
        createDefaultModule({ shared }),
        VidiumMLGeneratedModule,
        VidiumMLModule
    );
    shared.ServiceRegistry.register(VidiumML);
    registerValidationChecks(VidiumML);
    return { shared, VidiumML };
}
