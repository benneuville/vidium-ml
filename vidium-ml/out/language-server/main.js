"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const langium_1 = require("langium");
const node_1 = require("langium/node");
const node_2 = require("vscode-languageserver/node");
const vidium_ml_module_1 = require("./vidium-ml-module");
// Create a connection to the client
const connection = (0, node_2.createConnection)(node_2.ProposedFeatures.all);
// Inject the shared services and language-specific services
const { shared } = (0, vidium_ml_module_1.createVidiumMLServices)(Object.assign({ connection }, node_1.NodeFileSystem));
// Start the language server with the shared services
(0, langium_1.startLanguageServer)(shared);
//# sourceMappingURL=main.js.map