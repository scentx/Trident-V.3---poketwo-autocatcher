const { Client } = require("discord.js-selfbot-v13");

let client = null;
let isRunning = false;
let channelId = null;
const poketwo = "716390085896962058";
const p2ass = "854233015475109888";
const p2Filter = (p2) => p2.author.id === poketwo;

async function startt(token, channel, reply) {
  if (isRunning) {
    await reply("***Client is already running.***");
    return;
  }

  client = new Client();
  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    isRunning = true;
  });

  try {
    channelId = channel;
    await client.login(token);
    await reply(`✅ Started. \n\`\`\`Logged in as ${client.user.tag}\`\`\``);
  } catch (error) {
    await reply(`**Failed to login: ${error.message}**`);
  }
  client.on(`messageCreate`, async (message) => {
    if (
      message.content.includes(`Are you sure`) &&
      message.author.id == poketwo
    ) {
      await message.clickButton();
    }
  });
}

async function stopp(reply) {
  if (!isRunning) {
    await reply("*Client is not running.*");
    return;
  }

  try {
    await client.destroy();
    isRunning = false;
    await reply("***✅ Client stopped.***");
  } catch (error) {
    await reply(`Failed to stop client: ${error.message}`);
  }
}

async function market(bal, reply) {
  if (!isRunning || !channelId) {
    await reply("***Client is not running***");
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isText()) {
      await channel.send(`<@${poketwo}> m a 0 ${bal}`);
      const msgs = await channel.awaitMessages({
        filter: p2Filter,
        time: 4000,
        max: 10,
      });

      let foundId = null;
      msgs.forEach((msg) => {
        if (msg.content.includes("Listed your")) {
          const messageContent = msg.content;
          const id = messageContent.split("#")[1].split(").")[0];
          foundId = id;
        }
      });

      if (foundId) {
        await reply(foundId);
      } else {
        await reply("No relevant message found.");
      }
    } else {
      await reply("Channel not found or is not a text channel.");
    }
  } catch (error) {
    await reply(`Failed to send message: ${error.message}`);
  }
}

async function checkStatus() {
  const yes = isRunning;
  return yes;
}

module.exports = {
  startt,
  stopp,
  market,
  checkStatus,
};
