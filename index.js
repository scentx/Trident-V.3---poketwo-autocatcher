const fs = require("fs");
const path = require("path");
require("colors");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageEmbed,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const { AutoCatcher } = require("./autocatcher/index");
const { startt, stopp, market, checkStatus } = require("./autocatcher/market");
const config = require("./config");
const { log } = require("./utils/utils");
const { statMsg, autocatchers, start, stop, addToken } = require("./functions/functions");
const { transfer } = require("./functions/markett");
const { showMarketPanel, handleAccountSelection, handleServerSelection, handleMarketPurchase } = require("./market/marketPanel");
const { solveCaptcha, checkApiKeyBalance, sendCaptchaMessage } = require("./utils/captchaSolver");
const { chunk } = require("./utils/utils");

const poketwo = "716390085896962058";
let owners = config.owners;
let prefix = config.prefix;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const captchaLogs = [];

bot.on("ready", () => {
  log(`Connected as ${bot.user.tag}`.cyan);
});

bot.on("interactionCreate", async (interaction) => {
  if (!owners.includes(interaction.user.id)) {
    if (interaction.isButton() || interaction.isModalSubmit()) {
      await interaction.reply({ content: "You are not authorised to use this!", ephemeral: true });
      return;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith("market_account_select")) {
      await handleAccountSelection(interaction, autocatchers);
    } else if (interaction.customId.startsWith("market_server_select")) {
      await handleServerSelection(interaction);
    }
  } else if (interaction.isButton()) {
    if (interaction.customId.startsWith("previous") || interaction.customId.startsWith("next")) {
      await handleTokenPageNavigation(interaction);
    } else if (interaction.customId.startsWith("statPage")) {
      await handlePageNavigation(interaction);
    } else if (interaction.customId === "add_token_modal") {
      await showAddTokenModal(interaction);
    } else if (interaction.customId === "remove_token_modal") {
      await showRemoveTokenModal(interaction);
    } else if (interaction.customId === "token_checker_modal") {
      await showTokenCheckerModal(interaction);
    } else if (interaction.customId.startsWith("pdata_nav_") || interaction.customId.startsWith("pdata_") || interaction.customId === "pdata_back") {
         
    } else if (interaction.customId === "refresh_stats") {
      await statMsg(interaction, 0);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "addTokenModal") {
      await handleAddTokenModal(interaction);
    } else if (interaction.customId === "removeTokenModal") {
      await handleRemoveTokenModal(interaction);
    } else if (interaction.customId === "tokenCheckerModal") {
      await handleTokenCheckerModal(interaction);
    } else if (interaction.customId.startsWith("market_buy_modal")) {
      await handleMarketPurchase(interaction, autocatchers);
    }
  }
});

const http = require("http");
const express = require("express");
const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/stats", (req, res) => {
  const active = autocatchers.filter((x) => x.client.ws.status === 0).length;
  let totalCatches = 0;
  let totalCoins = 0;
  const perAccountStats = autocatchers.map(ac => ({
    name: ac.client.user.username,
    catches: ac.stats.catches,
    coins: ac.stats.coins + ac.stats.tcoins
  }));
  
  autocatchers.forEach(ac => {
    totalCatches += ac.stats.catches;
    totalCoins += (ac.stats.coins + ac.stats.tcoins);
  });
  res.json({ success: true, active, catches: totalCatches, coins: totalCoins, perAccount: perAccountStats });
});

app.get("/api/logs/captcha", (req, res) => {
  res.json({ success: true, logs: captchaLogs });
});

app.get("/api/logs/pokemon", (req, res) => {
  let allCaught = [];
  autocatchers.forEach(ac => {
    ac.pokemonData.all.forEach(p => {
      allCaught.push({ ...p, user: ac.client.user.username });
    });
  });
  allCaught.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, logs: allCaught.slice(0, 100) });
});

app.get("/api/control/:feature/:state", async (req, res) => {
  const { feature, state } = req.params;
  return res.json({ success: true, message: `${feature.toUpperCase()} feature toggled ${state.toUpperCase()}` });
});

app.post("/api/test-solver", async (req, res) => {
  const { uid, token } = req.body;
  try {
    const result = await solveCaptcha(config.captchaApiKey, uid, token);
    captchaLogs.push({ timestamp: new Date(), user: uid, status: result.success ? "Solved" : "Failed", details: result.result || result.error });
    res.json({ success: true, message: result.success ? "Solver test successful!" : `Solver failed: ${result.error}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get("/api/command/:cmd", async (req, res) => {
  const { cmd } = req.params;
  try {
    if (cmd === "stats") {
      const active = autocatchers.filter((x) => x.client.ws.status === 0).length;
      return res.json({ success: true, message: `Active: ${active}` });
    } else if (cmd === "reload") {
      await stop();
      await start();
      return res.json({ success: true, message: `Reloaded tokens.` });
    } else if (cmd === "mpanel") {
      return res.json({ success: true, message: "Market panel functionality is integrated. Use the Quick Action field below for searching." });
    }
    res.json({ success: false, error: "Unknown command" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get("/api/market/accounts", (req, res) => {
  const accountData = autocatchers.map((ac, index) => ({
    id: index,
    name: ac.client.user.globalName || ac.client.user.displayName || ac.client.user.username,
    status: ac.client.ws && ac.client.ws.status === 0 ? "online" : "offline"
  }));
  res.json({ success: true, accounts: accountData });
});

app.get("/api/market/servers/:accountIndex", async (req, res) => {
  const accountIndex = parseInt(req.params.accountIndex);
  const ac = autocatchers[accountIndex];
  if (!ac || !ac.client.user) return res.json({ success: false, error: "Account not found" });

  const validGuilds = [];
  for (const guild of ac.client.guilds.cache.values()) {
    if (guild.memberCount > 1 && guild.memberCount < 100) {  
       validGuilds.push({ id: guild.id, name: guild.name, members: guild.memberCount });
    }
  }
  res.json({ success: true, servers: validGuilds });
});

app.post("/api/market/buy", async (req, res) => {
  const { accountIndex, guildId, marketId } = req.body;
  const ac = autocatchers[parseInt(accountIndex)];
  if (!ac) return res.json({ success: false, error: "Account not found" });
  
  const guild = ac.client.guilds.cache.get(guildId);
  if (!guild) return res.json({ success: false, error: "Server not found" });

  try {
    const channel = guild.channels.cache.find(c => c.type === 0 && (c.name.includes("general") || c.name.includes("spam") || c.name.includes("market"))) || guild.channels.cache.find(c => c.type === 0);
    if (!channel) return res.json({ success: false, error: "No suitable channel found" });

    await channel.send(`<@${poketwo}> m buy ${marketId}`);
    
     
    res.json({ success: true, message: `Buy command sent for listing #${marketId} in ${guild.name} (#${channel.name})` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  log(`Website Panel running on port ${PORT}`.green);
});

bot.login(config.botToken);

bot.on("messageCreate", async (message) => {
   
});

(async () => { await start(); })();
process.on("unhandledRejection", (reason, promise) => { console.error("Unhandled Rejection at:", promise, "reason:", reason); });
process.on("uncaughtException", (err) => { console.error("Uncaught Exception:", err); });