import fs from 'fs';
import { execSync } from 'child_process';
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
import { warn } from 'console';

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
let ABSOLUTE_DURATION = 0.0;

let subtitleMap: Map<string, Subtitle> = new Map();

function compile(video: Video, fileNode: CompositeGeneratorNode): void {
    // Compute time for each element, as absolute time and return the absolute duration
    // This one to compute the absolute duration
    ABSOLUTE_DURATION = computeTime(video.elements);
    // This one to recompute the absolute time for each element with the correct value of absolute duration
    computeTime(video.elements);
    fileNode.append('import movis as mv', NL, NL);
    // Create composition
    fileNode.append('# Create composition', NL);
    fileNode.append('video_width = 1920', NL);
    fileNode.append('video_height = 1080', NL);
    fileNode.append(`scene = mv.layer.Composition(size=(video_width, video_height), duration=${ABSOLUTE_DURATION})`, NL, NL);

    // Process elements
    generateElements(video.elements, fileNode);
    checkSubtitlesOverlap();

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
                if(element.item.$type !== 'Subtitle'){
                    generateAssetItem(element.item, varName, fileNode);
                    fileNode.appendNewLine();
                    assignPreviousElement(element);
                }
                break;

            case 'UseAsset':
                // Handle asset de-reference
                const referenceName = element.reference.ref?.name
                if (referenceName && assetRefMap.has(referenceName)) {
                    const referencedAsset = assetRefMap.get(referenceName);
                    // Handle asset generation
                    if (referencedAsset) {
                        if (referencedAsset.$type !== 'Subtitle') {
                            overrideAssetItemParameters(referencedAsset, element);
                            generateAssetItem(referencedAsset, varName, fileNode);
                            fileNode.appendNewLine();
                            break;
                        }
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
            compileCut(varName, fileNode, clip.cut_from, clip.cut_to);
            compileTransform(clip, clip.position, clip.coor_x, clip.coor_y, clip.scale_x, clip.scale_y, clip.scale, clip.rotate, clip.opacity, varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}",  transform=${varName}_transform ${compileTime(clip)})`, NL);
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = mv.layer.Image("${img.path}")`, NL);
            compileTransform(img, img.position, img.coor_x, img.coor_y, img.scale_x, img.scale_y, img.scale, img.rotate, img.opacity, varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}", transform=${varName}_transform ${compileTime(img)})`, NL);
            break;

        case 'Text':
            const txt = item as Text;
            const text = txt.text ? txt.text : '';
            const color = txt.color ? processColor(txt.color) : "#ffffff";
            const font_size = txt.size ? `${txt.size}` : 30;
            fileNode.append(`${varName} = mv.layer.Text("${text}", font_size=${font_size}, color="${color}")`, NL);
            compileTransform(txt, txt.position, txt.coor_x, txt.coor_y, txt.scale_x, txt.scale_y, txt.scale, txt.rotate, txt.opacity, varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}", transform=${varName}_transform ${compileTime(txt)})`, NL);
            break;
        case "Audio":
            const audio = item as Audio;
            fileNode.append(`${varName} = mv.layer.Audio("${audio.path}")`, NL);
            compileCut(varName, fileNode, audio.cut_from, audio.cut_to);
            fileNode.append(`scene.add_layer(${varName}, name="${varName}" ${compileTime(audio)})`, NL);
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
            fileNode.append(`scene.add_layer(${varName}, transform=${varName}_transform, name="${varName}" ${compileTime(subtitle)})`, NL);
            computeSubtitleStyle(subtitle, varName, fileNode);
            break;
    }
}

