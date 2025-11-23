#!/usr/bin/env node

const MinimaxAPI = require('./api');
const chalk = require('chalk').default;
const fs = require('fs');
const path = require('path');

class PromptStatus {
  constructor() {
    this.api = new MinimaxAPI();
  }

  async loadSettings() {
    // Try to load from settings.json in various locations
    const possiblePaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'settings.json'),
      path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'claude', 'settings.json'),
      path.join(process.cwd(), '.claude-settings.json'),
      path.join(process.cwd(), '.claude', 'settings.json'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (settings.minimaxToken && settings.minimaxGroupId) {
            this.api.setCredentials(settings.minimaxToken, settings.minimaxGroupId);
            return settings.minimaxStatus || {};
          }
        } catch (error) {
          console.error(`Failed to read settings from ${configPath}:`, error.message);
        }
      }
    }

    return {};
  }

  async getPromptStatus(mode = 'compact') {
    try {
      await this.loadSettings();
      const apiData = await this.api.getUsageStatus();
      const usageData = this.api.parseUsageData(apiData);

      if (mode === 'compact') {
        return this.renderCompact(usageData);
      } else if (mode === 'minimal') {
        return this.renderMinimal(usageData);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  renderMinimal(data) {
    const { usage } = data;
    const percentage = usage.percentage;

    let color = chalk.green;
    if (percentage >= 85) {
      color = chalk.red;
    } else if (percentage >= 60) {
      color = chalk.yellow;
    }

    return color(`[MM:${percentage}%]`);
  }

  renderCompact(data) {
    const { usage, remaining, modelName } = data;
    const percentage = usage.percentage;

    let color = chalk.green;
    if (percentage >= 85) {
      color = chalk.red;
    } else if (percentage >= 60) {
      color = chalk.yellow;
    }

    const status = percentage >= 85 ? '⚠' : percentage >= 60 ? '⚡' : '✓';
    const remainingText = remaining.hours > 0
      ? `${remaining.hours}h${remaining.minutes}m`
      : `${remaining.minutes}m`;

    return `${color('●')} ${modelName} ${color(percentage + '%')} ${remainingText} ${status}`;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--minimal') ? 'minimal' : 'compact';

  const prompt = new PromptStatus();
  const output = await prompt.getPromptStatus(mode);

  if (output) {
    console.log(output);
  } else {
    // Silent mode - no output if not configured
  }
}

if (require.main === module) {
  main().catch(error => {
    // Silent fail for prompt integration
    process.exit(0);
  });
}

module.exports = PromptStatus;
