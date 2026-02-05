# Trident v3 - Advanced Pokétwo Autocatcher

<p align="center">
  <a href="https://discord.gg/CF8jDHhyxa"><img width="250px" src="https://i.ibb.co/sdbS49vL/Gemini-Generated-Image-ih1cfih1cfih1cfi.png" alt="Trident Logo"></a>
  <h1 align="center">Trident v3</h1>
</p>

<p align="center">
  <strong>The most sophisticated, multi-account Pokétwo automation suite powered by Node.js.</strong>
</p>

<p align="center">
  <a href="https://discord.gg/CF8jDHhyxa"><img src="https://img.shields.io/discord/1133853334944632832?label=Support%20Server&logo=discord&logoColor=white&style=for-the-badge&color=7289da" alt="Discord"></a>
  <a href="https://www.nodejs.org/"><img src="https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white" alt="made-with-nodejs"></a>
</p>

---

<div align="center">
<table style="border: 2px solid #FFD700; border-radius: 10px; padding: 20px; background-color: #1a1a1a;">
  <tr>
    <td align="center">
      <h2>🚀 CHEAPEST CAPTCHA SOLVING IN MARKET 🚀</h2>
      <p><i>Trident Integrated Captcha Solutions - Instant & Reliable</i></p>
      <hr style="border: 1px solid #FFD700;">
      <table width="100%">
        <tr>
          <td align="center"><b>🤖 Hoopa Solver</b></td>
          <td align="center"><b>⚡ Shuupiro Solver</b></td>
        </tr>
        <tr>
          <td align="center">100 Solves = <b>3 INR / $0.035</b></td>
          <td align="center">100 Solves = <b>5 INR / $0.054</b></td>
        </tr>
      </table>
      <p><b>🔥 BULK DISCOUNTS AVAILABLE FOR LARGE PURCHASES 🔥</b></p>
      <a href="https://discord.com/invite/CF8jDHhyxa">
        <img src="https://img.shields.io/badge/JOIN_DISCORD_TO_BUY-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Buy Now">
      </a>
    </td>
  </tr>
</table>
</div>

---

# 🎯 Trident V.3 - Advanced Pokemon AutoCatcher

> **Advanced multi-account Pokemon automation system with built-in captcha solving and real-time statistics.**

## ✨ Features

- 🤖 **Multi-Account Support** - Run dozens of selfbot accounts simultaneously
- 🎣 **Instant Catch** - High-speed Pokemon identification and catching
- 🧠 **AI Identification** - Smart Pokemon recognition using API integration
- 🔐 **Dual Captcha Solver** - Integrated Hoopa and Shuupiro captcha solving
- 📊 **Real-time Statistics** - Comprehensive tracking and analytics
- 🌐 **Web Panel** - Beautiful web interface for monitoring and control
- 💰 **Market Operations** - Automated marketplace interactions
- 🔍 **Token Management** - Built-in token checker and validator

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Discord bot token(s)
- Captcha solver API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   ```bash
   cp config.example.js config.js
   # Edit config.js with your settings
   ```

4. **Add your tokens**
   ```bash
   # Create data/tokens file and add your Discord tokens (one per line)
   echo "YOUR_DISCORD_TOKEN_1" > data/tokens
   echo "YOUR_DISCORD_TOKEN_2" >> data/tokens
   ```

5. **Start the bot**
   ```bash
   node index.js
   ```

6. **Access the web panel**
   - Open http://localhost:5000 in your browser
   - Monitor stats, logs, and control features

## 📋 Commands

### System Commands
- `$ping` - Check bot response time
- `$help` - Display command guide
- `$reload` - Restart all autocatcher instances
- `$stats` - View detailed statistics

### Pokemon Management
- `$pokemon` - Browse caught Pokemon by categories
- `$ai-catch <id/on/off>` - Toggle AI identification
- `$catcher <id/start/stop>` - Control autocatcher

### Captcha & Solver
- `$solver <userid> <token>` - Test captcha solver
- `$balance` - Check API key balance
- `$captcha <id/on/off>` - Manage captcha solver

### Market Operations
- `$mpanel` - Open market panel
- `$transfer` - Transfer Pokecoins
- `$m-start <token> <channel>` - Start market client

## 🔧 Configuration

### config.js
```javascript
module.exports = {
  botToken: "YOUR_BOT_TOKEN",
  prefix: "$",
  owners: ["YOUR_DISCORD_ID"],
  captchaApiKey: "YOUR_API_KEY",
  // ... other settings
};
```

### Environment Variables
- `PORT` - Web panel port (default: 5000)
- `SERVER_PORT` - Alternative port setting

## 🌐 Web Panel Features

- **Real-time Statistics** - Live monitoring of catches and coins
- **Control Panel** - Start/stop features remotely
- **Pokemon Logs** - View caught Pokemon with filtering
- **Market Operations** - Interactive marketplace tools
- **Account Management** - Monitor multiple accounts

## 🛡️ Security Notes

- Never share your `config.js` file
- Keep your Discord tokens private
- Use the provided `.gitignore` to avoid committing sensitive data
- Regularly rotate your API keys

## 📊 API Endpoints

- `GET /health` - Health check
- `GET /api/stats` - Statistics data
- `GET /api/logs/pokemon` - Pokemon logs
- `POST /api/test-solver` - Test captcha solver

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is for educational purposes only. Use responsibly and in accordance with Discord's Terms of Service.

## 👨‍💻 Developer

**Made with ❤️ by shuu0001**

---

⭐ **Star this repository if you found it helpful!**
