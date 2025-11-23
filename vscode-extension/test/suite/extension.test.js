const assert = require('assert');
const vscode = require('vscode');
const { activate, deactivate } = require('../extension');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('运行所有测试.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('JochenYang.minimax-status-vscode'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('JochenYang.minimax-status-vscode');
        await extension.activate();
        assert.ok(extension.isActive);
    });

    test('Should register commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('minimaxStatus.refresh'));
        assert.ok(commands.includes('minimaxStatus.setup'));
    });

    test('Should create status bar item', async () => {
        const statusBarItems = vscode.window.statusBarItems;
        let foundStatusBarItem = false;

        for (const item of statusBarItems) {
            if (item.text && item.text.includes('MiniMax')) {
                foundStatusBarItem = true;
                break;
            }
        }

        assert.ok(foundStatusBarItem, 'Status bar item should be created');
    });
});
