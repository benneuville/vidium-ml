import fs from 'fs';
import {CompositeGeneratorNode, NL, toString} from 'langium';
import path from 'path';
import {AssetElement, AssetItem, Clip, Image, Text, UseAsset, Video} from '../language-server/generated/ast';
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
    fileNode.append('from moviepy import *', NL);
    fileNode.append('from moviepy.video.tools.drawing import color_gradient', NL, NL);

    // Create composition
    fileNode.append('# Create composition', NL);
    fileNode.append('final_clips = []', NL, NL);

    // Process elements
    generateElements(video.elements, fileNode);

    // Combine all clips and export video
    fileNode.append(NL, '# Combine clips and export video', NL);
    fileNode.append('final_video = CompositeVideoClip(final_clips, size=(1920, 1080))', NL);
    fileNode.append(`final_video.write_videofile("generated_video/${video.name}.mp4", fps=24)`, NL);
}

function generateElements(elements: AssetElement[], fileNode: CompositeGeneratorNode): void {
    elements?.forEach((element, index) => {
        const varName = `clip_${index}`;

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
                fileNode.append(`final_clips.append(${varName})`, NL);
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
                        fileNode.append(`final_clips.append(${varName})`, NL);
                        break;
                    }
                }
                chalk.red(`Error: Asset reference ${referenceName} not found`);
                break;

            default:
                // Direct AssetItem cases
                generateAssetItem(element, varName, fileNode);
                fileNode.append(`final_clips.append(${varName})`, NL);
                break;
        }
        fileNode.append(NL);
    });
}

function generateAssetItem(item: AssetItem, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (item.$type) {
        case 'Clip':
            const clip = item as Clip;
            fileNode.append(`${varName} = VideoFileClip("${clip.path}")`, NL);
            compileTransform(clip.position, clip.coor_x, clip.coor_y, clip.scale_x, clip.scale_y, clip.scale, clip.rotate, clip.opacity, varName, fileNode);
            compileTime(clip.from, clip.to, varName, fileNode);
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = ImageClip("${img.path}")`, NL);
            compileTransform(img.position, img.coor_x, img.coor_y, img.scale_x, img.scale_y, img.scale, img.rotate, img.opacity, varName, fileNode);
            compileTime(img.from, img.to, varName, fileNode);
            break;

        case 'Text':
            const txt = item as Text;
            const text = txt.text ? txt.text : '';
            const color = txt.color ? processColor(txt.color) : "#ffffff";
            const font_size = txt.size ? txt.size : 30;
            fileNode.append(`${varName} = TextClip(font="../api_sample/fonts/CourierPrime-Regular.ttf", text="${text}", font_size=${font_size}, color="${color}", size=(1920, 1080))`, NL);
            compileTransform(txt.position, txt.coor_x, txt.coor_y, txt.scale_x, txt.scale_y, txt.scale, txt.rotate, txt.opacity, varName, fileNode);
            compileTime(txt.from, txt.to, varName, fileNode);
            break;
    }
}

function overrideAssetItemParameters(item: AssetItem, element: UseAsset): void {
    item.position = element.position ? element.position : item.position;
    item.coor_x = element.coor_x ? element.coor_x : item.coor_x;
    item.coor_y = element.coor_y ? element.coor_y : item.coor_y;
    item.scale_x = element.scale_x ? element.scale_x : item.scale_x;
    item.scale_y = element.scale_y ? element.scale_y : item.scale_y;
    item.scale = element.scale ? element.scale : item.scale;
    item.rotate = element.rotate ? element.rotate : item.rotate;
    item.opacity = element.opacity ? element.opacity : item.opacity;
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
    // Handle position
    const pos = processPosition(position, coor_x, coor_y);
    fileNode.append(`${varName} = ${varName}.with_position(${pos})`, NL);

    // Handle scale
    const scaleValues = processScale(scale_x, scale_y, scale);
    if (scaleValues !== '(1.0, 1.0)') {
        fileNode.append(`${varName} = ${varName}.resized(${scaleValues})`, NL);
    }

    // Handle rotation
    if (rotate) {
        fileNode.append(`${varName} = ${varName}.rotated(${rotate})`, NL);
    }

    // Handle opacity
    if (opacity !== undefined && opacity !== 1.0) {
        fileNode.append(`${varName} = ${varName}.with_opacity(${opacity})`, NL);
    }
}

function compileTime(from: number | undefined, to: number | undefined, varName: string, fileNode: CompositeGeneratorNode): void {
    if (from !== undefined || to !== undefined) {
        const start = from !== undefined ? from : 0;
        const end = to !== undefined ? to : null;
        if (end !== null) {
            fileNode.append(`${varName} = ${varName}.subclipped(${start}, ${end})`, NL);
        } else {
            fileNode.append(`${varName} = ${varName}.subclipped(${start})`, NL);
        }
    }
}

function processScale(scale_x: number | undefined, scale_y: number | undefined, scale: number | undefined): string {
    if (scale_x !== undefined && scale_y !== undefined) {
        return `width=${scale_x}, height=${scale_y}`;
    } else if (scale !== undefined) {
        return `${scale}`;
    }
    return '(1.0, 1.0)';
}

function processPosition(position: string | undefined, coor_x: number | undefined, coor_y: number | undefined): string {
    if (position === undefined && coor_x !== undefined && coor_y !== undefined) {
        return `(${coor_x}, ${coor_y})`;
    } else if (position !== undefined) {
        switch (position) {
            case 'CENTER':
                return 'lambda t: ("center", "center")';
            case 'TOP':
                return 'lambda t: ("center", "top")';
            case 'BOTTOM':
                return 'lambda t: ("center", "bottom")';
            case 'LEFT':
                return 'lambda t: ("left", "center")';
            case 'RIGHT':
                return 'lambda t: ("right", "center")';
            default:
                return 'lambda t: ("center", "center")';
        }
    }
    return 'lambda t: ("center", "center")';
}

function processColor(color: string): string {
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