import fs from 'fs';
import {CompositeGeneratorNode, toString} from 'langium';
import path from 'path';
import {AssetItem, Clip, Layer, Rectangle, Sequence, Video} from '../language-server/generated/ast';
import {extractDestinationAndName} from './cli-util';

export function generatePythonFile(video: Video, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.py`;

    const fileNode = new CompositeGeneratorNode();
    compile(video, fileNode)


    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, {recursive: true});
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));
    return generatedFilePath;
}


function compile(video: Video, fileNode: CompositeGeneratorNode) {
    // Import required libraries
    fileNode.append(`
import movis as mv

# Video Composition
scene = mv.layer.Composition(size=(1920, 1080), duration=60)

# Define Assets
`);

    // Compile all assets
    const assetMap = new Map<string, string>();
    video.assets.forEach(asset => {
        const assetName = `asset_${asset.name}`;
        let assetCode = '';

        switch (asset.assetItem.$type) {
            case 'Rectangle':
                const rectangle = asset.assetItem as Rectangle;
                assetCode = `${assetName} = mv.layer.Rectangle(
                    size=(${rectangle.width}, ${rectangle.height}), 
                    color=${compileColor(rectangle.color)},
                )`;
                break;
            case 'Clip':
                const clip = asset.assetItem as Clip;
                assetCode = `${assetName} = mv.layer.Video("${clip.path}")\n`;
                if (clip.from !== undefined && clip.to !== undefined) {
                    assetCode += `${assetName} = mv.trim(${assetName}, start_times=[${clip.from}], end_times=[${clip.to}])`;
                }
                else if (clip.to !== undefined){
                    assetCode += `${assetName} = mv.trim(${assetName}, start_times=[0.0], end_times=[${clip.to}])`;
                }
                else if (clip.from !== undefined){
                    assetCode += `${assetName}_duration = ${assetName}".duration"\n`;
                    assetCode += `${assetName} = mv.trim(${assetName}, start_times=[${clip.from}], end_times=[${assetName}_duration])`;
                }
                //there is no time limit, so we don't need to trim
                break;
        }

        fileNode.append(assetCode + '\n');
        assetMap.set(asset.name, assetName);
    });

    // Compile layers
    fileNode.append('\n# Define Layers\n');
    video.layers.forEach(layer => {
        const layerName = `layer_${layer.name}`;

        fileNode.append(`${layerName} = mv.layer.Composition(
    size=(1920, 1080),
    duration=${layer.timeSpan.duration}
)\n`);

        // Add compositions to the layer
        layer.composition.forEach(item => {
            const ref = item.ref;
            if (ref?.$type === 'AssetItem') {
                const asset = ref as AssetItem;
                const assetVarName = assetMap.get(asset.name);
                if (assetVarName) {
                    fileNode.append(`${layerName}.add_layer(${assetVarName})\n`);
                }
            } else if (ref?.$type === 'Layer') {
                const nestedLayer = ref as Layer;
                const nestedLayerName = `layer_${nestedLayer.name}`;
                fileNode.append(`${layerName}.add_layer(${nestedLayerName})\n`);
            }
        });
    });

    // Compile sequences
    fileNode.append('\n# Compose Sequences\n');
    video.timelines.forEach(timeline => {
        timeline.composition.forEach(sequence => {
            const seq = sequence.ref as Sequence;

            seq.composition.forEach(item => {
                const ref = item.ref;
                if (ref?.$type === 'Layer') {
                    const layer = ref as Layer;
                    const layerName = `layer_${layer.name}`;
                    fileNode.append(`scene.add_layer(${layerName})\n`);
                }
            });
        });
    });

    // Export video
    fileNode.append(`
# Export Video
scene.write_video('output.mp4')
    `);
}

function compileColor(color: String) {
    switch (color) {
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