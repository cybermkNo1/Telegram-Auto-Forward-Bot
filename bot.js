const { Telegraf } = require('telegraf');
require('dotenv').config();
const express = require('express');
const NodeCache = require('node-cache');

// Cache setup with 24-hour TTL
const cache = new NodeCache({ stdTTL: 86400 });

// Watermark configuration
const watermarkConfig = {
  text: "\n\n🔹📌 Powered by @Slayber007",
  enabled: true              
};

// Configuration validation
function validateConfig() {
  const requiredVars = ['BOT_TOKEN', 'SOURCE_CHANNEL_ID', 'DESTINATION_CHANNEL_ID', 'ADMIN_ID'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required env variables: ${missingVars.join(', ')}`);
  }

  return {
    BOT_TOKEN: process.env.BOT_TOKEN,
    SOURCE_CHANNEL_ID: String(process.env.SOURCE_CHANNEL_ID),
    DESTINATION_CHANNEL_ID: String(process.env.DESTINATION_CHANNEL_ID),
    ADMIN_ID: String(process.env.ADMIN_ID)
  };
}

// Progress tracking functions
function getProgress() {
  return cache.get('progress') || { 
    lastProcessedId: 0, 
    forwardedIds: [],
    settings: {
      autoForward: true,
      fileTypes: ['video', 'document', 'photo', 'audio'],
      silentForward: true
    }
  };
}

function saveProgress(data) {
  cache.set('progress', data);
}

// Watermark function
function addWatermark(text) {
  if (!watermarkConfig.enabled) return text;
  if (!text) return watermarkConfig.text.trim();
  return text.includes(watermarkConfig.text.trim()) ? text : text + watermarkConfig.text;
}

// Initialize
const config = validateConfig();
const bot = new Telegraf(config.BOT_TOKEN);
const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  const progress = getProgress();
  res.status(200).json({ 
    status: 'Bot is running',
    features: {
      autoForward: progress.settings.autoForward,
      silentForward: progress.settings.silentForward,
      manualForward: true,
      oldPostForward: true,
      fileTypeSupport: progress.settings.fileTypes,
      watermark: true
    }
  });
});

// Command: /start (for all users)
bot.start(async (ctx) => {
  try {
    const progress = getProgress();
    const settings = progress.settings || {};
    
    // Improved markdown escaping function
    const escapeMd = (text) => {
      if (!text) return '';
      return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    // Check if user is admin safely
    const isAdmin = ctx.from && String(ctx.from.id) === config.ADMIN_ID;
    
    // Build welcome message sections
    const botStatus = [
      '🤖 *Advanced Forward Bot*',
      '',
      '🔹 *Bot Status:*',
      `- Source: ${escapeMd(config.SOURCE_CHANNEL_ID || 'Not set')}`,
      `- Destination: ${escapeMd(config.DESTINATION_CHANNEL_ID || 'Not set')}`,
      `- Auto-forward: ${settings.autoForward ? '✅ ON' : '❌ OFF'}`,
      `- Silent mode: ${settings.silentForward ? '✅ ON' : '❌ OFF'}`,
      `- File types: ${escapeMd((settings.fileTypes || []).join(', '))}`,
      `- Watermark: ${watermarkConfig?.enabled ? '✅ ON' : '❌ OFF'}`,
      `- Last forwarded: ${escapeMd(progress.lastProcessedId || 'None')}`
    ].join('\n');

    const basicCommands = [
      '',
      '📌 *Available Commands:*',
      '/start - Show bot status',
      '/help - Show help instructions'
    ].join('\n');

    const adminCommands = isAdmin ? [
      '',
      '⚙️ *Admin Commands:*',
      '/forward - Manually forward last post',
      '/forwardold [count] - Forward old posts',
      '/autoforward [on/off] - Toggle auto-forward',
      '/silent [on/off] - Toggle silent mode',
      '/settypes [types] - Set file types',
      '/setwatermark [text] - Set watermark text',
      '/togglewatermark - Toggle watermark'
    ].join('\n') : '';

    const welcomeMessage = `${botStatus}${basicCommands}${adminCommands}`;

    // Create inline keyboard with error handling
    const channelKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '❖ ᴊᴏɪɴ ❖',
            url: 'https://t.me/Slayber_Bots'
          }],
          [{
            text: '❖ ʜᴇʟᴘ ❖',
            url: 'https://t.me/Slayber007'
          }]
        ]
      }
    };

    // Send message with error handling
    await ctx.replyWithMarkdown(welcomeMessage, channelKeyboard);
    console.log(`Start command executed for ${isAdmin ? 'admin' : 'user'}: ${ctx.from?.id || 'unknown'}`);
    
  } catch (error) {
    console.error('Start command error:', error.stack || error);
    try {
      await ctx.reply('⚠️ Could not send welcome message. Please try again later.');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
});

// Command: /help (enhanced version)
bot.command('help', async (ctx) => {
  try {
    const isAdmin = ctx.from && String(ctx.from.id) === config.ADMIN_ID;
    
    // Main help sections
    const helpSections = [
    '🆘 *Bot Usage Guide*',
    '',
    '📌 *Bot Features:*',
    '• Forward media files from one channel to another',
    '• Supports videos, images, documents, and audio files',
    '• Can add a watermark to forwarded content',
    '',
    '⚙️ *How to Use:*',
    '1. Add the bot to both the source and destination channels',
    '2. Make sure the bot has admin permissions',
    '3. Configure the settings as needed',
    '',
    '🔹 *Basic Commands:*',
    '/start - Check the bot status',
    '/help - Show this help message'
];

    // Add admin commands section if user is admin
    if (isAdmin) {
      helpSections.push(
        '',
        '🔐 *Admin Commands:*',
        '/forward - Manually forward the latest post',
        '/forwardold [number] - Forward old posts',
        '/autoforward [on/off] - Toggle auto-forwarding',
        '/silent [on/off] - Toggle silent mode',
        '/settypes [type] - Set the file types to forward',
        '/setwatermark [text] - Set watermark text',
        '/togglewatermark - Enable or disable watermark'
      );
    }

    helpSections.push(
  '',
  '❓ *Need More Help?*',
  'Goodboy [.](https://i.ibb.co/cKcYnwqP/x.jpg)',
  'Contact our support team [@Slayber007](https://t.me/Slayber007)',
  'Or visit our channel [@Slayber_Bots](https://t.me/Slayber_Bots)'
    );

    // Create help keyboard
    const helpKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '📢 Our Channel',
            url: 'https://t.me/Slayber_Bots'
          }],
          [{
            text: '🆘 Emergency Help',
            url: 'https://t.me/Slayber007'
          }]
        ]
      }
    };

    await ctx.replyWithMarkdown(
      helpSections.join('\n'),
      helpKeyboard
    );
    
    console.log(`Help command executed for ${isAdmin ? 'admin' : 'user'}: ${ctx.from?.id || 'unknown'}`);
    
  } catch (error) {
    console.error('Help command error:', error.stack || error);
    try {
      await ctx.reply('⚠️ There was a problem displaying the help information. Please try again later.');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
});

// Command: /setwatermark
bot.command('setwatermark', async (ctx) => {
  if (String(ctx.from.id) !== config.ADMIN_ID) {
    return ctx.reply('⚠️ Permission denied!').catch(console.error);
  }

  const newText = ctx.message.text.replace('/setwatermark', '').trim();
  
  if (!newText) {
    return ctx.reply(
      `Current watermark: ${watermarkConfig.text || 'None'}\n\n`
      + `Usage: /setwatermark [your text]\n`
      + `Example: /setwatermark \\n\\n📌 Powered by @Slayber007`
    ).catch(console.error);
  }

  watermarkConfig.text = newText;
  ctx.reply(`✅ Watermark updated to:\n${watermarkConfig.text}`).catch(console.error);
});

// Command: /togglewatermark
bot.command('togglewatermark', async (ctx) => {
  if (String(ctx.from.id) !== config.ADMIN_ID) {
    return ctx.reply('⚠️ Permission denied!').catch(console.error);
  }

  watermarkConfig.enabled = !watermarkConfig.enabled;
  ctx.reply(`✅ Watermark ${watermarkConfig.enabled ? 'ENABLED' : 'DISABLED'}`).catch(console.error);
});

// Command: /settypes
bot.command('settypes', async (ctx) => {
  if (String(ctx.from.id) !== config.ADMIN_ID) {
    return ctx.reply('⚠️ Permission denied!').catch(console.error);
  }

  const progress = getProgress();
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    return ctx.reply(
      `Current file types: ${progress.settings.fileTypes.join(', ')}\n\n`
      + `Usage: /settypes video photo document audio\n`
      + `Available types: video, photo, document, audio`
    ).catch(console.error);
  }

  const validTypes = ['video', 'photo', 'document', 'audio'];
  const invalidTypes = args.filter(type => !validTypes.includes(type));
  
  if (invalidTypes.length > 0) {
    return ctx.reply(
      `❌ Invalid file types: ${invalidTypes.join(', ')}\n`
      + `Valid types are: ${validTypes.join(', ')}`
    ).catch(console.error);
  }

  progress.settings.fileTypes = args;
  saveProgress(progress);
  ctx.reply(`✅ File types updated to: ${args.join(', ')}`).catch(console.error);
});

// Command: /silent
bot.command('silent', async (ctx) => {
  if (String(ctx.from.id) !== config.ADMIN_ID) {
    return ctx.reply('⚠️ Permission denied!').catch(console.error);
  }

  const progress = getProgress();
  const arg = ctx.message.text.split(' ')[1]?.toLowerCase();
  
  if (arg === 'on') {
    progress.settings.silentForward = true;
    saveProgress(progress);
    ctx.reply('✅ Silent forwarding enabled').catch(console.error);
  } else if (arg === 'off') {
    progress.settings.silentForward = false;
    saveProgress(progress);
    ctx.reply('❌ Silent forwarding disabled').catch(console.error);
  } else {
    ctx.reply(
      `Silent forwarding is currently ${progress.settings.silentForward ? '✅ ON' : '❌ OFF'}`
    ).catch(console.error);
  }
});

// Main forwardMessage function with watermark support
async function forwardMessage(sourceChatId, messageId, targetChatId, originalMessage) {
  const progress = getProgress();
  const options = { 
    disable_notification: progress.settings.silentForward
  };
  
  try {
    const message = await bot.telegram.copyMessage(
      targetChatId,
      sourceChatId,
      messageId,
      options
    );
    
    if (originalMessage.caption !== undefined) {
      await bot.telegram.editMessageCaption(
        targetChatId,
        message.message_id,
        undefined,
        addWatermark(originalMessage.caption || '')
      );
    }
    else if (originalMessage.text) {
      await bot.telegram.editMessageText(
        targetChatId,
        message.message_id,
        undefined,
        addWatermark(originalMessage.text),
        { parse_mode: originalMessage.parse_mode || 'HTML' }
      );
    }
    
    return message.message_id;
  } catch (error) {
    console.error('Forward error:', error);
    return false;
  }
}

// Command: /forward
bot.command('forward', async (ctx) => {
  if (String(ctx.from.id) !== config.ADMIN_ID) {
    return ctx.reply('⚠️ Permission denied!').catch(console.error);
  }

  const progress = getProgress();
  if (!progress.lastProcessedId) {
    return ctx.reply('❌ No messages available to forward').catch(console.error);
  }

  try {
    await ctx.replyWithChatAction('typing').catch(console.error);
    const message = await bot.telegram.getMessage(
      config.SOURCE_CHANNEL_ID,
      progress.lastProcessedId
    );
    
    const success = await forwardMessage(
      config.SOURCE_CHANNEL_ID,
      progress.lastProcessedId,
      config.DESTINATION_CHANNEL_ID,
      message
    );
    
    if (success) {
      ctx.replyWithMarkdown(
        `✅ *Forwarded with watermark!*\nMessage ID: \`${progress.lastProcessedId}\``
      ).catch(console.error);
    } else {
      ctx.reply('❌ Failed to forward message').catch(console.error);
    }
  } catch (error) {
    console.error('Error in /forward:', error);
    ctx.reply(`❌ Error: ${error.message}`).catch(console.error);
  }
});

