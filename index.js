require('dotenv').config();
const { exec } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');

const CLAUDE_MAX_COST = 200; // $200 Claude Max subscription
const SLACK_TOKEN = process.env.SLACK_TOKEN;

function getSavingsComparison(savings) {
  const comparisons = [
    { usd: 4, item: "GitHub Team 1ヶ月分" },
    { usd: 8.75, item: "Slack Pro 1ヶ月分" },
    { usd: 10, item: "GitHub Copilot Individual 1ヶ月分" },
    { usd: 14, item: "Linear Team 1ヶ月分" },
    { usd: 16, item: "Figma Personal 1ヶ月分" },
    { usd: 20, item: "ChatGPT Plus 1ヶ月分" },
    { usd: 20, item: "Vercel Pro 1ヶ月分" },
    { usd: 40, item: "技術書1冊分" },
    { usd: 63.62, item: "JetBrains全製品 1ヶ月分" },
    { usd: 69.99, item: "Adobe Creative Cloud 1ヶ月分" },
    { usd: 75, item: "Samsung 980 PRO 1TB" },
    { usd: 90, item: "USB-C ハブ Anker 高性能版" },
    { usd: 99, item: "Magic Mouse" },
    { usd: 130, item: "Samsung 980 PRO 2TB" },
    { usd: 149, item: "Magic Trackpad" },
    { usd: 199, item: "Magic Keyboard テンキー付き" },
    { usd: 248, item: "Magic Mouse + Magic Trackpad" },
    { usd: 242, item: "Realforce R3 45g" },
    { usd: 250, item: "CalDigit TS3 Plus" },
    { usd: 270, item: "Dell UltraSharp 24inch" },
    { usd: 299, item: "NVIDIA RTX 4060" },
    { usd: 320, item: "HHKB Professional HYBRID" },
    { usd: 349, item: "iPad Pro 11inch 256GB" },
    { usd: 400, item: "CalDigit TS4 Thunderbolt 4" },
    { usd: 450, item: "CalDigit USB-C SOHO ドック" },
    { usd: 579, item: "NVIDIA RTX 4070" },
    { usd: 599, item: "iPad Pro 12.9inch 512GB" },
    { usd: 650, item: "Samsung 980 PRO 4TB" },
    { usd: 659.88, item: "Adobe Creative Cloud 年間分" },
    { usd: 689, item: "NVIDIA RTX 4070 Ti" },
    { usd: 750, item: "Herman Miller Sayl チェア" },
    { usd: 763.42, item: "JetBrains全製品 年間分" },
    { usd: 850, item: "LG UltraFine 5K 27inch" },
    { usd: 950, item: "Sony FE 24-70mm F4" },
    { usd: 999, item: "MacBook Air M3 8GB" },
    { usd: 999, item: "M2 Mac mini 16GB" },
    { usd: 1300, item: "Herman Miller Aeron チェア" },
    { usd: 1499, item: "NVIDIA RTX 4080" },
    { usd: 1599, item: "MacBook Air M3 16GB" },
    { usd: 1599, item: "Apple Studio Display" },
    { usd: 1599, item: "MacBook Pro 14inch M3" },
    { usd: 1999, item: "Mac Studio M2 Max" },
    { usd: 2000, item: "Sony α7 IV ボディ" },
    { usd: 2199, item: "Sony α7C II ボディ" },
    { usd: 2298, item: "Sony FE 24-70mm F2.8 GM II" },
    { usd: 2495, item: "Blackmagic Pocket Cinema 6K Pro" },
    { usd: 2800, item: "MacBook Pro 14inch M3 Pro" },
    { usd: 2829, item: "NVIDIA RTX 4090" },
    { usd: 3000, item: "iMac 24inch M3 最上位" },
    { usd: 3300, item: "MacBook Pro 16inch M3 Pro" },
    { usd: 4999, item: "Pro Display XDR" },
    { usd: 5000, item: "MacBook Pro 16inch M3 Max" },
    { usd: 6500, item: "Mac Studio M2 Ultra" },
    { usd: 6999, item: "Mac Pro M2 Ultra 基本構成" }
  ];

  for (const comparison of comparisons) {
    if (savings <= comparison.usd) {
      return comparison.item;
    }
  }
  return "もはやスタートアップのサーバー代レベル";
}

if (!SLACK_TOKEN) {
  console.error('SLACK_TOKEN environment variable is required');
  process.exit(1);
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
  const messages = [
    "今月はまだ食べ放題に行くべきではない",
    "Claude Max食べ放題まだ余裕あり",
    "もっとClaudeに頼んでも大丈夫",
    "Claude Max使い倒し不足",
    "定額の恩恵を受けきれていない",
    "まだまだClaudeと遊べる",
    "Claude Max のポテンシャル未開拓"
  ];
  
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

async function updateSlackProfile(totalCost, month) {
  const savings = totalCost - CLAUDE_MAX_COST;
  
  let title;
  if (savings > 12) {
    // 節約額が$12超過の時は比較表示
    title = `${getSavingsComparison(savings)}程度の節約 (合計: $${totalCost.toFixed(2)}, 節約: $${savings.toFixed(2)})`;
  } else if (savings > 0) {
    // 節約額が$12以下の時は食べ放題中
    title = `Claude Max食べ放題中 ($${totalCost.toFixed(2)})`;
  } else {
    // $200未満の時はランダムメッセージ
    title = `${getLowUsageMessage(totalCost, savings)} ($${totalCost.toFixed(2)})`;
  }
  
  try {
    const response = await axios.post('https://slack.com/api/users.profile.set', {
      profile: {
        status_text: title,
        status_emoji: getClaudeEmoji(totalCost)
      }
    }, {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      console.log(`✅ Slack profile updated: ${title}`);
    } else {
      console.error('❌ Failed to update Slack profile:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error updating Slack profile:', error.message);
  }
}

async function updateCostInfo() {
  try {
    console.log('🔄 Fetching Claude usage data...');
    const data = await getCCUsage();
    const { totalCost, month } = getLatestMonthCost(data);
    
    console.log(`📊 Latest month (${month}): $${totalCost.toFixed(2)}`);
    
    await updateSlackProfile(totalCost, month);
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