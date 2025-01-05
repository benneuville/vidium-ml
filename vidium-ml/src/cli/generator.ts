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
    fileNode.append('scene = mv.layer.Composition(size=(1920, 1080))', NL, NL);

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

            case 'Rectangle':
            case 'Clip':
            case 'Image':
            case 'Text':
                // Direct AssetItem cases
                generateAssetItem(element, varName, fileNode);
                fileNode.append(`scene.add_layer(${varName})`, NL);
                break;

            default:
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
            if (clip.from !== undefined || clip.to !== undefined) {
                fileNode.append(`${varName} = mv.trim(${varName}, `);
                fileNode.append(`start_times=[${clip.from ?? 0}], `);
                fileNode.append(`end_times=[${clip.to ?? `${varName}.duration`}])`, NL);
            }
            break;

        case 'Image':
            const img = item as Image;
            fileNode.append(`${varName} = mv.layer.Image("${img.path}")`, NL);
            break;

        case 'Text':
            const text = item as Text;
            fileNode.append(`${varName} = mv.layer.Text("${text.text}")`, NL);
            break;
    }
}

function compileColor(color: string): string {
    // Remove quotes from color string
    const cleanColor = color.replace(/['"]+/g, '').toUpperCase();
    switch (cleanColor) {
        case 'RED':
            return '(255, 0, 0)';
        case 'GREEN':
            return '(0, 255, 0)';
        case 'BLUE':
            return '(0, 0, 255)';
        default:
            return '(0, 0, 0)';
    }
}