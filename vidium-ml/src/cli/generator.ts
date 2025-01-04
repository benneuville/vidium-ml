import fs from 'fs';
import {CompositeGeneratorNode, toString} from 'langium';
import path from 'path';
import {AssetCreation, Document, Pipeline, Template} from '../language-server/generated/ast';
import {extractDestinationAndName} from './cli-util';
import {compileAssetCreation} from "./compilers/AssetCreationCompiler";
import {compilePipeline} from "./compilers/PipelineCompiler";
import {compileTemplate} from "./compilers/TemplateCompiler";

export function generatePythonFile(document: Document, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.py`;

    const fileNode = new CompositeGeneratorNode();

    switch (document.$type) {
        case 'AssetCreation': {
            compileAssetCreation(document as AssetCreation, fileNode);
            break;
        }
        case 'Pipeline': {
            compilePipeline(document as Pipeline, fileNode);
            break;
        }
        case 'Template': {
            compileTemplate(document as Template, fileNode);
            break;
        }
        default: {
            throw new Error(`Unexpected root node type`);
        }
    }



    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, {recursive: true});
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));
    return generatedFilePath;
}

