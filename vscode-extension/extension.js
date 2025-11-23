const vscode = require('vscode');
const MinimaxAPI = require('./api');

// Create settings webview
function showSettingsWebView(context, api, updateStatus) {
    const panel = vscode.window.createWebviewPanel(
        'minimaxSettings',
        'MiniMax Status 设置',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    // Get current configuration
    const config = vscode.workspace.getConfiguration('minimaxStatus');
    const currentToken = config.get('token') || '';
    const currentGroupId = config.get('groupId') || '';
    const currentInterval = config.get('refreshInterval') || 30;
    const currentShowTooltip = config.get('showTooltip') ?? true;

    // Create HTML content
    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MiniMax Status 设置</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                padding: 0;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
            }
            h1 {
                color: var(--vscode-editor-foreground);
                border-bottom: 2px solid var(--vscode-panel-border);
                padding-bottom: 10px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: var(--vscode-foreground);
            }
            input[type="text"],
            input[type="password"],
            input[type="number"] {
                width: 100%;
                padding: 10px;
                border: 1px solid var(--vscode-input-border, #3c3c3c);
                border-radius: 4px;
                background-color: var(--vscode-input-background, #1e1e1e);
                color: var(--vscode-input-foreground, #cccccc);
                font-size: 14px;
            }
            input:focus {
                outline: none;
                border-color: var(--vscode-focusBorder, #007fd4);
            }
            .hint {
                font-size: 12px;
                color: var(--vscode-descriptionForeground, #999);
                margin-top: 5px;
            }
            .checkbox-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            button {
                background-color: var(--vscode-button-background, #0e639c);
                color: var(--vscode-button-foreground, #ffffff);
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground, #1177bb);
            }
            .error {
                color: #f44747;
                font-size: 12px;
                margin-top: 5px;
            }
            .success {
                color: #4ec9b0;
                font-size: 14px;
                margin-top: 10px;
                padding: 10px;
                background-color: rgba(78, 201, 176, 0.1);
                border-radius: 4px;
                display: none;
            }
            .link {
                color: var(--vscode-textLink-foreground, #3794ff);
                text-decoration: none;
            }
            .link:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔧 MiniMax Status 设置</h1>

            <div class="form-group">
                <label for="token">API 访问令牌 (API Key)</label>
                <input type="password" id="token" value="${currentToken}" placeholder="请输入 API Key" />
                <div class="hint">
                    从 <a href="https://platform.minimaxi.com/user-center/payment/coding-plan" target="_blank" class="link">MiniMax 开放平台</a> 获取
                </div>
                <div class="error" id="token-error"></div>
            </div>

            <div class="form-group">
                <label for="groupId">组 ID (GroupID)</label>
                <input type="text" id="groupId" value="${currentGroupId}" placeholder="请输入 GroupID" />
                <div class="hint">
                    在用户中心或账户信息页面找到
                </div>
                <div class="error" id="groupId-error"></div>
            </div>

            <div class="form-group">
                <label for="interval">刷新间隔（秒）</label>
                <input type="number" id="interval" value="${currentInterval}" min="10" max="300" />
                <div class="hint">建议 10-30 秒</div>
            </div>

            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="showTooltip" ${currentShowTooltip ? 'checked' : ''} />
                    <label for="showTooltip" style="margin: 0;">显示详细提示信息</label>
                </div>
            </div>

            <button onclick="saveSettings()">保存设置</button>
            <button onclick="cancel()" style="background-color: #6c757d; margin-left: 10px;">取消</button>

            <div class="success" id="success-message">✅ 设置已保存！</div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function saveSettings() {
                const token = document.getElementById('token').value.trim();
                const groupId = document.getElementById('groupId').value.trim();
                const interval = parseInt(document.getElementById('interval').value);
                const showTooltip = document.getElementById('showTooltip').checked;

                // Clear previous errors
                document.getElementById('token-error').textContent = '';
                document.getElementById('groupId-error').textContent = '';

                // Validate inputs
                let hasError = false;
                if (!token) {
                    document.getElementById('token-error').textContent = 'API Key 不能为空';
                    hasError = true;
                }

                if (!groupId) {
                    document.getElementById('groupId-error').textContent = 'GroupID 不能为空';
                    hasError = true;
                }

                if (hasError) {
                    return;
                }

                // Send data to extension
                vscode.postMessage({
                    command: 'saveSettings',
                    data: {
                        token,
                        groupId,
                        interval,
                        showTooltip
                    }
                });

                // Show success message
                document.getElementById('success-message').style.display = 'block';
                setTimeout(() => {
                    vscode.postMessage({ command: 'close' });
                }, 1500);
            }

            function cancel() {
                vscode.postMessage({ command: 'close' });
            }

            // Listen for messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'close') {
                    panel.dispose();
                }
            });
        </script>
    </body>
    </html>
    `;

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
        message => {
            if (message.command === 'saveSettings') {
                const { token, groupId, interval, showTooltip } = message.data;

                // Update configuration
                config.update('token', token, vscode.ConfigurationTarget.Global);
                config.update('groupId', groupId, vscode.ConfigurationTarget.Global);
                config.update('refreshInterval', interval, vscode.ConfigurationTarget.Global);
                config.update('showTooltip', showTooltip, vscode.ConfigurationTarget.Global);

                // Refresh API and update status
                api.refreshConfig();
                updateStatus();
            } else if (message.command === 'close') {
                panel.dispose();
            }
        },
        undefined,
        context.subscriptions
    );
}

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
        const panel = showSettingsWebView(context, api, updateStatus);
        context.subscriptions.push(panel);
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
        statusBarItem.text = '⚙️ MiniMax: 需要配置';
        statusBarItem.color = new vscode.ThemeColor('warningForeground');
        statusBarItem.tooltip = 'MiniMax Status 需要配置 Token 和 GroupId\n点击立即配置';
        statusBarItem.command = 'minimaxStatus.setup'; // 关键修复：点击状态栏打开设置

        setTimeout(() => {
            vscode.window.showInformationMessage(
                '🎉 欢迎使用 MiniMax Status！\n\n需要配置您的访问令牌和组 ID 才能开始使用。',
                '立即配置',
                '稍后设置'
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

    // 关键修复：设置状态栏命令为刷新
    statusBarItem.command = 'minimaxStatus.refresh';

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
