const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk").default;

// 创建 HTTPS Agent 配置
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 10000,
  servername: 'minimaxi.com'
});

class MinimaxAPI {
  constructor() {
    this.token = null;
    this.groupId = null;
    this.configPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      ".minimax-config.json"
    );
    this.cache = {
      data: null,
      timestamp: 0,
    };
    this.cacheTimeout = 8000; // 8秒缓存
    this.loadConfig();
  }

  loadConfig() {
    try {
      // 只从独立的 config 文件读取
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
        this.token = config.token;
        this.groupId = config.groupId;
      }
    } catch (error) {
      console.error("Failed to load config:", error.message);
    }
  }

  saveConfig() {
    try {
      // 保存到独立的 config 文件
      const config = {
        token: this.token,
        groupId: this.groupId,
      };
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Failed to save config:", error.message);
    }
  }

  setCredentials(token, groupId) {
    this.token = token;
    this.groupId = groupId;
    this.saveConfig();
  }

  async getUsageStatus(forceRefresh = false) {
    if (!this.token || !this.groupId) {
      throw new Error(
        'Missing credentials. Please run "minimax-status auth <token> <groupId>" first'
      );
    }

    // 检查缓存
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cache.data &&
      now - this.cache.timestamp < this.cacheTimeout
    ) {
      return this.cache.data;
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
          timeout: 10000, // 10秒超时
          httpsAgent, // 添加 HTTPS Agent 配置
        }
      );

      // 更新缓存
      this.cache.data = response.data;
      this.cache.timestamp = now;

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error(
          "Invalid token or unauthorized. Please check your credentials."
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error(
          "Request timeout. Please check your network connection."
        );
      } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        throw new Error(
          "Network error. Please check your internet connection."
        );
      }
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async getSubscriptionDetails() {
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
          timeout: 10000,
          httpsAgent, // 添加 HTTPS Agent 配置
        }
      );

      return response.data;
    } catch (error) {
      // 如果订阅 API 失败，静默返回 null
      return null;
    }
  }

  // 清除缓存
  clearCache() {
    this.cache = {
      data: null,
      timestamp: 0,
    };
  }

  parseUsageData(apiData, subscriptionData) {
    if (!apiData.model_remains || apiData.model_remains.length === 0) {
      throw new Error("No usage data available");
    }

    const modelData = apiData.model_remains[0];
    const startTime = new Date(modelData.start_time);
    const endTime = new Date(modelData.end_time);

    // Calculate counts
    // 注意：current_interval_usage_count 实际是剩余次数，不是已用次数
    const remainingCount = modelData.current_interval_usage_count;
    const usedCount = modelData.current_interval_total_count - remainingCount;

    // Calculate percentage - 基于已使用次数的百分比
    const usedPercentage = Math.round(
      (usedCount / modelData.current_interval_total_count) * 100
    );

    // Calculate remaining time in human-readable format
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

    // 上下文窗口信息
    // 默认上下文窗口大小 (200K tokens)
    const defaultContextSize = 200000;
    const contextWindow = {
      total: defaultContextSize,
      used: 0,
      percentage: 0,
      totalFormatted: "200K",
      usedFormatted: "0K",
    };

    return {
      modelName: modelData.model_name,
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
        used: usedCount, // 修复：显示已使用次数，不是剩余次数
        remaining: remainingCount, // 新增：剩余次数
        total: modelData.current_interval_total_count,
        percentage: usedPercentage,
      },
      contextWindow,
      expiry: expiryInfo,
    };
  }
}

module.exports = MinimaxAPI;
