import fs from 'fs';
import {CompositeGeneratorNode, NL, toString} from 'langium';
import path from 'path';
import {
    AssetElement,
    AssetItem,
    Audio,
    Clip,
    Image, Subtitle,
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

// Map of ref string to AssetItem
let assetRefMap: Map<string, AssetItem> = new Map();

function compile(video: Video, fileNode: CompositeGeneratorNode): void {
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
}

function generateElements(elements: AssetElement[], fileNode: CompositeGeneratorNode): void {
    const subtitles: AssetItem[] = []; // Liste pour stocker les subtitles
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
                if (element.item.$type === 'Subtitle') {
                    subtitles.push(element.item); // Stocker les subtitles
                }else{
                    // Handle asset generation
                    generateAssetItem(element.item, varName, fileNode);
                    fileNode.appendNewLine();
                }
                break;

            case 'UseAsset':
                // Handle asset de-reference
                const referenceName = element.reference.ref?.name
                if (referenceName && assetRefMap.has(referenceName)) {
                    const referencedAsset = assetRefMap.get(referenceName);
                    // Handle asset generation
                    if (referencedAsset) {
                        if (referencedAsset.$type === 'Subtitle') {
                            subtitles.push(referencedAsset); // Stocker les subtitles
                        }
                        else{
                            overrideAssetItemParameters(referencedAsset, element);
                            generateAssetItem(referencedAsset, varName, fileNode);
                            fileNode.appendNewLine();
                        }
                        break;
                    }
                }
                chalk.red(`Error: Asset reference ${referenceName} not found`);
                break;
            default:
                if (element.$type === 'Subtitle') {
                    subtitles.push(element as Subtitle); // Stocker les subtitles
                }
                else{
                    // Direct AssetItem cases
                    generateAssetItem(element, varName, fileNode);
                    fileNode.appendNewLine();
                }
                break;
        }
    });

    // Add subtitle after all other elements (ensure they are on top)
    fileNode.append(NL, '# Add subtitles', NL);
    fileNode.append('font_size = 60', NL);

    fileNode.append('#FUNCTION DECLARATION', NL);
    fileNode.append('position_x = video_width / 2  # Centré horizontalement', NL);
    fileNode.append('position_y = video_height - (font_size / 2) - 20', NL);

    subtitles.forEach((subtitle, subIndex) => {
        const varName = `subtitle_${subIndex}`;
        generateAssetItem(subtitle, varName, fileNode);
        computeSubtitleStyle(subtitle, varName, fileNode);
    });
}

