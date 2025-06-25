require('dotenv').config();
const { exec } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const CLAUDE_MAX_COST = 200; // $200 Claude Max subscription

// Load Slack configuration
let slackWorkspaces = [];
if (process.env.SLACK_WORKSPACES) {
  try {
    slackWorkspaces = JSON.parse(process.env.SLACK_WORKSPACES);
    console.log(`✅ Loaded ${slackWorkspaces.length} workspace(s) from SLACK_WORKSPACES`);
  } catch (error) {
    console.error('❌ Failed to parse SLACK_WORKSPACES JSON:', error.message);
    process.exit(1);
  }
} else if (process.env.SLACK_TOKEN) {
  // Legacy single workspace support
  slackWorkspaces = [{
    name: 'default',
    token: process.env.SLACK_TOKEN
  }];
  console.log('✅ Using legacy SLACK_TOKEN for single workspace');
} else {
  console.error('❌ Either SLACK_TOKEN or SLACK_WORKSPACES environment variable is required');
  process.exit(1);
}

// Load messages configuration
const messagesPath = path.join(__dirname, 'messages.json');
let messagesConfig = {};

// Load and validate messages configuration
try {
  messagesConfig = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
  console.log('✅ Loaded messages configuration');
  
  // Validate required fields
  if (!messagesConfig.comparisons || !Array.isArray(messagesConfig.comparisons) || messagesConfig.comparisons.length === 0) {
    throw new Error('messages.json must contain a non-empty "comparisons" array');
  }
  if (!messagesConfig.lowUsageMessages || !Array.isArray(messagesConfig.lowUsageMessages) || messagesConfig.lowUsageMessages.length === 0) {
    throw new Error('messages.json must contain a non-empty "lowUsageMessages" array');
  }
  if (!messagesConfig.templates || typeof messagesConfig.templates !== 'object') {
    throw new Error('messages.json must contain a "templates" object');
  }
  if (!messagesConfig.templates.savingsComparison || !messagesConfig.templates.buffetMode || !messagesConfig.templates.lowUsage) {
    throw new Error('messages.json templates must contain "savingsComparison", "buffetMode", and "lowUsage" fields');
  }
  if (!messagesConfig.thresholds || typeof messagesConfig.thresholds !== 'object') {
    throw new Error('messages.json must contain a "thresholds" object');
  }
  if (typeof messagesConfig.thresholds.savingsComparisonMin !== 'number' || typeof messagesConfig.thresholds.buffetModeMin !== 'number') {
    throw new Error('messages.json thresholds must contain numeric "savingsComparisonMin" and "buffetModeMin" fields');
  }
} catch (error) {
  console.error('❌ Failed to load or validate messages.json:', error.message);
  process.exit(1);
}

function getSavingsComparison(savings) {
  const comparisons = messagesConfig.comparisons;

  for (const comparison of comparisons) {
    if (savings <= comparison.usd) {
      return comparison.item;
    }
  }
  
  // Use highUsageDefault from messages.json
  return messagesConfig.templates.highUsageDefault || "もはやスタートアップのサーバー代レベル";
}

// Validate workspace configuration
if (slackWorkspaces.length === 0) {
  console.error('❌ No Slack workspaces configured');
  process.exit(1);
}

for (const workspace of slackWorkspaces) {
  if (!workspace.name || !workspace.token) {
    console.error('❌ Each workspace must have "name" and "token" properties');
    process.exit(1);
  }
}

async function getCCUsage() {
  return new Promise((resolve, reject) => {
    exec('npx ccusage@latest monthly --json', (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing ccusage:', error);
        reject(error);
        return;
      }
      
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        reject(parseError);
      }
    });
  });
}

function getLatestMonthCost(data) {
  if (!data.monthly || data.monthly.length === 0) {
    throw new Error('No monthly data available');
  }
  
  // Get the latest month (should be the first item if sorted by date)
  const latestMonth = data.monthly[0];
  return {
    totalCost: latestMonth.totalCost,
    month: latestMonth.month
  };
}

function getLowUsageMessage(totalCost, savings) {
  const messages = messagesConfig.lowUsageMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

function getClaudeEmoji(totalCost) {
  // Select emoji based on totalCost thresholds
  if (totalCost < 50) return ':claude-0:';
  if (totalCost < 100) return ':claude-50:';
  if (totalCost < 150) return ':claude-100:';
  if (totalCost < 200) return ':claude-150:';
  if (totalCost < 250) return ':claude-200:';
  if (totalCost < 300) return ':claude-250:';
  if (totalCost < 350) return ':claude-300:';
  if (totalCost < 400) return ':claude-350:';
  if (totalCost < 450) return ':claude-400:';
  if (totalCost < 500) return ':claude-450:';
  if (totalCost < 1000) return ':claude-500:';
  return ':claude-rainbow:'; // $1000以上
}

function replaceTemplate(template, replacements) {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

async function updateSlackProfile(workspace, totalCost, month) {
  const savings = totalCost - CLAUDE_MAX_COST;
  
  // Get thresholds from config
  const thresholds = messagesConfig.thresholds;
  
  // Get templates from config
  const templates = messagesConfig.templates;
  
  let title;
  if (savings > thresholds.savingsComparisonMin) {
    // 節約額が閾値超過の時は比較表示
    title = replaceTemplate(templates.savingsComparison, {
      item: getSavingsComparison(savings),
      totalCost: `$${totalCost.toFixed(2)}`,
      savings: `$${savings.toFixed(2)}`
    });
  } else if (savings > thresholds.buffetModeMin) {
    // 節約額が閾値以下の時は食べ放題中
    title = replaceTemplate(templates.buffetMode, {
      totalCost: `$${totalCost.toFixed(2)}`
    });
  } else {
    // $200未満の時はランダムメッセージ
    title = replaceTemplate(templates.lowUsage, {
      message: getLowUsageMessage(totalCost, savings),
      totalCost: `$${totalCost.toFixed(2)}`
    });
  }
  
  try {
    const response = await axios.post('https://slack.com/api/users.profile.set', {
      profile: {
        status_text: title,
        status_emoji: getClaudeEmoji(totalCost)
      }
    }, {
      headers: {
        'Authorization': `Bearer ${workspace.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      console.log(`✅ [${workspace.name}] Slack profile updated: ${title}`);
    } else {
      console.error(`❌ [${workspace.name}] Failed to update Slack profile:`, response.data.error);
    }
  } catch (error) {
    console.error(`❌ [${workspace.name}] Error updating Slack profile:`, error.message);
  }
}

async function updateAllSlackProfiles(totalCost, month) {
  const updatePromises = slackWorkspaces.map(workspace => 
    updateSlackProfile(workspace, totalCost, month)
  );
  
  await Promise.all(updatePromises);
}

async function updateCostInfo() {
  try {
    console.log('🔄 Fetching Claude usage data...');
    const data = await getCCUsage();
    const { totalCost, month } = getLatestMonthCost(data);
    
    console.log(`📊 Latest month (${month}): $${totalCost.toFixed(2)}`);
    
    await updateAllSlackProfiles(totalCost, month);
  } catch (error) {
    console.error('❌ Error updating cost info:', error.message);
  }
}

// Run immediately on startup
console.log('🚀 Starting ccusage-slack application...');
updateCostInfo();

// Schedule to run every minute
cron.schedule('* * * * *', () => {
  console.log(`⏰ Running scheduled update at ${new Date().toLocaleString()}`);
  updateCostInfo();
});

console.log('⏳ Scheduled to run every minute. Press Ctrl+C to stop.');