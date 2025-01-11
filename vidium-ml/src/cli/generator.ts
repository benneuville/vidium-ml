import fs from 'fs';
import {CompositeGeneratorNode, NL, toString} from 'langium';
import path from 'path';
import {
    Asset,
    AssetElement,
    AssetItem,
    Audio,
    Clip,
    Image,
    Subtitle,
    Text,
    Transition,
    UseAsset,
    Video
} from '../language-server/generated/ast';
import {extractDestinationAndName} from './cli-util';
import chalk from "chalk";

export function generatePythonFile(video: Video, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.py`;

    const fileNode = new CompositeGeneratorNode();

    compile(video, fileNode);

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, {recursive: true});
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));
    return generatedFilePath;
}

interface AbsoluteTime {
    absoluteStart: number;
    absoluteEnd: number;
    duration: number;
}

// Map of ref string to AssetItem
let assetRefMap: Map<string, AssetItem> = new Map();
// Map of container_index (used as asset id) to AbsoluteTime
let absoluteTimeRefMap: Map<string, AbsoluteTime> = new Map();
let previousElement: AssetItem;
const ABSOLUTE_DURATION = 5.0;

function compile(video: Video, fileNode: CompositeGeneratorNode): void {
    // computeTotalDuration(video.elements);
    fileNode.append('import movis as mv', NL, NL);
    // Create composition
    fileNode.append('# Create composition', NL);
    fileNode.append('video_width = 1920', NL);
    fileNode.append('video_height = 1080', NL);
    fileNode.append('scene = mv.layer.Composition(size=(video_width, video_height), duration=5.0)', NL, NL);

    // Process elements
    generateElements(video.elements, fileNode);

    // Export video
    fileNode.append(NL, '# Export video', NL);
    fileNode.append(`scene.write_video("generated_video/${video.name}.mp4")`, NL);

    console.log(absoluteTimeRefMap);
}

function generateElements(elements: AssetElement[], fileNode: CompositeGeneratorNode): void {
    elements?.forEach((element, index) => {
        const varName = `element_${index}`;

        switch (element.$type) {
            case 'AssetComposition':
                // Handle composition
                generateElements([element.left], fileNode);
                generateElements([element.right], fileNode);
                break;

            case 'DefineAsset':
                // Handle asset reference
                assetRefMap.set(element.name, element.item);

                // Handle asset generation
                generateAssetItem(element.item, varName, fileNode);
                fileNode.appendNewLine();
                assignPreviousElement(element);
                break;

            case 'UseAsset':
                // Handle asset de-reference
                const referenceName = element.reference.ref?.name
                if (referenceName && assetRefMap.has(referenceName)) {
                    const referencedAsset = assetRefMap.get(referenceName);
                    // Handle asset generation
                    if (referencedAsset) {
                        overrideAssetItemParameters(referencedAsset, element);
                        generateAssetItem(referencedAsset, varName, fileNode);
                        fileNode.appendNewLine();
                        break;
                    }
                }
                chalk.red(`Error: Asset reference ${referenceName} not found`);
                break;

            default:
                // Direct AssetItem cases
                // Subtitle is handled separately, because must be on top of all other elements
                if (element.$type !== 'Subtitle') {
                    generateAssetItem(element, varName, fileNode);
                    fileNode.appendNewLine();
                    assignPreviousElement(element);
                }
                break;
        }
    });

    // Generate subtitles (on top of all other elements)
    elements.filter(element => element.$type === 'Subtitle').forEach((element, index) => {
        element = element as Subtitle;
        const varName = `subtitle_${index}`;

        generateAssetItem(element, varName, fileNode);
        fileNode.appendNewLine();
        assignPreviousElement(element);
    });
}

function computeSubtitleStyle(subtitle: Subtitle, name_in_layer: string, fileNode: CompositeGeneratorNode): void {
    // Add default effects
    fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=0, color=(0, 0, 0), opacity=1.0))`, NL);
    fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=90, color=(0, 0, 0), opacity=1.0))`, NL);
    fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=180, color=(0, 0, 0), opacity=1.0))`, NL);
    fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=270, color=(0, 0, 0), opacity=1.0))`, NL);
}

function generateAssetItem(item: AssetItem, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (item.$type) {
        case 'Clip':
            const clip = item as Clip;
            fileNode.append(`${varName} = mv.layer.Video("${clip.path}")`, NL);
            compileTransform(clip.position, clip.coor_x, clip.coor_y, clip.scale_x, clip.scale_y, clip.scale, clip.rotate, clip.opacity, varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}",  transform=${varName}_transform ${compileTime(clip, varName)})`, NL);
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = mv.layer.Image("${img.path}")`, NL);
            compileTransform(img.position, img.coor_x, img.coor_y, img.scale_x, img.scale_y, img.scale, img.rotate, img.opacity, varName, fileNode);
            compileTime(img, varName);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}", transform=${varName}_transform ${compileTime(img, varName)})`, NL);
            break;

        case 'Text':
            const txt = item as Text;
            const text = txt.text ? txt.text : '';
            const color = txt.color ? processColor(txt.color) : "#ffffff";
            const font_size = txt.size ? `${txt.size}` : 30;
            fileNode.append(`${varName} = mv.layer.Text("${text}", font_size=${font_size}, color="${color}")`, NL);
            compileTransform(txt.position, txt.coor_x, txt.coor_y, txt.scale_x, txt.scale_y, txt.scale, txt.rotate, txt.opacity, varName, fileNode);
            compileTime(txt, varName);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}", transform=${varName}_transform ${compileTime(txt, varName)})`, NL);
            break;
        case "Audio":
            const audio = item as Audio;
            fileNode.append(`${varName} = mv.layer.Audio("${audio.path}")`, NL);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}" ${compileTime(audio, varName)})`, NL);
            break;
        case "Transition":
            compileTransition(item as Transition, varName, fileNode);
            break;

        // Subtitle is a text with specific parameters by default (could be overriden, of course)
        case 'Subtitle':
            const subtitle = item as Subtitle;
            const subTxt = subtitle.text ? subtitle.text : '';
            const subColor = subtitle.color ? processColor(subtitle.color) : "#ffffff";
            const subFontSize = subtitle.size ? `${subtitle.size}` : 60;
            const subFont = 'Arial';
            fileNode.append(`${varName} = mv.layer.Text("${subTxt}", font_size=${subFontSize}, color="${subColor}", font_family="${subFont}")`, NL);
            fileNode.append(`${varName}_transform = mv.Transform(position=(video_width / 2, video_height - (${subFontSize} / 2) - 20), scale=(1.0, 1.0), rotation=0, opacity=1.0)`, NL);
            // The "_sub" suffix is added to the name to avoid conflicts with other elements
            fileNode.append(`scene.add_layer(${varName}, transform=${varName}_transform, name="${varName}" ${compileTime(subtitle, varName)})`, NL);
            computeSubtitleStyle(subtitle, varName, fileNode);
            break;
    }
}

