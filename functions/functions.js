const fs = require("fs");
const path = require("path");
const { AutoCatcher } = require("../autocatcher/index");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { commatize, chunk, errorHook } = require("../utils/utils");

let autocatchers = [];
let tokens = [];

const TOKENS_TXT_PATH = path.join(__dirname, "..", "data", "tokens.txt");
const LEGACY_TOKENS_PATH = path.join(__dirname, "..", "data", "tokens");

function readTokensFromDisk() {
  let raw = "";

  if (fs.existsSync(TOKENS_TXT_PATH)) {
    raw = fs.readFileSync(TOKENS_TXT_PATH, "utf-8");
  } else if (fs.existsSync(LEGACY_TOKENS_PATH)) {
    raw = fs.readFileSync(LEGACY_TOKENS_PATH, "utf-8");
  } else {
    return [];
  }

  return raw
    .split(/\r?\n/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function writeTokensToDisk(tokenList) {
  const normalized = Array.from(new Set(tokenList.map((t) => t.trim()).filter(Boolean)));
  const content = normalized.join("\n");

  // Keep both files in sync so older flows using data/tokens keep working.
  fs.writeFileSync(TOKENS_TXT_PATH, content, "utf-8");
  fs.writeFileSync(LEGACY_TOKENS_PATH, content, "utf-8");
}

async function stop() {
  for (const ac of autocatchers) {
    await ac.client.destroy();
  }
  autocatchers.length = 0;
  tokens.length = 0;
}

async function start() {
  if (!fs.existsSync(TOKENS_TXT_PATH) && !fs.existsSync(LEGACY_TOKENS_PATH)) {
    console.log("Tokens file does not exist.".red);
    return null;
  }

  const tokenz = readTokensFromDisk();

  if (tokenz.length === 0) {
    console.log("No tokens found in tokens.txt.".yellow);
    return null;
  }

  writeTokensToDisk(tokenz);

  console.log(`Loading ${tokenz.length} tokens...`.cyan);

  const logs = await Promise.all(
    tokenz.map(async (token) => {
      const ac = new AutoCatcher(token);

      try {
        await ac.login();
        await ac.catcher();
        await new Promise((resolve, reject) => {
          ac.start((res) => {
            if (res.includes("Logged in")) {
              autocatchers.push(ac);
              tokens.push(token);
              resolve(res);
            } else {
              reject(res);
            }
          });
        });
        return `Logged in successfully with token ending in ${token.slice(-5)}`;
      } catch (error) {
        return `Failed to login with token ending in ${token.slice(-5)}`;
      }
    })
  );

  return logs;
}

async function addToken(token, callback) {
  const normalizedToken = (token || "").trim();
  if (!normalizedToken) {
    callback(`- Token cannot be empty`.red, false);
    return;
  }

  const existingAutocatcher = autocatchers.find((ac) => ac.token === normalizedToken);
  if (existingAutocatcher) {
    callback(`- Autocatcher already exists!`.red, false);
    return;
  }
  const existingTokenOnDisk = readTokensFromDisk().includes(normalizedToken);
  if (existingTokenOnDisk) {
    callback(`- Token already exists in tokens file!`.red, false);
    return;
  }

  const ac = new AutoCatcher(normalizedToken);
  try {
    await ac.login();
    let loggedIn = false;

    ac.start((res) => {
      if (res.startsWith("-")) {
        callback(res, false);
      } else {
        callback(res, true);
        loggedIn = true;
        ac.catcher();
        autocatchers.push(ac);
        tokens.push(normalizedToken);
        
        try {
          const currentTokens = readTokensFromDisk();
          if (!currentTokens.includes(normalizedToken)) {
            currentTokens.push(normalizedToken);
            writeTokensToDisk(currentTokens);
          }
        } catch (err) {
          console.log(`Failed to sync tokens.txt: ${err.message}`.red);
        }
      }
    });
    setTimeout(() => {
      if (!loggedIn) {
        callback(
          `- Failed to login into ${
            normalizedToken.substring(0, normalizedToken.indexOf(".")) || `_token_`
          } | Invalid Token?`.red,
          false
        );
      }
    }, 5000);
  } catch (error) {
    callback(`- Error occurred: ${error.message}`.red, false);
  }
}

async function removeToken(token) {
  const normalizedToken = (token || "").trim();
  if (!normalizedToken) {
    return { success: false, message: "Token cannot be empty." };
  }

  const autocatcherIndex = autocatchers.findIndex((ac) => ac.token === normalizedToken);
  if (autocatcherIndex === -1) {
    return { success: false, message: "Token not found in the autocatcher list!" };
  }

  try {
    await autocatchers[autocatcherIndex].client.destroy();
    autocatchers.splice(autocatcherIndex, 1);

    const tokenIndex = tokens.findIndex((t) => t === normalizedToken);
    if (tokenIndex !== -1) {
      tokens.splice(tokenIndex, 1);
    }

    const fileTokens = readTokensFromDisk();
    const updatedTokens = fileTokens.filter((t) => t !== normalizedToken);
    writeTokensToDisk(updatedTokens);

    return { success: true, message: "Token successfully removed from autocatcher and token file!" };
  } catch (error) {
    return { success: false, message: `Error removing token: ${error.message}` };
  }
}

async function statMsg(message, page = 0) {
  const bot = message.client;

  if (autocatchers.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("Trident Catcher Stats")
      .setDescription("*No catcher connected yet.*")
      .setColor("DarkButNotBlack")
      .setFooter({
        text: "Pokemon Catcher System",
        iconURL: bot.user.displayAvatarURL(),
      });

    const row2 = new ActionRowBuilder().setComponents(
      new ButtonBuilder()
        .setCustomId("add_token_modal")
        .setLabel("Add Token")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("remove_token_modal")
        .setLabel("Remove Token")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("token_checker_modal")
        .setLabel("Token Checker")
        .setStyle(ButtonStyle.Secondary)
    );

    if (message.author) {
      await message.channel.send({ embeds: [embed], components: [row2] });
    } else {
      await message.update({ embeds: [embed], components: [row2] });
    }
    return;
  }

  let bal = 0,
    catches = 0;
  const fields = autocatchers
    .filter((x) => x.client.ws.status === 0)
    .map((x, i) => {
      const userName =
        x.client.user.globalName || x.client.user.displayName || "Unknown User";
      const userPing = `<t:${Math.floor(x.stats.lastCatch / 1000)}:R>${
        x.captcha
          ? `\n• ❕ [Captcha](https://verify.poketwo.net/captcha/${x.client.user.id})`
          : ``
      }`;

      bal += x.stats.coins + x.stats.tcoins;
      catches += x.stats.catches;

      return `**${i + 1}. ${userName}** • \`${commatize(
        x.stats.catches
      )}\` • \`${commatize(x.stats.coins + x.stats.tcoins)}\` • ${userPing}`;
    });

  const itemsPerPage = 10;
  const chunks = chunk(fields, itemsPerPage);
  const totalPages = chunks.length;

  const activeConnections = autocatchers.filter((x) => x.client.ws.status === 0).length;
  const embed = new EmbedBuilder()
    .setTitle("📊 Catcher Statistics")
    .setColor("#00FF7F")
    .setDescription(
      `\`\`\`` +
        `🤖 Total Accounts: ${commatize(autocatchers.length)}\n` +
        `🟢 Active Connections: ${commatize(activeConnections)}\n` +
        `🎣 Total Catches: ${commatize(catches)}\n` +
        `💰 Total PokéCoins: ${commatize(bal)}` +
        `\`\`\`\n` +
        `**Account Details:**\n` +
        `${totalPages > 0 ? chunks[page].join("\n") : "*No active accounts*"}`
    )
    .setFooter({
      text: `Page ${page + 1} of ${totalPages || 1} • Last updated`,
    })
    .setTimestamp();

  const row1 = new ActionRowBuilder().setComponents(
    new ButtonBuilder()
      .setCustomId(
        `statPage-L-${page}-${
          message.author ? message.author.id : message.user.id
        }`
      )
      .setLabel("◀ Previous")
      .setDisabled(page === 0)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("refresh_stats")
      .setLabel("🔄 Refresh")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(
        `statPage-R-${page}-${
          message.author ? message.author.id : message.user.id
        }`
      )
      .setLabel("Next ▶")
      .setDisabled(page >= totalPages - 1)
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().setComponents(
    new ButtonBuilder()
      .setCustomId("add_token_modal")
      .setLabel("Add Token")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("remove_token_modal")
      .setLabel("Remove Token")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("token_checker_modal")
      .setLabel("Token Checker")
      .setStyle(ButtonStyle.Secondary)
  );

  if (message.author) {
    await message.channel.send({ embeds: [embed], components: [row1, row2] });
  } else {
    await message.update({ embeds: [embed], components: [row1, row2] });
  }
}

let restartBarrier = false;
let crashCounter = 0;

setTimeout(() => {
  restartBarrier = true;
  console.log("🛡️ Error handling system activated".green);
}, 5000);

process.on("unhandledRejection", (error) => {
  if (restartBarrier) {
    console.log("❌ Unhandled Promise Rejection handled:", error.message);
    return;
  }

  crashCounter++;
  console.log(`Unhandled Promise Rejection caught (${crashCounter}):`, error.message);

  const embed = new EmbedBuilder()
    .setTitle(`Unhandled Promise Rejection`)
    .setDescription(
      `\`\`\`js\n${error.message}\n\`\`\`\nNoticed at: <t:${Math.floor(
        Date.now() / 1000
      )}:R>`
    )
    .setColor(`Orange`);

  try {
    errorHook([embed]);
  } catch (e) {
    console.log("Failed to send error webhook:", e.message);
  }
});

process.on("uncaughtException", (error) => {
  if (restartBarrier) {
    console.log("❌ Uncaught Exception handled:", error.message);
    return;
  }

  crashCounter++;
  console.log(`Uncaught Exception caught (${crashCounter}):`, error.message);

  const embed = new EmbedBuilder()
    .setTitle(`Uncaught Exception`)
    .setDescription(
      `\`\`\`js\n${error.message}\n\`\`\`\nNoticed at: <t:${Math.floor(
        Date.now() / 1000
      )}:R>`
    )
    .setColor(`Orange`);

  try {
    errorHook([embed]);
  } catch (e) {
    console.log("Failed to send error webhook:", e.message);
  }
});

module.exports = {
  stop,
  start,
  addToken,
  removeToken,
  statMsg,
  autocatchers,
  tokens,
};