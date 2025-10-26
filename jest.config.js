const {createDefaultPreset} = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: "./src",
    moduleFileExtensions: ["ts", "js", "json"],
    collectCoverageFrom: ['**/*.ts', '!**/index.ts'],
    transform: {
        ...tsJestTransformCfg,
    },
};