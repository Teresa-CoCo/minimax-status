const vscode = require('vscode');
const MinimaxAPI = require('./api');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('MiniMax Status 扩展已激活');

    const api = new MinimaxAPI(context);
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'minimaxStatus.refresh';
    statusBarItem.show();

    let intervalId;

    const updateStatus = async () => {
        try {
            const apiData = await api.getUsageStatus();
            const usageData = api.parseUsageData(apiData);
            updateStatusBar(statusBarItem, usageData);
        } catch (error) {
            console.error('获取状态失败:', error.message);
            statusBarItem.text = '$(warning) MiniMax';
            statusBarItem.tooltip = `错误: ${error.message}\n点击配置`;
            statusBarItem.color = new vscode.ThemeColor('errorForeground');
        }
    };

    const config = vscode.workspace.getConfiguration('minimaxStatus');
    const interval = config.get('refreshInterval', 30) * 1000;

    // Initial update
    updateStatus();

    // Set up interval
    intervalId = setInterval(updateStatus, interval);

    // Subscribe to configuration changes
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('minimaxStatus')) {
            api.refreshConfig();
            const newInterval = config.get('refreshInterval', 30) * 1000;
            clearInterval(intervalId);
            intervalId = setInterval(updateStatus, newInterval);
            updateStatus();
        }
    });

    // Subscribe to refresh command
    const refreshDisposable = vscode.commands.registerCommand('minimaxStatus.refresh', updateStatus);

    // Subscribe to setup command
    const setupDisposable = vscode.commands.registerCommand('minimaxStatus.setup', async () => {
        const token = await vscode.window.showInputBox({
            prompt: '请输入您的 MiniMax 访问令牌',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) return;

        const groupId = await vscode.window.showInputBox({
            prompt: '请输入您的 MiniMax 组 ID',
            ignoreFocusOut: true
        });

        if (!groupId) return;

        await config.update('token', token, vscode.ConfigurationTarget.Global);
        await config.update('groupId', groupId, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('MiniMax 凭据已保存');
        api.refreshConfig();
        updateStatus();
    });

    // Add to subscriptions
    context.subscriptions.push(
        statusBarItem,
        configChangeDisposable,
        refreshDisposable,
        setupDisposable
    );

    // Show setup message if credentials are missing
    if (!api.token || !api.groupId) {
        setTimeout(() => {
            vscode.window.showInformationMessage(
                'MiniMax Status 扩展需要配置令牌和组 ID',
                '立即配置'
            ).then((selection) => {
                if (selection === '立即配置') {
                    vscode.commands.executeCommand('minimaxStatus.setup');
                }
            });
        }, 2000);
    }
}

function updateStatusBar(statusBarItem, data) {
    const { usage, modelName, remaining } = data;

    // Set status bar text with color
    const percentage = usage.percentage;
    if (percentage < 60) {
        statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
    } else if (percentage < 85) {
        statusBarItem.color = new vscode.ThemeColor('problemsWarningIcon.foreground');
    } else {
        statusBarItem.color = new vscode.ThemeColor('errorForeground');
    }

    statusBarItem.text = `$(clock) ${modelName} ${percentage}%`;

    // Build tooltip
    const tooltip = [
        `模型: ${modelName}`,
        `使用进度: ${usage.percentage}% (${usage.used}/${usage.total})`,
        `剩余时间: ${remaining.text}`,
        `时间窗口: ${data.timeWindow.start}-${data.timeWindow.end}(${data.timeWindow.timezone})`,
        '',
        '点击刷新状态'
    ].join('\n');

    statusBarItem.tooltip = tooltip;
}

function deactivate() {
    console.log('MiniMax Status 扩展已停用');
}

module.exports = {
    activate,
    deactivate
};
