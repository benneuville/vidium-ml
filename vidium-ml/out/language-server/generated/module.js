"use strict";
/******************************************************************************
 * This file was generated by langium-cli 1.0.0.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArduinoMlGeneratedModule = exports.ArduinoMlGeneratedSharedModule = exports.ArduinoMlLanguageMetaData = void 0;
const ast_1 = require("./ast");
const grammar_1 = require("./grammar");
exports.ArduinoMlLanguageMetaData = {
    languageId: 'arduino-ml',
    fileExtensions: ['.aml'],
    caseInsensitive: false
};
exports.ArduinoMlGeneratedSharedModule = {
    AstReflection: () => new ast_1.ArduinoMlAstReflection()
};
exports.ArduinoMlGeneratedModule = {
    Grammar: () => (0, grammar_1.ArduinoMlGrammar)(),
    LanguageMetaData: () => exports.ArduinoMlLanguageMetaData,
    parser: {}
};
//# sourceMappingURL=module.js.map