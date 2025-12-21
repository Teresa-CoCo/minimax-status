const axios = require("axios");
const https = require("https");
const vscode = require("vscode");

// Add HTTPS Agent configuration
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 10000,
  servername: "minimaxi.com",
});

class MinimaxAPI {
  constructor(context) {
    this.context = context;
    this.token = null;
    this.groupId = null;
    this.loadConfig();
  }

  loadConfig() {
    const config = vscode.workspace.getConfiguration("minimaxStatus");
    this.token = config.get("token");
    this.groupId = config.get("groupId");
    this.selectedModelName = config.get("modelName");
  }

  async getUsageStatus() {
    if (!this.token || !this.groupId) {
      throw new Error("请在设置中配置 MiniMax 访问令牌和组 ID");
    }

    try {
      const response = await axios.get(
        `https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`,
        {
          params: { GroupId: this.groupId },
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/json",
          },
          httpsAgent: httpsAgent, // Add HTTPS Agent configuration
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("无效的令牌或未授权。请检查您的凭据。");
      }
      throw new Error(`API 请求失败: ${error.message}`);
    }
  }

  async getSubscriptionDetails() {
    if (!this.token || !this.groupId) {
      throw new Error("请在设置中配置 MiniMax 访问令牌和组 ID");
    }

    try {
      const response = await axios.get(
        `https://www.minimaxi.com/v1/api/openplatform/charge/combo/cycle_audio_resource_package`,
        {
          params: {
            biz_line: 2,
            cycle_type: 1,
            resource_package_type: 7,
            GroupId: this.groupId,
          },
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/json",
          },
          httpsAgent: httpsAgent, // Add HTTPS Agent configuration
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("无效的令牌或未授权。请检查您的凭据。");
      }
      throw new Error(`API 请求失败: ${error.message}`);
    }
  }

  parseUsageData(apiData, subscriptionData) {
    if (!apiData.model_remains || apiData.model_remains.length === 0) {
      throw new Error("没有可用的使用数据");
    }

    // Parse all available models
    const allModels = apiData.model_remains.map((m) => ({
      name: m.model_name,
      startTime: new Date(m.start_time),
      endTime: new Date(m.end_time),
      usage: m.current_interval_total_count - m.current_interval_usage_count,
      total: m.current_interval_total_count,
      remainingMs: m.remains_time,
    }));

    // Select the model based on user selection or default to the first model
    let selectedModel;
    if (this.selectedModelName) {
      selectedModel = allModels.find((m) => m.name === this.selectedModelName);
      if (!selectedModel) {
        // If the selected model cannot be found, the first one is used.
        selectedModel = allModels[0];
      }
    } else {
      selectedModel = allModels[0];
    }

    const modelData =
      apiData.model_remains.find((m) => m.model_name === selectedModel.name) ||
      apiData.model_remains[0];
    const startTime = new Date(modelData.start_time);
    const endTime = new Date(modelData.end_time);

    // Calculate used percentage based on usage count
    const used =
      modelData.current_interval_total_count -
      modelData.current_interval_usage_count;
    const total = modelData.current_interval_total_count;
    const usedPercentage = Math.round((used / total) * 100);

    // Calculate remaining time
    const remainingMs = modelData.remains_time;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    // Parse subscription expiry date if available
    let expiryInfo = null;
    if (
      subscriptionData &&
      subscriptionData.current_subscribe &&
      subscriptionData.current_subscribe.current_subscribe_end_time
    ) {
      const expiryDate =
        subscriptionData.current_subscribe.current_subscribe_end_time;
      const expiry = new Date(expiryDate);
      const now = new Date();

      // Calculate days until expiry
      const timeDiff = expiry.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      expiryInfo = {
        date: expiryDate,
        daysRemaining: daysDiff,
        text:
          daysDiff > 0
            ? `还剩 ${daysDiff} 天`
            : daysDiff === 0
            ? "今天到期"
            : `已过期 ${Math.abs(daysDiff)} 天`,
      };
    }

    return {
      modelName: modelData.model_name,
      allModels: allModels.map((m) => m.name),
      timeWindow: {
        start: startTime.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Shanghai",
          hour12: false,
        }),
        end: endTime.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Shanghai",
          hour12: false,
        }),
        timezone: "UTC+8",
      },
      remaining: {
        hours,
        minutes,
        text:
          hours > 0
            ? `${hours} 小时 ${minutes} 分钟后重置`
            : `${minutes} 分钟后重置`,
      },
      usage: {
        used:
          modelData.current_interval_total_count -
          modelData.current_interval_usage_count,
        total: modelData.current_interval_total_count,
        percentage: usedPercentage,
      },
      expiry: expiryInfo,
    };
  }

  refreshConfig() {
    this.loadConfig();
  }
}

module.exports = MinimaxAPI;