function compileTransition(transition: Transition, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (transition.type) {
        case 'FADE':
            const duration = (transition.to ?? 1.0) - (transition.from ?? 0);
            const start = transition.from ?? 0;

            fileNode.append(`${varName} = mv.layer.Rectangle(size=(1920, 1080), color="#000000")`, NL);
            fileNode.append(`tmp = scene.add_layer(${varName}, offset=${start})`, NL);
            fileNode.append(`tmp.opacity.enable_motion().extend([0, ${duration}/2, ${duration}], [0, 1, 0], ['ease_out', 'ease_in'])`, NL);
            break;
    }
}

function overrideAssetItemParameters(item: AssetItem, element: UseAsset): void {
    // TODO : Refactor to improve maintainability
    if (item.$type !== 'Audio' && item.$type !== 'Transition') {
        item.position = element.position ? element.position : item.position;
        item.coor_x = element.coor_x ? element.coor_x : item.coor_x;
        item.coor_y = element.coor_y ? element.coor_y : item.coor_y;
        item.scale_x = element.scale_x ? element.scale_x : item.scale_x;
        item.scale_y = element.scale_y ? element.scale_y : item.scale_y;
        item.scale = element.scale ? element.scale : item.scale;
        item.opacity = element.opacity ? element.opacity : item.opacity;
    }
    item.from = element.from ? element.from : item.from;
    item.to = element.to ? element.to : item.to;

    if (item.$type === 'Text') {
        item.color = element.color ? element.color : item.color;
        item.size = element.size ? element.size : item.size;
    }
}

