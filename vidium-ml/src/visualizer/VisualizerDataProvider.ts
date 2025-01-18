import * as vscode from 'vscode';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { VidiumMLServices } from '../language-server/vidium-ml-module';
import { extractAstNode } from '../cli/cli-util';
import { Video } from '../language-server/generated/ast';
import { VisualizerVideoBuilder } from './VisualizerVideoBuilder';
import { VisualizerErrorMessager, VisualizerMessager, VisualizerValidationMessager, VisualizerInfoPythonMessager } from './VisualizerMessager';
import fs from "fs";


const execPromise = promisify(exec);

export class VisualizerDataProvider implements vscode.WebviewViewProvider, VisualizerProviderInterface {
    private _webviewView?: vscode.WebviewView;
    private _lastOpenedFile?: vscode.Uri;
    private _isLocked = false;
    private _lockedFile?: vscode.Uri;
    private _videoData: Video | undefined;
    private _visualizerBuilder = new VisualizerVideoBuilder();
    private _zoomValue = 100;
    private _isGenerating = false;
    private _message?: VisualizerMessager;

    constructor(private readonly context: vscode.ExtensionContext, private services : VidiumMLServices) {
    }

    async makeVideo(filepath:string) {
        // log content of the file at path
        this._videoData = await extractAstNode<Video>(filepath, this.services);
    }

    async updateView(): Promise<void> {
        await this.updateWebviewContent();
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) : Promise<void> {
        this._webviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };

        // Initial content
        this.updateWebviewContent();