function checkSubtitlesOverlap(): void {
    // Check if the subtitles overlap
    for (let i = 0; i < subtitleMap.size; i++) {
        let subtitle1 = subtitleMap.get(i.toString());
        for (let j = i + 1; j < subtitleMap.size; j++) {
            let subtitle2 = subtitleMap.get(j.toString());
            if (subtitle1 && subtitle2) {
                if (subtitle1.from === undefined || subtitle1.to === undefined || subtitle2.from === undefined || subtitle2.to === undefined) {
                    warn(`Warning: Subtitles ${subtitle1.text} or ${subtitle2.text} have undefined time`); // Should never happen
                } else {
                    if (subtitle1.from < subtitle2.to && subtitle1.to > subtitle2.from) {
                        warn(`Warning: Subtitles ${subtitle1.text} and ${subtitle2.text} overlap`);
                    }
                }
            }
        };
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

function compileCut(varName: string, fileNode: CompositeGeneratorNode,  from : number | undefined, to : number | undefined) {
    if (from && to){
        fileNode.append(`${varName} = mv.trim(${varName}, [${from}], [${to}])`, NL)
    }
}
function compileTransform(
    element : AssetItem,
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
    const elementType = element.$type
    const processedPosition = processPosition(elementType, varName, fileNode, position, coor_x, coor_y);
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
    console.log("ID: ", id);
    absoluteTimeRefMap.set(<string>id, <AbsoluteTime>{
        absoluteStart: absoluteStart,
        absoluteEnd: absoluteEnd,
        duration: duration
    });
    console.log(absoluteTimeRefMap.get(<string>id))
}

function compileTime(element: AssetItem): string {
    let id = getIdFromElement(element);

    const start = absoluteTimeRefMap.get(<string>id)?.absoluteStart;
    const end = absoluteTimeRefMap.get(<string>id)?.duration;
    if (element.$type === 'Subtitle') {
        let sub = element as Subtitle;
        sub.from = start;
        sub.to = end;
        subtitleMap.set(<string>id, sub);
    }

    return `, offset=${start}, start_time=0.0, end_time=${end}`;
}

function getIdFromElement(element: AssetItem): string {
    let id = element.$containerIndex?.toString();
    // If the element has no container index (in case of DefineAsset), use the container index of the container (the referenced element)
    if (id === undefined) {
        id = element.$container.$containerIndex?.toString();
    }
    return <string>id;
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

function processPosition(elementType : string, varName : string, fileNode : CompositeGeneratorNode, position: string | undefined, coor_x: number | undefined, coor_y: number | undefined): string {
    if (position === undefined && coor_x !== undefined && coor_y !== undefined) {
        return `(${coor_x}, ${coor_y})`;
    } else if (position !== undefined) {
        if(elementType == 'Clip' || elementType == 'Image'){
            fileNode.append(`${varName}_width = ${varName}.size[0]`, NL)
            fileNode.append(`${varName}_height = ${varName}.size[1]`, NL)
        }
        if(elementType == 'Text'){
            fileNode.append(`${varName}_width = ${varName}.get_size()[0]`, NL)
            fileNode.append(`${varName}_height = ${varName}.get_size()[1]`, NL)
        }
        switch (position) {
            case 'CENTER':
                return '(video_width/2, video_height/2)';
            case 'TOP':
                return `(video_width/2, ${varName}_height/2)`;
            case 'BOTTOM':
                return `(video_width/2, video_height - ${varName}_height/2)`;
            case 'LEFT':
                return `(${varName}_width/2, video_height/2)`;
            case 'RIGHT':
                return `(video_width - ${varName}_width/2 , video_height/2)`;
            case 'TOP-LEFT':
                return `(${varName}_width/2,${varName}_height/2)`;
            case 'TOP-RIGHT':
                return `(video_width - ${varName}_width/2,${varName}_height/2)`;
            case 'BOTTOM-LEFT':
                return `(${varName}_width/2,video_height - ${varName}_height/2)`
            case 'BOTTOM-RIGHT':
                return `(video_width - ${varName}_width/2,video_height - ${varName}_height/2)`
            default:
                return '(video_width/2, video_height/2)';
        }
        
    } else {
        // Default position is CENTER
        return '(video_width/2, video_height/2)';
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
        case 'WHITE':
            return '#ffffff';
        case 'BLACK':
            return '#000000';
        default:
            return '#000000';
    }
}

function computeTime(elements: AssetElement[]): number {
    elements?.forEach((element, index) => {
        switch (element.$type) {
            case 'AssetComposition':
                // Handle composition
                computeTime([element.left]);
                computeTime([element.right]);
                break;

            case 'DefineAsset':
                // Handle asset reference
                assetRefMap.set(element.name, element.item);

                // Handle asset generation
                computeAbsoluteTime(element.item);
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
                        computeAbsoluteTime(referencedAsset);
                        break;
                    }
                }
                chalk.red(`Error: Asset reference ${referenceName} not found`);
                break;

            default:
                // Direct AssetItem cases
                computeAbsoluteTime(element);
                assignPreviousElement(element);
                break;
        }
    });

    // Compute the absolute duration
    let max = 0;
    absoluteTimeRefMap.forEach((value) => {
        if (value.absoluteEnd > max) {
            max = value.absoluteEnd;
        }
    });
    console.log("Max: ", max);
    return max;

    function computeAbsoluteTime(element: AssetItem): void {
        let absoluteStart = 0;
        let absoluteEnd = 0;

        // compute the absoluteStart
        // start could be "from" or "reference"
        if (element.from !== undefined) {
            absoluteStart = element.from;
        } else if (element.reference !== undefined) {
            if (element.reference.ref === undefined) {
                throw new Error(`Reference ${element.reference.ref} not found`);
            }
            const referencedAsset = getReferencedAsset(element.reference.ref?.name);
            if (!referencedAsset) {
                throw new Error(`Reference ${element.reference.ref?.name} not found`);
            }
            const  referenceEnd = getReferenceEnd(referencedAsset);
            absoluteStart = referenceEnd;
            if(element.after !== undefined) {
                absoluteStart += element.after;
            }
            if(element.before !== undefined) {
                absoluteStart -= element.before;
            }
        } else {
            let referenceEnd = 0
            if (!isFirstElement(element)) {
                // use the reference of the previous element
                referenceEnd = getReferenceEnd(previousElement);
            } else {
                console.log("No previous element");
            }
            absoluteStart = referenceEnd;
            if(element.after !== undefined) {
                absoluteStart += element.after;
            }
            if(element.before !== undefined) {
                absoluteStart -= element.before;
            }
        }

        // compute the absoluteEnd
        // end could be "to" or cut or "duration
        if (element.to !== undefined) {
            absoluteEnd = element.to;
        } else if (element.cut_from !== undefined && element.cut_to !== undefined) {
            absoluteEnd = absoluteStart + (element.cut_to - element.cut_from);
        } else if (element.duration !== undefined) {
            absoluteEnd = absoluteStart + element.duration;
        } else {
            // use basic duration of the asset
            if (element.$type === 'Audio' || element.$type === 'Clip') {
                absoluteEnd = absoluteStart + getVideoDuration(element.path);
            } else if (element.$type === 'Text') {
                warn("Text element " + element.text +  " has no defined duration, use duration to allow text to be displayed");
                absoluteEnd = absoluteStart + ABSOLUTE_DURATION;
            } else {
                absoluteEnd = absoluteStart + ABSOLUTE_DURATION;
            }
        }

        assignAbsoluteTime(element, absoluteStart, absoluteEnd, absoluteEnd - absoluteStart);

        function getReferenceEnd(element: AssetItem): number {
            const id = getIdFromElement(element);
            const referenceEnd = absoluteTimeRefMap.get(id)?.absoluteEnd;
            if (referenceEnd !== undefined) {
                return referenceEnd;
            }
            return 0;
        }

        function getVideoDuration(filename: string): number {
            const command = `ffprobe -v quiet -print_format json -show_format "${filename}"`;
            const result = execSync(command);
            const metadata = JSON.parse(result.toString()) as FFProbeOutput;
            return parseFloat(metadata.format.duration);
        }

        function getReferencedAsset(referenceName: string): AssetItem | undefined {
            if (referenceName && assetRefMap.has(referenceName)) {
                const referencedAsset = assetRefMap.get(referenceName);
                if (referencedAsset) {
                    return referencedAsset;
                }
            }
            return undefined;
        }

        function isFirstElement(element : AssetItem) : boolean {
            // if id is '0'
            const id = getIdFromElement(element);
            return id === '0';
        }
    }
}

interface FFProbeOutput {
    format: {
        duration: string;
    };
}