function compileTransform(
    position: string | undefined,
    coor_x: number | undefined,
    coor_y: number | undefined,
    scale_x: number | undefined,
    scale_y: number | undefined,
    scale: number | undefined,
    rotate: number | undefined,
    opacity: number | undefined,
    varName: string,
    fileNode: CompositeGeneratorNode
): void {
    const processedPosition = processPosition(position, coor_x, coor_y);
    const processedScale = processScale(scale_x, scale_y, scale);
    // Default rotation is 0
    rotate = rotate ? rotate : 0;
    // Default opacity is 1.0
    opacity = opacity ? opacity : 1.0;
    fileNode.append(`${varName}_transform = mv.Transform(position=${processedPosition}, scale=${processedScale}, rotation=${rotate}, opacity=${opacity})`, NL);
}

function assignPreviousElement(element: Asset): void {
    if (element.$type === 'DefineAsset') {
        previousElement = element.item;
    } else {
        // Since this function is called after the DefineAsset or AssetItem is generated, the else is safe (AssetItem)
        previousElement = element as AssetItem;
    }
}


function assignAbsoluteTime(element: AssetItem, absoluteStart: number | undefined, absoluteEnd: number | undefined, duration: number | undefined): void {
    let id = element.$containerIndex?.toString();
    // If the element has no container index (in case of DefineAsset), use the container index of the container (the referenced element)
    if (id === undefined) {
        id = element.$container.$containerIndex?.toString();
    }
    absoluteTimeRefMap.set(<string>id, <AbsoluteTime>{
        absoluteStart: absoluteStart,
        absoluteEnd: absoluteEnd,
        duration: duration
    });
}

function compileTime(element: AssetItem, varName: string): string {
    const hasFrom = element.from !== undefined;
    const hasTo = element.to !== undefined;
    const hasDuration = element.duration !== undefined;

    if (hasDuration) {
        return handleRelativeTime(element, varName);
    } else if (hasFrom || hasTo) {
        return handleAbsoluteTime(element, varName);
    } else {
        // Unknown time
        assignAbsoluteTime(element, 0, ABSOLUTE_DURATION, ABSOLUTE_DURATION);
        return `, offset=0, start_time=0.0, end_time=${ABSOLUTE_DURATION}`;
    }

    function handleRelativeTime(element: AssetItem, varName: string): string {
        let offset = 0;
        const referenceName = element.reference?.ref?.name;
        // 'lasts for _ since _'
        if (referenceName && assetRefMap.has(referenceName)) {
            const referencedAsset = assetRefMap.get(referenceName);
            offset = (referencedAsset?.to ? referencedAsset?.to : ABSOLUTE_DURATION);
            // @ts-ignore
            assignAbsoluteTime(element, offset, offset + element.duration, element.duration);
            return `, offset=${offset}, start_time=0.0, end_time=${element.duration}`;
        }
        // 'lasts for _'
        else {
            // Compute offset to be just after the previous asset
            offset = (previousElement?.to ? previousElement?.to : ABSOLUTE_DURATION);
            // @ts-ignore
            assignAbsoluteTime(element, offset, offset + element.duration, element.duration);
            return `, offset=${offset}, start_time=0.0, end_time=${element.duration}`;
        }
    }

    function handleAbsoluteTime(element: AssetItem, varName: string): string {
        const startAt = hasFrom ? element.from : 0;
        // @ts-ignore
        const end = hasTo ? (element.to - startAt) : element.duration;
        console.log("=========================================================")
        console.log(element)
        assignAbsoluteTime(element, startAt, element.to, end);
        return `, offset=${startAt}, start_time=0.0, end_time=${end}`;
    }
}


