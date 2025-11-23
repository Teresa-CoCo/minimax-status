const axios = require('axios');
const vscode = require('vscode');

class MinimaxAPI {
  constructor(context) {
    this.context = context;
    this.token = null;
    this.groupId = null;
    this.loadConfig();
  }

  loadConfig() {
    const config = vscode.workspace.getConfiguration('minimaxStatus');
    this.token = config.get('token');
    this.groupId = config.get('groupId');
  }

  async getUsageStatus() {
    if (!this.token || !this.groupId) {
      throw new Error('请在设置中配置 MiniMax 访问令牌和组 ID');
    }

    try {
      const response = await axios.get(
        `https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`,
        {
          params: { GroupId: this.groupId },
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('无效的令牌或未授权。请检查您的凭据。');
      }
      throw new Error(`API 请求失败: ${error.message}`);
    }
  }

  parseUsageData(apiData) {
    if (!apiData.model_remains || apiData.model_remains.length === 0) {
      throw new Error('没有可用的使用数据');
    }

    const modelData = apiData.model_remains[0];
    const startTime = new Date(modelData.start_time);
    const endTime = new Date(modelData.end_time);

    // Calculate used percentage
    const totalTime = modelData.end_time - modelData.start_time;
    const usedTime = totalTime - modelData.remains_time;
    const usedPercentage = Math.round((usedTime / totalTime) * 100);

    // Calculate remaining time
    const remainingMs = modelData.remains_time;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      modelName: modelData.model_name,
      timeWindow: {
        start: startTime.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai',
          hour12: false
        }),
        end: endTime.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai',
          hour12: false
        }),
        timezone: 'UTC+8'
      },
      remaining: {
        hours,
        minutes,
        text: hours > 0 ? `${hours} 小时 ${minutes} 分钟后重置` : `${minutes} 分钟后重置`
      },
      usage: {
        used: modelData.current_interval_total_count - modelData.current_interval_usage_count,
        total: modelData.current_interval_total_count,
        percentage: usedPercentage
      }
    };
  }

  refreshConfig() {
    this.loadConfig();
  }
}

module.exports = MinimaxAPI;
