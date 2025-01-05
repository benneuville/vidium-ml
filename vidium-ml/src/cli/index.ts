import chalk from 'chalk';
import { Command } from 'commander';
import { VidiumMLLanguageMetaData } from '../language-server/generated/module';
import { createVidiumMLServices } from '../language-server/vidium-ml-module';
import { extractAstNode } from './cli-util';
import { generatePythonFile } from './generator';
import { NodeFileSystem } from 'langium/node';
import {Video} from "../language-server/generated/ast";

export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createVidiumMLServices(NodeFileSystem).VidiumML;
    const document = await extractAstNode<Video>(fileName, services);
    const generatedFilePath = generatePythonFile(document, fileName, opts.destination);
    console.log(chalk.green(`Python code generated successfully: ${generatedFilePath}`));
};

export type GenerateOptions = {
    destination?: string;
}

export default function(): void {
    const program = new Command();

    program
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version);

    const fileExtensions = VidiumMLLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
        .action(generateAction);

    program.parse(process.argv);
}
