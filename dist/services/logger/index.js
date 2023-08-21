"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const chalk_1 = __importDefault(require("chalk"));
const colorText = (type, text) => {
    switch (type) {
        case 'error':
            return chalk_1.default.red(text);
        case 'info':
            return chalk_1.default.blue(text);
        case 'success':
            return chalk_1.default.green(text);
    }
};
function log(type, content) {
    console.log(`- ${colorText(type, type)} ${content}`);
}
exports.log = log;
//# sourceMappingURL=index.js.map