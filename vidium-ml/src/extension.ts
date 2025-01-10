import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node';
import { VisualizerDataProvider } from './visualizer/VisualizerDataProvider';
import { services } from './utils/utils';

let client: LanguageClient;

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    client = startLanguageClient(context);

    vscode.window.registerWebviewViewProvider(
        'vidiumML-Visualizer-view',
        new VisualizerDataProvider(context, services)
    );

}


// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language-server', 'main'));

    const debugOptions = { execArgv: ['--nolazy', `--inspect=${process.env.DEBUG_SOCKET || '6009'}`] };

    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.vml');
    context.subscriptions.push(fileSystemWatcher);

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'vidium-ml' }],
        synchronize: {
            fileEvents: fileSystemWatcher
        }
    };

    const client = new LanguageClient(
        'vidium-ml',
        'VidiumMl',
        serverOptions,
        clientOptions
    );

    client.start();
    return client;
}
