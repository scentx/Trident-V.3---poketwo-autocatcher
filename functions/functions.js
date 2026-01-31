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

async function stop() {
  for (const ac of autocatchers) {
    await ac.client.destroy();
  }
  autocatchers.length = 0;
  tokens.length = 0;
}

async function start() {
  const tokensPath = path.join(__dirname, "..", "data", "tokens");

  if (!fs.existsSync(tokensPath)) {
    console.log("Tokens file does not exist.".red);
    return null;
  }

  const data = fs.readFileSync(tokensPath, "utf-8");
  const tokenz = data.split("\n").map(token => token.trim()).filter(token => token.length > 0);

  if (tokenz.length === 0) {
    console.log("No tokens found in tokens.txt.".yellow);
    return null;
  }

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
  const tokensPath = path.join(__dirname, "..", "data", "tokens");
  const existingAutocatcher = autocatchers.find((ac) => ac.token === token);
  if (existingAutocatcher) {
    callback(`- Autocatcher already exists!`.red, false);
    return;
  }
  const ac = new AutoCatcher(token);
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
        
        try {
          let currentTokens = [];
          if (fs.existsSync(tokensPath)) {
            currentTokens = fs.readFileSync(tokensPath, "utf-8").split("\n").map(t => t.trim()).filter(t => t.length > 0);
          }
          if (!currentTokens.includes(token)) {
            currentTokens.push(token);
            fs.writeFileSync(tokensPath, currentTokens.join("\n"), "utf-8");
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
            token.substring(0, token.indexOf(".")) || `_token_`
          } | Invalid Token?`.red,
          false
        );
      }
    }, 5000);
  } catch (error) {
    callback(`- Error occurred: ${error.message}`.red, false);
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
  statMsg,
  autocatchers,
  tokens,
};