function computeSubtitleStyle(subtitle: AssetItem, name_in_layer: string, fileNode: CompositeGeneratorNode): void {
    if(subtitle.$type === 'Subtitle'){
        // Add default effects
        fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=0, color=(0, 0, 0), opacity=1.0))`, NL);
        fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=90, color=(0, 0, 0), opacity=1.0))`, NL);
        fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=180, color=(0, 0, 0), opacity=1.0))`, NL);
        fileNode.append(`scene["${name_in_layer}"].add_effect(mv.effect.DropShadow(offset=5.0, angle=270, color=(0, 0, 0), opacity=1.0))`, NL);
    }
}

function generateAssetItem(item: AssetItem, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (item.$type) {
        case 'Clip':
            const clip = item as Clip;
            fileNode.append(`${varName} = mv.layer.Video("${clip.path}")`, NL);
            compileTransform(clip, clip.position, clip.coor_x, clip.coor_y, clip.scale_x, clip.scale_y, clip.scale, clip.rotate, clip.opacity, varName, fileNode);
            compileTime(clip,varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}_item, transform=${varName}_transform)`, NL);
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = mv.layer.Image("${img.path}")`, NL);
            compileTransform(img, img.position, img.coor_x, img.coor_y, img.scale_x, img.scale_y, img.scale, img.rotate, img.opacity, varName, fileNode);
            compileTime(img,varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}_item, transform=${varName}_transform)`, NL);
            break;

        case 'Text':
            const txt = item as Text;
            const text = txt.text ? txt.text : '';
            const color = txt.color ? processColor(txt.color) : "#ffffff";
            const font_size = txt.size ? `${txt.size}` : 30;
            fileNode.append(`${varName} = mv.layer.Text("${text}", font_size=${font_size}, color="${color}")`, NL);
            compileTransform(txt, txt.position, txt.coor_x, txt.coor_y, txt.scale_x, txt.scale_y, txt.scale, txt.rotate, txt.opacity, varName, fileNode);
            compileTime(txt,varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, transform=${varName}_transform, offset=${varName}_start, end_time=${varName}_end)`, NL);
            break;
        case "Audio":
            const audio = item as Audio;
            fileNode.append(`${varName} = mv.layer.Audio("${audio.path}")`, NL);
            compileTime(audio,varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, offset=${varName}_start, end_time=${varName}_end)`, NL);
            break;
        case "Transition":
            compileTransition(item as Transition, varName, fileNode);
            break;

        // Subtitle is a text with specific parameters by default (could be overriden, of course)
        case 'Subtitle':
            const subtitle = item as Subtitle;
            const subtxt = subtitle.text ? subtitle.text : '';
            const subcolor = subtitle.color ? processColor(subtitle.color) : "#ffffff";
            const subfont_size = subtitle.size ? `${subtitle.size}` : 'font_size';
            const subFont = 'Arial';
            fileNode.append(`${varName} = mv.layer.Text("${subtxt}", font_size=${subfont_size}, color="${subcolor}", font_family="${subFont}")`, NL);
            compileTransform(subtitle, subtitle.position, subtitle.coor_x, subtitle.coor_y, subtitle.scale_x, subtitle.scale_y, subtitle.scale, undefined, subtitle.opacity, varName, fileNode);
            compileTime(item, varName, fileNode);
            fileNode.append(`scene.add_layer(${varName}, transform=${varName}_transform, name="${varName}", offset=${varName}_start, end_time=${varName}_end)`, NL);
            break;
    }
}

function compileTransition(transition: Transition, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (transition.type) {
        case 'FADE':
            const duration= (transition.to ?? 1.0) - (transition.from ?? 0);
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
    element: AssetItem,
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
    let processedPosition = undefined;
    if(element.$type == 'Subtitle'){
        processedPosition = '(position_x, position_y)';
    }
    else{
        processedPosition = processPosition(position, coor_x, coor_y);
    }
    const processedScale = processScale(scale_x, scale_y, scale);
    // Default rotation is 0
    rotate = rotate ? rotate : 0;
    // Default opacity is 1.0
    opacity = opacity ? opacity : 1.0;
    fileNode.append(`${varName}_transform = mv.Transform(position=${processedPosition}, scale=${processedScale}, rotation=${rotate}, opacity=${opacity})`, NL);
}

function compileTime(element: AssetItem, varName: string, fileNode: CompositeGeneratorNode) {
    const hasFrom = element.from !== undefined;
    const hasTo = element.to !== undefined;

    if(element.$type == 'Subtitle' || element.$type == 'Text' || element.$type == 'Audio'){
        const start = hasFrom ? element.from : 0;
        const end = hasTo ? element.to : `None`;
        fileNode.append(`${varName}_start = ${start}`, NL);
        fileNode.append(`${varName}_end = ${end}`, NL);
    }
    else{
        if (hasFrom || hasTo) {
            const start = hasFrom ? element.from : 0;
            const end = hasTo ? element.to : `${varName}.duration`;
            fileNode.append(`${varName}_item = mv.layer.LayerItem(${varName}, offset=${start}, end_time=${end})`, NL);
        } else {
            fileNode.append(`${varName}_item = mv.layer.LayerItem(${varName})`, NL);
        }
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