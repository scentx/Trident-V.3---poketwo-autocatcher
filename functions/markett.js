const { Client } = require("discord.js-selfbot-v13");
const { market } = require("../autocatcher/market");
const { setTimeout } = require("node:timers/promises");

const poketwo = "716390085896962058";
const p2Filter = (msg) => msg.author.id === poketwo;

async function transfer(tokens, res) {
  let total = 0;

  for (const token of tokens) {
    const client = new Client();

    try {
      await client.login(token);

      let msgguild = null;
      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(poketwo);
        if (member) {
          msgguild = guild;
          break;
        }
      }

      if (!msgguild) {
        console.log(
          `No guild found with the specified user ID for token ending in ${token.slice(
            -5
          )}.`
        );
        continue;
      }

      const channel = msgguild.channels.cache.find(
        (ch) => ch.name === "general"
      );
      if (!channel || !channel.isText()) {
        console.log(
          `Channel not found or is not a text channel for token ending in ${token.slice(
            -5
          )}.`
        );
        continue;
      }

      await channel.send(`<@${poketwo}> bal`);

      const p2filter = (msg) =>
        msg.embeds?.length > 0 && msg.author.id === poketwo;
      const messages = await channel.awaitMessages({
        filter: p2filter,
        time: 20000,
        max: 1,
      });

      const msg = messages.first();
      let bal = 0;
      if (msg && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        if (embed.title.includes("balance")) {
          const balField = embed.fields[0]?.value;
          if (balField) {
            bal = parseInt(balField.replace(/,/g, ""));
            if (isNaN(bal)) bal = 0;
            total += bal;
          }
        }
      }

      if (bal > 0) {
        const id = await new Promise((resolve, reject) => {
          market(bal, (response) => {
            if (response.startsWith("No relevant message found.")) {
              reject(response);
            } else {
              resolve(response);
            }
          });
        });
        if (id) {
          await channel.send(`<@${poketwo}> m b ${id}`);

          const confirmationMessages = await channel.awaitMessages({
            filter: p2Filter,
            time: 40000,
            max: 1,
          });

          const confirmationMsg = confirmationMessages.first();
          if (
            confirmationMsg &&
            confirmationMsg.content.includes("Are you sure")
          ) {
            await confirmationMsg.clickButton();
          }
        }
      }

      console.log("Moved to the next client.");
    } catch (error) {
      console.error(
        `Error with token ending in ${token.slice(-5)}:`,
        error.message
      );
    } finally {
      client.destroy();
    }
  }

  res(total);
}

module.exports = {
  transfer,
};
