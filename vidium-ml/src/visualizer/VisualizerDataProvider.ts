import * as vscode from 'vscode';
import * as path from 'path';
import { VidiumMLServices } from '../language-server/vidium-ml-module';
import { extractAstNode } from '../cli/cli-util';
import { Video } from '../language-server/generated/ast';


export class VisualizerDataProvider implements vscode.WebviewViewProvider, VisualizerProviderInterface {
    private _webviewView?: vscode.WebviewView;
    private _lastOpenedFile?: vscode.Uri;
    private _isLocked = false;
    private _lockedFile?: vscode.Uri;
    private _videoData: Video | undefined;

    constructor(private readonly context: vscode.ExtensionContext, private services : VidiumMLServices) {
    }

    private async makeVideo(filepath:string) {
        this._videoData = await extractAstNode<Video>(filepath, this.services);
    }

    updateView() {
        this.updateWebviewContent();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
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
            }
        });

        // Watch for active editor changes
        vscode.window.onDidChangeActiveTextEditor(() => this.updateWebviewContent(), this, this.context.subscriptions);

        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.vml');
        watcher.onDidChange(() => this.updateWebviewContent());
        watcher.onDidCreate(() => this.updateWebviewContent());
        watcher.onDidDelete(() => this.updateWebviewContent());
        this.context.subscriptions.push(watcher);
    }

    private async updateWebviewContent(): Promise<void> {

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
                const content = this._videoData?.elements || [];
                let contentString = '';
                for (let i = 0; i < content.length; i++) {
                    console.log(content[i]);
                    contentString += content[i].$type + '\n';
                }
                this._webviewView.webview.html = this.getWebviewContent(contentString, fileOptions);
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
        
        const files = await vscode.workspace.findFiles('**/*.vml');

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
        const styleUri = this._webviewView?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'src', 'visualizer', 'style.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VidiumML Visualizer</title>
            <link href="${styleUri}" rel="stylesheet">
        </head>
        <body>
            <div class="controls">
                <!--
                <button id="lockButton">${this._isLocked ? '🔒' : '🔓'}</button>
                <select id="fileDropdown" style="${this._lastOpenedFile || this._lockedFile ? '' : 'color: #ccc;'}">
                    ${fileOptions}
                </select>
                -->
            </div>
            <pre>${content}</pre>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('lockButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'toggleLock' });
                });
                document.getElementById('fileDropdown').addEventListener('change', (event) => {
                    vscode.postMessage({ command: 'selectFile', fileUri: event.target.value });
                });
            </script>
        </body>
        </html>`;
    }
}
