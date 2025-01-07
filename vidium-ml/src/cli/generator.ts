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
    fileNode.append('import movis as mv', NL, NL);
    // Create composition
    fileNode.append('# Create composition', NL);
    fileNode.append('scene = mv.layer.Composition(size=(1920, 1080), duration=5.0)', NL, NL);

    // Process elements
    generateElements(video.elements, fileNode);

    // Export video
    fileNode.append(NL, '# Export video', NL);
    fileNode.append(`scene.write_video("generated_video/${video.name}.mp4")`, NL);
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
                fileNode.append(`scene.add_layer(${varName}_item, transform=${varName}_transform)`, NL);
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
                        fileNode.append(`scene.add_layer(${varName}_item, transform=${varName}_transform)`, NL);
                        break;
                    }
                }
                chalk.red(`Error: Asset reference ${referenceName} not found`);
                break;
            default:
                // Direct AssetItem cases
                generateAssetItem(element, varName, fileNode);
                if (element.$type === 'Text') {
                    // Workaround to handle movis shit behaviour
                    const start = element.from ? element.from : 0;
                    fileNode.append(`scene.add_layer(${varName}_item, transform=${varName}_transform, offset=${start})`, NL);
                } else {
                    fileNode.append(`scene.add_layer(${varName}_item, transform=${varName}_transform)`, NL);
                }
                break;
        }
        fileNode.append(NL);
    });
}

function generateAssetItem(item: AssetItem, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (item.$type) {
        case 'Clip':
            const clip = item as Clip;
            fileNode.append(`${varName} = mv.layer.Video("${clip.path}")`, NL);
            compileTransform(clip.position, clip.coor_x, clip.coor_y, clip.scale_x, clip.scale_y, clip.scale, clip.rotate, clip.opacity, varName, fileNode);
            compileTime(clip.from, clip.to, varName, fileNode);
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = mv.layer.Image("${img.path}")`, NL);
            compileTransform(img.position, img.coor_x, img.coor_y, img.scale_x, img.scale_y, img.scale, img.rotate, img.opacity, varName, fileNode);
            compileTime(img.from, img.to, varName, fileNode);
            break;

        case 'Text':
            const txt = item as Text;
            const text = txt.text ? txt.text : '';
            const color = txt.color ? processColor(txt.color) : "#ffffff";
            const font_size = txt.size ? `${txt.size}` : 30;
            fileNode.append(`${varName} = mv.layer.Text("${text}", font_size=${font_size}, color="${color}")`, NL);
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
    const processedPosition = processPosition(position, coor_x, coor_y);
    const processedScale = processScale(scale_x, scale_y, scale);
    // Default rotation is 0
    rotate = rotate ? rotate : 0;
    // Default opacity is 1.0
    opacity = opacity ? opacity : 1.0;
    fileNode.append(`${varName}_transform = mv.Transform(position=${processedPosition}, scale=${processedScale}, rotation=${rotate}, opacity=${opacity})`, NL);
}

function compileTime(from: number | undefined, to: number | undefined, varName: string, fileNode: CompositeGeneratorNode): void {
    const hasFrom = from !== undefined;
    const hasTo = to !== undefined;

    if (hasFrom || hasTo) {
        const start = hasFrom ? from : 0;
        const end = hasTo ? to : `${varName}.duration`;
        fileNode.append(`${varName}_item = mv.layer.LayerItem(${varName}, offset=${start}, start_time=0.0, end_time=${end})`, NL);
    } else {
        fileNode.append(`${varName}_item = mv.layer.LayerItem(${varName})`, NL);
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
    }else {
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