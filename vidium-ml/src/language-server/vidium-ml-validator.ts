import { ValidationAcceptor, ValidationChecks } from 'langium';
import {AssetElement, AssetItem, Video, VidiumMlAstType} from './generated/ast';
import type { VidiumMLServices } from './vidium-ml-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: VidiumMLServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.VidiumMLValidator;
    const checks: ValidationChecks<VidiumMlAstType> = {
        Video: [validator.checkNothing, validator.checkWrongfullyCuts]
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class VidiumMLValidator {

    checkNothing(video: Video, accept: ValidationAcceptor): void {

    }

    checkWrongfullyCuts(video: Video, accept: ValidationAcceptor): void {
        // if the element is not a video or audio, it should not have cut_from | cut_to
        video.elements.forEach(element => {
            checkCutsAssetElement( video.elements, element, accept);
        });
    }

}

function checkCutsAssetElement(allElements :AssetElement[], element: AssetElement, accept: ValidationAcceptor): void {
    switch (element.$type) {
            case 'AssetComposition':
                checkCutsAssetElement(allElements, element.left, accept);
                checkCutsAssetElement(allElements, element.right, accept);
                break;

            case 'DefineAsset':
                checkCutsAssetItem(element.item, accept);
                break;

            case 'UseAsset':
                // Handle asset de-reference
                const referenceName = element.reference.ref?.name
                const reference = allElements.find(e => e.$type === 'DefineAsset' && e.name === referenceName);
                if (reference === undefined){
                    return;
                }
                if(isCutable(reference) && hasCuts(element.cut_from, element.cut_to)) {
                    accept('error', 'This item should not have cuts', { node: element });
                }
                break;

            default:
                checkCutsAssetItem(element, accept);
                break;
        }
}

function checkCutsAssetItem(item: AssetItem, accept: ValidationAcceptor): void {
    if (isWrongfullyCut(item)){
        accept('error', 'This item should not have cuts', { node: item });
    }
}
function isWrongfullyCut(element: AssetItem): boolean{
    if(!isCutable(element) && hasCuts(element.cut_to, element.cut_from))
        console.log("type: ", element.$type, "cut_from :  ", element.cut_from, "cut_to : ", element.cut_to);
    console.log("test2");
    return !isCutable(element) && hasCuts(element.cut_from, element.cut_to);
}

function isCutable(element: AssetItem | AssetElement): boolean{
    return element.$type === 'Clip' || element.$type === 'Audio';
}
function hasCuts(from: number | undefined, to: number | undefined): boolean {
    return from !== undefined || to !== undefined;
}