        // Handle messages from the WebView
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'toggleLock') {
                this._isLocked = !this._isLocked;
                if (!this._isLocked) {
                    this._lockedFile = undefined; // Reset locked file
                }
                else {
                    this._lockedFile = this._lastOpenedFile; // Lock to last opened file
                }
                this.updateWebviewContent();
            } else if (message.command === 'selectFile') {
                const selectedFileUri = vscode.Uri.parse(message.fileUri);
                this._isLocked = true;
                this._lockedFile = selectedFileUri;
                this.updateWebviewContent();
            } else if (message.command === 'zoomIn') {
                this._zoomValue = Math.min(220, this._zoomValue + 10);
                this.updateWebviewContent();
            } else if (message.command === 'zoomOut') {
                this._zoomValue = Math.max(5, this._zoomValue - 10);
                this.updateWebviewContent();
            } else if (message.command === 'generateVideo') {
                if(this._lastOpenedFile) {
                    await this.generateVideo(this._lastOpenedFile);
                }
            } else if (message.command === 'uploadYoutube') {
                console.log('Uploading to YouTube...');
                //TODO: Implement YouTube upload
            }
        });

        vscode.window.onDidChangeActiveTextEditor(async (e) => {
            const doc = e?.document.uri.fsPath;
            if(doc?.endsWith('.vml')) {
                await this.makeVideo(doc);
                await this.updateWebviewContent();
            }

        }, this, this.context.subscriptions);

        vscode.workspace.onDidChangeTextDocument(async (e) => {
            const doc = e.document.uri.fsPath;
            if(doc.endsWith('.vml')) {
                await this.makeVideo(doc);
                await this.updateWebviewContent();
            }
        }, this, this.context.subscriptions);

    }

    private async generateVideo(path: vscode.Uri): Promise<void> {
        console.log('Generating video...');
        
        // Répertoire de travail
        process.chdir("../../");
        const root = __dirname.replace("\\", '/') + '/../../';
        const cli = __dirname.replace("\\", '/') + '/../../bin/cli';
        const vid_py = (process.platform === "win32") ?
            __dirname.replace("\\", '/') + '/../../generated/' + path.fsPath.split('\\').pop()!.split('.').shift() + '.py'
            : __dirname + '/../../generated/' + path.fsPath.split('/').pop()!.split('.').shift() + '.py';
        this._isGenerating = true;
        await this.updateWebviewContent();
    
        // Options pour exec
        const options = { cwd: __dirname.replace("\\", '/') + '/../../' };
    
        try {
            // Commande pour générer la vidéo
            console.log(`Running: node ${cli} generate ${path.fsPath}`);
            const cliOutput = await execPromise(`node ${cli} generate ${path.fsPath}`, options);
            console.log(`CLI stdout: ${cliOutput.stdout}`);
            console.error(`CLI stderr: ${cliOutput.stderr}`);
            this._message = new VisualizerInfoPythonMessager("Python file for " + this._videoData!.name + " video generated successfully");
            await this.updateWebviewContent();
        } catch (error: any) {
            console.error(`Error during CLI execution: ${error.message}`);
            this._message = new VisualizerErrorMessager(this._videoData!.name);
            this._isGenerating = false;
            await this.updateWebviewContent();
            return;
        }
    
        try {
            // Commande pour exécuter le script Python
            console.log(`Running: py ${vid_py}`);
            console.log("  ee");
            const pythonExecutable = await this.getPythonExe();
            await this.installMovis(pythonExecutable, root);
            const pythonOutput = await execPromise(`${pythonExecutable} ${vid_py}`, options);
            console.log(`Python stdout: ${pythonOutput.stdout}`);
            console.error(`Python stderr: ${pythonOutput.stderr}`);
            this._message = new VisualizerValidationMessager(this._videoData!.name);
        } catch (error: any) {
            console.error(`Error during Python execution: ${error.message}`);
            this._message = new VisualizerErrorMessager(this._videoData!.name);
        }
    
        this._isGenerating = false;
        await this.updateWebviewContent();
    }

    private async getPythonExe(): Promise<string> {
        const root = __dirname.replace("\\", '/') + '/../../';
        const vmlEnv = root + 'vmlenv';
        if (!fs.existsSync(vmlEnv)) {
            console.log('Creating vmlenv...');
            await execPromise('py -m venv vmlenv', { cwd: root });
        }
        const pythonExecutable = process.platform === 'win32'
            ? vmlEnv + '/Scripts/python.exe'  // Windows
            : vmlEnv + '/bin/python';         // Linux/macOS

        return pythonExecutable;
    }

    private async installMovis(pythonExecutable : string, root: string) {
        console.log('Checking if "movis" is installed...');
        try {
            await execPromise(`${pythonExecutable} -m pip show movis`, { cwd: root });
            console.log('Movis is already installed.');
        } catch (error) {
            console.log('Installing "movis"...');
            await execPromise(`${pythonExecutable} -m pip install movis`, { cwd: root });
        }
    }

    private async updateWebviewContent(): Promise<void> {

        console.log('Updating WebView content...');
        if (!this._webviewView) {
            return;
        }

        let fileToDisplay: vscode.Uri | undefined;
    
        try {
            // Si le mode "lock" est activé, afficher le fichier verrouillé
            if (this._isLocked && this._lockedFile) {
                fileToDisplay = this._lockedFile;
            } else {
                // Obtenir l'éditeur actif
                const activeEditor = vscode.window.activeTextEditor;
                const activeFileUri = activeEditor?.document.uri;
    
                if (activeFileUri?.fsPath.endsWith('.vml')) {
                    // Si l'éditeur actif est un fichier .vml
                    fileToDisplay = activeFileUri;
                    this._lastOpenedFile = fileToDisplay; // Mémoriser le dernier fichier .vml ouvert
                } else if (this._lastOpenedFile) {
                    // Si aucun fichier .vml actif, utiliser le dernier fichier ouvert
                    fileToDisplay = this._lastOpenedFile;
                }
            }

            // Lire le contenu du fichier sélectionné

            const fileOptions = await this.dropdownOptions(fileToDisplay);

            if(fileToDisplay) {
                await this.makeVideo(fileToDisplay.fsPath);
                const content = await this._visualizerBuilder.build(this._videoData, this._zoomValue);
                this._webviewView.webview.html = this.getWebviewContent(content, fileOptions);
            }
            else {
                this._webviewView.webview.html = this.getWebviewContent(`<p>No .vml file to display</p>`, fileOptions);
            }
    
    
        } catch (error) {
            console.error('Error updating WebView content:', error);
            this._webviewView.webview.html = this.getWebviewContent(`<p>Error displaying file</p>`);
        }
    }

    private async dropdownOptions(fileToDisplay : vscode.Uri | undefined): Promise<string> {
        
        let files = await vscode.workspace.findFiles('**/*.vml');
        files = files.sort((a, b) => {
            return a.fsPath.localeCompare(b.fsPath);
        });

        let fileOptions = '';

        if(files.length > 0) {

            if (!fileToDisplay) {
                fileOptions = `<option value="" disabled selected>Select a file to display</option>`;
            }

            fileOptions += files.map((file) => {
                const isSelected = file.fsPath === fileToDisplay?.fsPath;
                return `<option value="${file.toString()}" ${isSelected ? 'selected' : ''}>${path.basename(file.fsPath)}</option>`;
            }).join('');
        }
        else {
            fileOptions = `<option value="" disabled selected>No .vml files available</option>`;
        }

        return fileOptions;
    }
    

    private getWebviewContent(content: string, fileOptions: string = ''): string {
        console.log('Getting WebView content...');
        const styleUri = this._webviewView?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'src', 'visualizer', 'style.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VidiumML Visualizer</title>
            <style>
                ${this._visualizerBuilder.getRootVariableCSS()}
            </style>
            <link href="${styleUri}" rel="stylesheet">
        </head>
        <body>
            <div class="controls">
                <div class="left-ctrl">
                    <div class="zoom" id="zoom">
                        <button id="zoom_in">+</button> 
                        <div id="zoom_value">${this._zoomValue}%</div>
                        <button id="zoom_out">-</button> 
                    </div>
                </div>
                <div class="right-ctrl">
                    <div class="file-dropdown">
                        <button id="lockButton">${this._isLocked ? '🔒' : '🔓'}</button>
                        <select id="fileDropdown" style="${this._lastOpenedFile || this._lockedFile ? '' : 'color: #ccc;'}">
                            ${fileOptions}
                        </select>
                    </div>
                </div>
            </div>
            <div class="visualizer">
                ${content}
            </div>
            
            <div class="generator_section">
                <button class="generate_video" id="generate_handler" ${this._isGenerating ? 'disabled' : ''}> ${!this._isGenerating ? 'Generate ▲' : ' Loading ...'}</button>
                <div id="generate_type" class="disabled">
                    <button id="generate_video" class="generate_v">Generate Video</button>
                    <button id="upload_youtube" class="generate_v">Generate & Upload Youtube</button>
                </div>
            </div>
            ${this._message ? this._message.getMessage() : ''}
            <script>
                const vscode = acquireVsCodeApi();
                let generateShown = false;
                
                function showGenerate() {
                    if(!generateShown) {
                        document.getElementById('generate_type').classList.add('disabled');
                        document.getElementById('generate_handler').innerHTML = 'Generate ▲';
                    }
                    else {
                        document.getElementById('generate_type').classList.remove('disabled');
                        document.getElementById('generate_handler').innerHTML = 'Generate ▼';
                    }
                }

                document.getElementById('lockButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'toggleLock' });
                });
                document.getElementById('fileDropdown').addEventListener('change', (event) => {
                    vscode.postMessage({ command: 'selectFile', fileUri: event.target.value });
                });
                document.getElementById('zoom_in').addEventListener('click', () => {
                    vscode.postMessage({ command: 'zoomIn' });
                });
                document.getElementById('zoom_out').addEventListener('click', () => {
                    vscode.postMessage({ command: 'zoomOut' });
                });
                document.getElementById('generate_video').addEventListener('click', () => {
                    vscode.postMessage({ command: 'generateVideo' });
                    generateShown = false;
                    showGenerate();
                });
                document.getElementById('upload_youtube').addEventListener('click', () => {
                    vscode.postMessage({ command: 'uploadYoutube' });
                    generateShown = false;
                    showGenerate();
                });
                document.getElementById('generate_handler').addEventListener('click', () => {
                    generateShown = !generateShown;
                    showGenerate();
                });

            </script>
        </body>
        </html>`;
    }
}