// Function to forward old posts
async function forwardOldPosts(limit = 10) {
  const progress = getProgress();
  let forwardedCount = 0;
  let offset = 0;

  while (forwardedCount < limit) {
    try {
      const updates = await bot.telegram.getUpdates({
        offset,
        limit: Math.min(100, limit - forwardedCount),
        timeout: 30,
        allowed_updates: ['channel_post']
      });

      if (!updates.length) break;

      for (const update of updates) {
        if (update.channel_post && String(update.channel_post.chat.id) === config.SOURCE_CHANNEL_ID) {
          const message = update.channel_post;
          const shouldForward = progress.settings.fileTypes.some(type => message[type]);
          
          if (shouldForward && !progress.forwardedIds.includes(message.message_id)) {
            const success = await forwardMessage(
              config.SOURCE_CHANNEL_ID,
              message.message_id,
              config.DESTINATION_CHANNEL_ID,
              message
            );

            if (success) {
              progress.lastProcessedId = message.message_id;
              progress.forwardedIds.push(message.message_id);
              saveProgress(progress);
              forwardedCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        offset = update.update_id + 1;
      }
    } catch (error) {
      console.error('Error getting updates:', error);
      break;
    }
  }

  return forwardedCount;
}

// Command: /forwardold
bot.command('forwardold', async (ctx) => {
  if (String(ctx.from.id) !== config.ADMIN_ID) {
    return ctx.reply('⚠️ Permission denied!').catch(console.error);
  }

  const count = parseInt(ctx.message.text.split(' ')[1]) || 10;
  if (count > 100) {
    return ctx.reply('❌ Maximum 100 posts at a time').catch(console.error);
  }

  try {
    await ctx.replyWithChatAction('typing').catch(console.error);
    const forwarded = await forwardOldPosts(count);
    ctx.reply(`✅ Forwarded ${forwarded} old posts with watermark`).catch(console.error);
  } catch (error) {
    console.error('Error in /forwardold:', error);
    ctx.reply(`❌ Error: ${error.message}`).catch(console.error);
  }
});

// Auto-forward handler
bot.on(['channel_post', 'message'], async (ctx) => {
  const progress = getProgress();
  if (!progress.settings.autoForward || String(ctx.chat.id) !== config.SOURCE_CHANNEL_ID) {
    return;
  }

  const message = ctx.message || ctx.channelPost;
  const shouldForward = progress.settings.fileTypes.some(type => message[type]);
  
  if (shouldForward && !progress.forwardedIds.includes(message.message_id)) {
    try {
      const success = await forwardMessage(
        config.SOURCE_CHANNEL_ID,
        message.message_id,
        config.DESTINATION_CHANNEL_ID,
        message
      );

      if (success) {
        progress.lastProcessedId = message.message_id;
        progress.forwardedIds.push(message.message_id);
        saveProgress(progress);
        console.log(`Auto-forwarded with watermark: ${message.message_id}`);
      }
    } catch (error) {
      console.error('Auto-forward error:', error);
    }
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred, please try again later').catch(console.error);
});

// Webhook setup
if (process.env.VERCEL_URL) {
  const webhookUrl = `https://forward-bot-seven.vercel.app/webhook`;
  
  bot.telegram.setWebhook(webhookUrl)
    .then(() => console.log(`Webhook successfully set to: ${webhookUrl}`))
    .catch(err => console.error('Webhook setup error:', err));
}

// Webhook endpoint
app.get('/webhook', (req, res) => {
  res.status(200).json({
    status: 'active',
    bot: 'forward-bot',
    timestamp: new Date().toISOString()
  });
});

app.post('/webhook', (req, res) => {
  console.log('Incoming update:', JSON.stringify(req.body, null, 2));
  bot.handleUpdate(req.body, res);
});

// Handle all other GET requests
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    bot.launch()
      .then(() => console.log('Bot polling started'))
      .catch(err => console.error('Bot launch error:', err));
  });
    }
