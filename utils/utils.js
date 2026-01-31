const { WebhookClient } = require("discord.js");
const config = require("../config");
const checkRarity = require("pokehint/functions/checkRarity");
require("colors");

function format(content) {
  let tokens = [];
  content.forEach((e) => {
    let x = e
      .split(";")
      .map((T) => {
        if (T) T.trim();
        return T;
      })
      .filter((x) => x);
    tokens.push(x[0]);
  });
  return tokens;
}

function log(message) {
  const timestamp = new Date().toISOString().slice(11, -5).cyan;
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
}

function getRate(initialDate, totalItems) {
  const currentDate = new Date();
  const timeElapsedInSeconds = (currentDate.getTime() - initialDate.getTime()) / 1000;
  const rate = totalItems / timeElapsedInSeconds;
  return rate.toFixed(2);
}

function formatPokemon(content) {
  let str = content;
  if (!content.startsWith("Congratulations")) return;
  let mainStr = str.split("!")[1].trim().split(" ");
  let main = str.split("!")[1].trim();
  let levelIndex = main.split(" ").findIndex((x) => x == "Level") + 2;
  let nameStr = mainStr.slice(levelIndex).join(" ").trim();
  let iv = parseFloat(nameStr.substring(nameStr.indexOf(`(`) + 1, nameStr.length - 2));
  nameStr = nameStr.substring(0, nameStr.indexOf(`(`));
  let level = parseInt(mainStr[4]),
    name = nameStr.substring(0, nameStr.indexOf("<"));
  let gender = nameStr.includes("female")
    ? `female`
    : nameStr.includes("male")
    ? `male`
    : `none`;
  return {
    name: name.trim(),
    level: level,
    gender: gender,
    iv: iv,
    shiny: str.includes("✨") || str.includes(":sparkles:"),
  };
}

const colors = {
  Legendary: "Red",
  Mythical: "Red",
  "Ultra Beast": "Red",
  Regional: "Red",
  Event: "Green",
  Regular: "DarkButNotBlack",
  "Rare IV": "DarkButNotBlack",
  Shiny: "Gold",
};

function logHook(embeds) {
  if (embeds.length <= 0) return;
  let hook = new WebhookClient({
    url: config.logHook,
  });
  hook.send({
    username: `Hoopa Logger`,
    avatarURL: `https://i.imgur.com/85PNo2N.png`,
    embeds: embeds,
  });
}

function chunk(array, size) {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}

async function getGuilds(bot) {
  let def;
  let guildsWithMembers = [];
  let both = false;
  for (let guild of bot.guilds.cache.values()) {
    let p2, p2ass;
    try {
      p2ass = await guild.members.fetch("854233015475109888");
    } catch (error) {}
    try {
      p2 = await guild.members.fetch("716390085896962058");
    } catch (error) {}
    guild.hasP2 = !!p2;
    guild.hasAssistant = !!p2ass;
    guildsWithMembers.push(guild);
    if (p2 && p2ass && !def && !both) {
      def = guild;
      both = true;
    }
    if ((p2 || p2ass) && !def && !both) def = guild;
  }
  if (!def) def = guildsWithMembers[0];
  return [guildsWithMembers, def];
}

function commatize(number) {
  let numStr = number.toString();
  let formattedNumber = "";
  for (let i = numStr.length - 1, count = 0; i >= 0; i--) {
    formattedNumber = numStr[i] + formattedNumber;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formattedNumber = "," + formattedNumber;
    }
  }
  return formattedNumber;
}

function errorHook(embeds) {
  if (embeds.length <= 0) return;
  let errorWebhook = new WebhookClient({
    url: config.webHook,
  });
  errorWebhook.send({
    username: `Hoopa Errors`,
    avatarURL: `https://i.imgur.com/85PNo2N.png`,
    embeds: embeds,
  }).catch(err => {
    console.log("Error webhook failed:", err.message);
  });
}

module.exports = {
  format,
  log,
  formatPokemon,
  logHook,
  colors,
  chunk,
  getGuilds,
  commatize,
  getRate,
  errorHook,
};