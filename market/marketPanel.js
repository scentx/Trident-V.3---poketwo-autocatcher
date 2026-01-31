
const { Client } = require("discord.js-selfbot-v13");
const {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const poketwo = "716390085896962058";

async function showMarketPanel(message, autocatchers) {
  if (autocatchers.length === 0) {
    return message.reply("❌ No autocatchers are available for market operations!");
  }

  const accountOptions = autocatchers.map((ac, index) => {
    const userName = ac.client.user.globalName || ac.client.user.displayName || `User ${index + 1}`;
    const status = ac.client.ws && ac.client.ws.status === 0 ? "🟢" : "🔴";

    return new StringSelectMenuOptionBuilder()
      .setLabel(`${userName} ${status}`)
      .setDescription(`ID: ${ac.client.user.id}`)
      .setValue(`account_${index}`);
  }).slice(0, 25);

  const accountSelect = new StringSelectMenuBuilder()
    .setCustomId(`market_account_select_${message.author.id}`)
    .setPlaceholder("Select an account for market operations...")
    .addOptions(accountOptions);

  const embed = new EmbedBuilder()
    .setTitle("💰 Market Panel")
    .setDescription("Select an account to start market operations:\n\n🟢 = Online | 🔴 = Offline")
    .setColor("#FFD700")
    .setFooter({ text: "Market AutoBuy System" });

  const row = new ActionRowBuilder().addComponents(accountSelect);
  await message.reply({ embeds: [embed], components: [row] });
}

async function handleAccountSelection(interaction, autocatchers) {
  const accountIndex = parseInt(interaction.values[0].split("_")[1]);
  const selectedAc = autocatchers[accountIndex];

  if (!selectedAc || !selectedAc.client.user) {
    return interaction.reply({ content: "❌ Selected account is no longer available!", ephemeral: true });
  }

  if (!selectedAc.client.ws || selectedAc.client.ws.status !== 0) {
    return interaction.reply({ content: "❌ Selected account is offline!", ephemeral: true });
  }

  const validGuilds = [];

  for (const guild of selectedAc.client.guilds.cache.values()) {
    if (guild.memberCount > 1 && guild.memberCount < 12) {
      try {
        const member = await guild.members.fetch(poketwo).catch(() => null);
        if (member) {
          validGuilds.push({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount
          });
        }
      } catch (error) {
        continue;
      }
    }
  }

  if (validGuilds.length === 0) {
    return interaction.reply({ content: "❌ No suitable servers found with PokéTwo bot!", ephemeral: true });
  }

  const serverOptions = validGuilds.slice(0, 25).map(guild => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(guild.name.length > 100 ? guild.name.substring(0, 97) + "..." : guild.name)
      .setDescription(`Members: ${guild.memberCount} | ID: ${guild.id}`)
      .setValue(`server_${accountIndex}_${guild.id}`);
  });

  const serverSelect = new StringSelectMenuBuilder()
    .setCustomId(`market_server_select_${interaction.user.id}`)
    .setPlaceholder("Select a server...")
    .addOptions(serverOptions);

  const embed = new EmbedBuilder()
    .setTitle("💰 Market Panel - Server Selection")
    .setDescription(`**Selected Account:** ${selectedAc.client.user.globalName || selectedAc.client.user.displayName}\n\nSelect a server where PokéTwo is present:`)
    .setColor("#FFD700")
    .setFooter({ text: `Found ${validGuilds.length} servers with PokéTwo` });

  const row = new ActionRowBuilder().addComponents(serverSelect);
  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleServerSelection(interaction) {
  const [, accountIndex, guildId] = interaction.values[0].split("_");

  const modal = new ModalBuilder()
    .setCustomId(`market_buy_modal_${accountIndex}_${guildId}_${interaction.user.id}`)
    .setTitle("Market Purchase");

  const marketIdInput = new TextInputBuilder()
    .setCustomId("marketId")
    .setLabel("Market Listing ID")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the market listing ID to purchase...")
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(marketIdInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleMarketPurchase(interaction, autocatchers) {
  const parts = interaction.customId.split("_");
  const accountIndex = parts[3];
  const guildId = parts[4];
  const userId = parts[5];

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "❌ You cannot use this modal!", ephemeral: true });
  }

  const marketId = interaction.fields.getTextInputValue("marketId");
  const selectedAc = autocatchers[parseInt(accountIndex)];
  const selectedGuild = selectedAc.client.guilds.cache.get(guildId);

  if (!selectedAc || !selectedGuild) {
    return interaction.reply({ content: "❌ Account or server is no longer available!", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    let channel = selectedGuild.channels.cache.find(
      (x) => x.name.startsWith('general')
    ) ||
    selectedGuild.channels.cache.find(
      (x) => x.name.startsWith('spam')
    ) ||
    selectedGuild.channels.cache.find((x) => x.type === 0) ||
    selectedGuild.channels.cache.first();

    if (!channel) {
      return interaction.editReply({ content: "❌ No suitable channel found in the selected server!" });
    }

    await interaction.editReply({ 
      content: `🔄 Attempting to purchase market listing #${marketId}...\n**Account:** ${selectedAc.client.user.globalName || selectedAc.client.user.displayName}\n**Server:** ${selectedGuild.name}\n**Channel:** ${channel.name}` 
    });

    await channel.send(`<@${poketwo}> m buy ${marketId}`);

    const collectorFilter = (m) => m.author.id === poketwo;
    const collector = channel.createMessageCollector({
      filter: collectorFilter,
      time: 20000,
    });

    collector.on("collect", async (m) => {
      if (m.content.includes("you want to buy")) {
        try {
          await m.clickButton();
          let price = m.content.split(' ').reverse()[1];
          await interaction.followUp({ 
            content: `✅ **Purchase Successful!**\nPurchased listing #${marketId} for ${price} coins!`, 
            ephemeral: true 
          });
          collector.stop();
        } catch (error) {
          console.error("Error clicking confirmation button:", error);
          await interaction.followUp({ 
            content: `⚠️ Purchase command sent but failed to auto-confirm. Please manually confirm in ${channel.name}`, 
            ephemeral: true 
          });
          collector.stop();
        }
      } else if (m.content.includes("can't purchase your own")) {
        await interaction.followUp({ 
          content: `❌ You can't purchase your own listing!`, 
          ephemeral: true 
        });
        collector.stop();
      } else if (m.content.includes("have enough Pokécoins")) {
        await interaction.followUp({ 
          content: `❌ Insufficient funds!`, 
          ephemeral: true 
        });
        collector.stop();
      } else if (m.content.includes("find that listing!")) {
        await interaction.followUp({ 
          content: `❌ Could not find that listing!`, 
          ephemeral: true 
        });
        collector.stop();
      }
    });

  } catch (error) {
    console.error("Error in market purchase:", error);
    await interaction.editReply({ content: `❌ Error during purchase: ${error.message}` });
  }
}

module.exports = {
  showMarketPanel,
  handleAccountSelection,
  handleServerSelection,
  handleMarketPurchase
};