function processScale(scale_x: number | undefined, scale_y: number | undefined, scale: number | undefined): string {
    if (scale_x !== undefined && scale_y !== undefined) {
        return `(${scale_x}, ${scale_y})`;
    } else if (scale !== undefined) {
        return `(${scale}, ${scale})`;
    } else {
        // Default scale is (1.0, 1.0)
        return '(1.0, 1.0)';
    }
}

function processPosition(position: string | undefined, coor_x: number | undefined, coor_y: number | undefined): string {
    if (position === undefined && coor_x !== undefined && coor_y !== undefined) {
        return `(${coor_x}, ${coor_y})`;
    } else if (position !== undefined) {
        switch (position) {
            case 'CENTER':
                return '(1920/2, 1080/2)';
            case 'TOP':
                return '(1920/2, 0)';
            case 'BOTTOM':
                return '(1920/2, 1080)';
            case 'LEFT':
                return '(0, 1080/2)';
            case 'RIGHT':
                return '(1920, 1080/2)';
            default:
                return '(1920/2, 1080/2)';
        }
    } else {
        // Default position is CENTER
        return '(1920/2, 1080/2)';
    }
}

function processColor(color: string): string {
    // Remove quotes from color string
    const cleanColor = color.replace(/['"]+/g, '').toUpperCase();
    switch (cleanColor) {
        case 'RED':
            return '#ff0000';
        case 'GREEN':
            return '#00ff00';
        case 'BLUE':
            return '#0000ff';
        default:
            return '#000000';
    }
}

function computeTotalDuration(elements: AssetElement[]): void {
    let assetTimeRefMap = new Map();
    let previousTimeElement: AssetItem;
    let maxDuration = 0;
    elements?.forEach((element, index) => {

        switch (element.$type) {
            case 'AssetComposition':
                // Handle composition
                computeElementDuration(element.left as AssetItem);
                computeElementDuration(element.right as AssetItem);
                break;

            case 'DefineAsset':
                // Handle asset reference
                assetTimeRefMap.set(element.name, element.item);
                computeElementDuration(element.item);
                previousTimeElement = element.item;
                break;

            case 'UseAsset':
                // Handle asset de-reference
                const referenceName = element.reference.ref?.name
                if (referenceName && assetTimeRefMap.has(referenceName)) {
                    const referencedAsset = assetTimeRefMap.get(referenceName);
                    // Handle asset generation
                    if (referencedAsset) {
                        overrideAssetItemParameters(referencedAsset, element);
                        computeElementDuration(referencedAsset);
                        break;
                    }
                }
                chalk.red(`Error: Asset reference ${referenceName} not found`);
                break;

            default:
                // Direct AssetItem cases
                // Subtitle is handled separately, because must be on top of all other elements
                if (element.$type !== 'Subtitle') {
                    computeElementDuration(element);
                    previousTimeElement = element as AssetItem;
                }
                break;
        }
    });

    function computeElementDuration(element: AssetItem): void {
        let maxDuration = 0;
        const hasFrom = element.from !== undefined;
        const hasTo = element.to !== undefined;
        const hasDuration = element.duration !== undefined;

        if (hasDuration) {
            handleRelativeTime(element);
        } else if (hasFrom || hasTo) {
            handleAbsoluteTime(element);
        } else {
            // Unknown duration
        }

        function handleRelativeTime(element: AssetItem) {
            const referenceName = element.reference?.ref?.name;
            // 'lasts for _ since _'
            if (referenceName && assetRefMap.has(referenceName)) {

            }
            // 'lasts for _'
            else {
            }
        }


        function handleAbsoluteTime(element: AssetItem) {

        }

        function assignNewDuration(duration: number): void {
            if (duration > maxDuration) {
                maxDuration = duration;
            }
        }
    }
}

