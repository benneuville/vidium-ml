import fs from 'fs';
import {CompositeGeneratorNode, NL, toString} from 'langium';
import path from 'path';
import {AssetElement, AssetItem, Clip, Image, Rectangle, Text, Video} from '../language-server/generated/ast';
import {extractDestinationAndName} from './cli-util';

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
                generateAssetItem(element.item, `${element.name}_asset`, fileNode);
                fileNode.append(`scene.add_layer(${element.name}_asset)`, NL);
                break;

            case 'ReferenceAsset':
                generateAssetItem(element.item, varName, fileNode);
                fileNode.append(`scene.add_layer(${varName})`, NL);
                break;
            case 'UseAsset':
                // TODO: Implement UseAsset, to generate the same code as DefineAsset.item
                break;
            default:
                // Direct AssetItem cases
                generateAssetItem(element, varName, fileNode);
                fileNode.append(`scene.add_layer(${varName}_item)`, NL);
                break;
        }
    });
}

function generateAssetItem(item: AssetItem, varName: string, fileNode: CompositeGeneratorNode): void {
    switch (item.$type) {
        case 'Rectangle':
            const rect = item as Rectangle;
            fileNode.append(`${varName} = mv.layer.Rectangle(`, NL);
            fileNode.append(`    size=(${rect.width}, ${rect.height}),`, NL);
            fileNode.append(`    color=${compileColor(rect.color)}`, NL);
            fileNode.append(`)`, NL);
            break;

        case 'Clip':
            const clip = item as Clip;
            fileNode.append(`${varName} = mv.layer.Video("${clip.path}")`, NL);
            compileTime(clip.from, clip.to, varName, fileNode);
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = mv.layer.Image("${img.path}")`, NL);
            compileTime(img.from, img.to, varName, fileNode);
            break;

        case 'Text':
            const txt = item as Text;
            const text = txt.text ? txt.text : '';
            const color = txt.color ? compileColor(txt.color) : "#ffffff";
            const font_size = txt.size ? `${txt.size}` : 30;
            fileNode.append(`${varName} = mv.layer.Text("${text}", font_size=${font_size}, color="${color}")`, NL);
            compileTime(txt.from, txt.to, varName, fileNode);
            break;
    }
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
function compileColor(color: string): string {
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